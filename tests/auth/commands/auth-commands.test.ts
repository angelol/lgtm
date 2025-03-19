/**
 * Authentication Commands Tests
 */

import { Command } from 'commander';
import { addLoginCommand } from '../../../src/auth/commands/login-command.js';
import { addStatusCommand } from '../../../src/auth/commands/status-command.js';
import { addLogoutCommand } from '../../../src/auth/commands/logout-command.js';
import { authService } from '../../../src/auth/services/auth-service.js';
import inquirer from 'inquirer';

// Mock dependencies
jest.mock('../../../src/auth/services/auth-service.js', () => ({
  authService: {
    getAuthStatus: jest.fn(),
    loginWithBrowser: jest.fn(),
    loginWithToken: jest.fn(),
    logout: jest.fn(),
  },
  AuthMethod: {
    Browser: 'browser',
    Token: 'token',
  },
}));

jest.mock('inquirer');
jest.mock('chalk', () => ({
  green: jest.fn((text) => `[green]${text}[/green]`),
  yellow: jest.fn((text) => `[yellow]${text}[/yellow]`),
  red: jest.fn((text) => `[red]${text}[/red]`),
  bold: jest.fn((text) => `[bold]${text}[/bold]`),
  cyan: jest.fn((text) => `[cyan]${text}[/cyan]`),
}));

jest.mock('boxen', () => jest.fn((text) => `[boxen]${text}[/boxen]`));

// Mock console.log
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

describe('Auth Commands', () => {
  let program: Command;
  let authCommand: Command;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console.log
    console.log = mockConsoleLog;
    
    // Setup Commander
    program = new Command();
    authCommand = program.command('auth');
    
    // Setup inquirer mock
    (inquirer.prompt as jest.Mock).mockResolvedValue({});
  });
  
  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });
  
  describe('login command', () => {
    it('should authenticate via browser by default', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue(null);
      (inquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({ method: 'browser' }) // Authentication method
      (authService.loginWithBrowser as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      
      // Register command
      addLoginCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['login'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(authService.loginWithBrowser).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Authentication complete'));
    });
    
    it('should authenticate via token when selected', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue(null);
      (inquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({ method: 'token' }) // Authentication method
        .mockResolvedValueOnce({ token: 'test_token_123' }); // Token input
      (authService.loginWithToken as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      
      // Register command
      addLoginCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['login'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      expect(authService.loginWithToken).toHaveBeenCalledWith('test_token_123');
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Authentication complete'));
    });
    
    it('should handle already being logged in', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: false });
      
      // Register command
      addLoginCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['login'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(authService.loginWithBrowser).not.toHaveBeenCalled();
      expect(authService.loginWithToken).not.toHaveBeenCalled();
    });
    
    it('should handle authentication errors', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue(null);
      (inquirer.prompt as jest.Mock).mockResolvedValueOnce({ method: 'browser' });
      (authService.loginWithBrowser as jest.Mock).mockRejectedValue(new Error('Authentication failed'));
      
      // Mock process.exit
      const originalProcessExit = process.exit;
      process.exit = jest.fn() as any;
      
      try {
        // Register command
        addLoginCommand(authCommand);
        
        // Call the command
        await authCommand.parseAsync(['login'], { from: 'user' });
        
        // Should have called process.exit
        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        // Restore process.exit
        process.exit = originalProcessExit;
      }
    });
  });
  
  describe('status command', () => {
    it('should show authenticated status', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      
      // Register command
      addStatusCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['status'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled();
    });
    
    it('should show unauthenticated status', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue(null);
      
      // Register command
      addStatusCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['status'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Not logged in'));
    });
  });
  
  describe('logout command', () => {
    it('should logout when confirmed', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true });
      (authService.logout as jest.Mock).mockResolvedValue(true);
      
      // Register command
      addLogoutCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['logout'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(authService.logout).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Successfully logged out'));
    });
    
    it('should cancel logout when not confirmed', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: false });
      
      // Register command
      addLogoutCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['logout'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Logout cancelled'));
    });
    
    it('should handle not being logged in', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue(null);
      
      // Register command
      addLogoutCommand(authCommand);
      
      // Call the command
      await authCommand.parseAsync(['logout'], { from: 'user' });
      
      // Verify the execution
      expect(authService.getAuthStatus).toHaveBeenCalled();
      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Not currently logged in'));
    });
    
    it('should handle logout errors', async () => {
      // Setup mocks
      (authService.getAuthStatus as jest.Mock).mockResolvedValue({
        login: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true });
      (authService.logout as jest.Mock).mockResolvedValue(false);
      
      // Mock process.exit
      const originalProcessExit = process.exit;
      process.exit = jest.fn() as any;
      
      try {
        // Register command
        addLogoutCommand(authCommand);
        
        // Call the command
        await authCommand.parseAsync(['logout'], { from: 'user' });
        
        // Should have called process.exit
        expect(process.exit).toHaveBeenCalledWith(1);
      } finally {
        // Restore process.exit
        process.exit = originalProcessExit;
      }
    });
  });
}); 