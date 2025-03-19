/**
 * Authentication Service Tests
 */

import { AuthService, AuthMethod, GitHubUser } from '../../../src/auth/services/auth-service.js';
import keytar from 'keytar';
import { Octokit } from 'octokit';

// Mock dependencies
jest.mock('keytar');
jest.mock('octokit');
jest.mock('open', () => jest.fn());
jest.mock('crypto', () => ({
  randomBytes: () => ({
    toString: jest.fn().mockReturnValue('mock-random-bytes'),
  }),
}));

// Mock fetch API
global.fetch = jest.fn();

describe('AuthService', () => {
  let authService: AuthService;
  const mockUser: GitHubUser = {
    login: 'testuser',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup keytar mock
    (keytar.getPassword as jest.Mock).mockResolvedValue(null);
    (keytar.setPassword as jest.Mock).mockResolvedValue(undefined);
    (keytar.deletePassword as jest.Mock).mockResolvedValue(true);
    
    // Setup Octokit mock
    const mockOctokit = {
      rest: {
        users: {
          getAuthenticated: jest.fn().mockResolvedValue({
            data: {
              login: mockUser.login,
              name: mockUser.name,
              avatar_url: mockUser.avatarUrl,
            },
          }),
        },
      },
    };
    (Octokit as jest.Mock).mockImplementation(() => mockOctokit);
    
    // Setup fetch mock
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/login/device/code')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            user_code: 'ABCD-1234',
            device_code: 'device_code_123',
            verification_uri: 'https://github.com/login/device',
          }),
        });
      } else if (url.includes('/login/oauth/access_token')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            access_token: 'github_token_123',
          }),
        });
      }
      return Promise.reject(new Error('Unhandled URL in fetch mock'));
    });
    
    // Create a new instance for each test
    authService = new AuthService();
  });
  
  describe('getAuthStatus', () => {
    it('should return null when not authenticated', async () => {
      const status = await authService.getAuthStatus();
      expect(status).toBeNull();
      expect(keytar.getPassword).toHaveBeenCalled();
    });
    
    it('should return user info when authenticated', async () => {
      // Setup saved credentials
      (keytar.getPassword as jest.Mock).mockResolvedValue(
        JSON.stringify({
          token: 'saved_token_123',
          username: mockUser.login,
          method: AuthMethod.Token,
        })
      );
      
      const status = await authService.getAuthStatus();
      
      expect(status).toEqual(mockUser);
      expect(keytar.getPassword).toHaveBeenCalled();
      expect(Octokit).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: 'saved_token_123',
        })
      );
    });
    
    it('should handle API errors gracefully', async () => {
      // Setup saved credentials
      (keytar.getPassword as jest.Mock).mockResolvedValue(
        JSON.stringify({
          token: 'invalid_token',
          username: mockUser.login,
          method: AuthMethod.Token,
        })
      );
      
      // Make the API call fail
      const mockOctokit = {
        rest: {
          users: {
            getAuthenticated: jest.fn().mockRejectedValue(
              new Error('Invalid token')
            ),
          },
        },
      };
      (Octokit as jest.Mock).mockImplementation(() => mockOctokit);
      
      const status = await authService.getAuthStatus();
      
      expect(status).toBeNull();
    });
  });
  
  describe('loginWithToken', () => {
    it('should validate and save the token', async () => {
      const result = await authService.loginWithToken('test_token_123');
      
      expect(result).toEqual(mockUser);
      expect(Octokit).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: 'test_token_123',
        })
      );
      expect(keytar.setPassword).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('test_token_123')
      );
    });
    
    it('should throw an error for invalid tokens', async () => {
      // Make the API call fail
      const mockOctokit = {
        rest: {
          users: {
            getAuthenticated: jest.fn().mockRejectedValue(
              new Error('Invalid token')
            ),
          },
        },
      };
      (Octokit as jest.Mock).mockImplementation(() => mockOctokit);
      
      await expect(authService.loginWithToken('invalid_token')).rejects.toThrow();
    });
  });
  
  describe('logout', () => {
    it('should remove saved credentials', async () => {
      const result = await authService.logout();
      
      expect(result).toBeTruthy();
      expect(keytar.deletePassword).toHaveBeenCalled();
    });
    
    it('should handle errors during logout', async () => {
      // Make the keytar call fail
      (keytar.deletePassword as jest.Mock).mockRejectedValue(
        new Error('Failed to delete')
      );
      
      const result = await authService.logout();
      
      expect(result).toBeFalsy();
    });
  });
  
  describe('isAuthenticated', () => {
    it('should return true when authenticated', async () => {
      // Setup saved credentials
      (keytar.getPassword as jest.Mock).mockResolvedValue(
        JSON.stringify({
          token: 'saved_token_123',
          username: mockUser.login,
          method: AuthMethod.Token,
        })
      );
      
      const result = await authService.isAuthenticated();
      
      expect(result).toBeTruthy();
    });
    
    it('should return false when not authenticated', async () => {
      const result = await authService.isAuthenticated();
      
      expect(result).toBeFalsy();
    });
  });
  
  describe('getOctokit', () => {
    it('should return an initialized Octokit instance', async () => {
      // Setup saved credentials
      (keytar.getPassword as jest.Mock).mockResolvedValue(
        JSON.stringify({
          token: 'saved_token_123',
          username: mockUser.login,
          method: AuthMethod.Token,
        })
      );
      
      const octokit = await authService.getOctokit();
      
      expect(octokit).toBeDefined();
      expect(Octokit).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: 'saved_token_123',
        })
      );
    });
    
    it('should throw an error when not authenticated', async () => {
      await expect(authService.getOctokit()).rejects.toThrow();
    });
  });
  
  // Browser auth tests are simplified since the actual implementation
  // is complex and involves user interaction
  describe('loginWithBrowser', () => {
    beforeEach(() => {
      // Mock process.stdin
      Object.defineProperty(process, 'stdin', {
        value: {
          once: jest.fn().mockImplementation((event, callback) => {
            // Immediately trigger the callback
            callback();
          }),
        },
      });
    });
    
    it('should authenticate via browser flow', async () => {
      const result = await authService.loginWithBrowser();
      
      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(keytar.setPassword).toHaveBeenCalled();
    });
    
    it('should handle errors during browser authentication', async () => {
      // Make the fetch call fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      await expect(authService.loginWithBrowser()).rejects.toThrow();
    });
  });
}); 