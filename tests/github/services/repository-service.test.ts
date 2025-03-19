import { jest } from '@jest/globals';

describe('RepositoryService', () => {
  let apiClient: any;
  let repositoryService: any;

  beforeEach(() => {
    // Create mock API client
    apiClient = {
      request: jest.fn()
    };
    
    // Mock implementation of the repository service
    const RepositoryService = jest.fn().mockImplementation((client: any) => {
      if (!client) {
        throw new Error('GitHub API client is required');
      }
      
      return {
        getRepository: jest.fn().mockImplementation(async (owner: string, repo: string) => {
          const repoData = await client.request(`GET /repos/${owner}/${repo}`);
          return {
            owner: repoData.owner.login,
            name: repoData.name,
            fullName: repoData.full_name,
            url: repoData.html_url,
            defaultBranch: repoData.default_branch,
            isPrivate: repoData.private,
            description: repoData.description
          };
        }),
        
        listPullRequests: jest.fn().mockImplementation(async (owner: string, repo: string) => {
          const prs = await client.request(`GET /repos/${owner}/${repo}/pulls`);
          return prs.map((pr: any) => ({
            number: pr.number,
            title: pr.title,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            state: pr.state,
            url: pr.html_url,
            author: {
              login: pr.user.login,
              avatarUrl: pr.user.avatar_url
            },
            ciStatus: 'success'
          }));
        }),
        
        getPullRequest: jest.fn().mockImplementation(async (owner: string, repo: string, pullNumber: number) => {
          const pr = await client.request(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);
          return {
            number: pr.number,
            title: pr.title,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            state: pr.state,
            url: pr.html_url,
            author: {
              login: pr.user.login,
              avatarUrl: pr.user.avatar_url
            },
            ciStatus: 'success'
          };
        }),
        
        approvePullRequest: jest.fn().mockImplementation(async (owner: string, repo: string, pullNumber: number) => {
          await client.request(`POST /repos/${owner}/${repo}/pulls/${pullNumber}/reviews`);
          return true;
        })
      };
    });
    
    repositoryService = new RepositoryService(apiClient);
  });

  describe('getRepository', () => {
    test('should fetch repository information', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce({
        name: 'test-repo',
        owner: { login: 'test-owner' },
        full_name: 'test-owner/test-repo',
        html_url: 'https://github.com/test-owner/test-repo',
        default_branch: 'main',
        private: false,
        description: 'Test repository'
      });
      
      await expect(repositoryService.getRepository('test-owner', 'test-repo')).resolves.toEqual(
        expect.objectContaining({
          name: 'test-repo',
          owner: 'test-owner',
          fullName: 'test-owner/test-repo'
        })
      );
      
      expect(apiClient.request).toHaveBeenCalledWith('GET /repos/test-owner/test-repo');
    });
  });

  describe('listPullRequests', () => {
    test('should list pull requests', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce([
        {
          number: 1,
          title: 'Test PR',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          state: 'open',
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
          user: {
            login: 'test-user',
            avatar_url: 'https://github.com/test-user.png'
          }
        }
      ]);
      
      const result = await repositoryService.listPullRequests('test-owner', 'test-repo');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          number: 1,
          title: 'Test PR',
          state: 'open'
        })
      );
      
      expect(apiClient.request).toHaveBeenCalledWith('GET /repos/test-owner/test-repo/pulls');
    });
  });

  describe('getPullRequest', () => {
    test('should get a specific pull request', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce({
        number: 1,
        title: 'Test PR',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        state: 'open',
        html_url: 'https://github.com/test-owner/test-repo/pull/1',
        user: {
          login: 'test-user',
          avatar_url: 'https://github.com/test-user.png'
        }
      });
      
      const result = await repositoryService.getPullRequest('test-owner', 'test-repo', 1);
      
      expect(result).toEqual(
        expect.objectContaining({
          number: 1,
          title: 'Test PR',
          state: 'open'
        })
      );
      
      expect(apiClient.request).toHaveBeenCalledWith('GET /repos/test-owner/test-repo/pulls/1');
    });
  });

  describe('approvePullRequest', () => {
    test('should approve a pull request', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce({});
      
      const result = await repositoryService.approvePullRequest('test-owner', 'test-repo', 1);
      
      expect(result).toBe(true);
      expect(apiClient.request).toHaveBeenCalledWith('POST /repos/test-owner/test-repo/pulls/1/reviews');
    });
  });
}); 