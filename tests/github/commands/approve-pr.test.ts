import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { approvePullRequest } from '../../../src/github/commands/approve-pr.js';
import { GitHubApiClient } from '../../../src/github/services/github-api-client.js';
import { RepositoryService } from '../../../src/github/services/repository-service.js';
import * as repository from '../../../src/utils/repository.js';
import { GitHubRepo } from '../../../src/utils/repository.js';
import { PullRequest } from '../../../src/github/services/repository-service.js';
import { confirmFailingCi, confirm } from '../../../src/ui/confirm.js';

// Mock the repository utility functions
jest.mock('../../../src/utils/repository.js', () => ({
  getGitHubRepository: jest.fn(),
}));

// Mock the GitHubApiClient
jest.mock('../../../src/github/services/github-api-client.js');

// Mock the UI components
jest.mock('../../../src/ui/confirm.js');

// Mock the RepositoryService
jest.mock('../../../src/github/services/repository-service.js', () => {
  return {
    RepositoryService: jest.fn().mockImplementation(() => ({
      getPullRequest: jest.fn(),
      approvePullRequest: jest.fn(),
    })),
  };
});

// Mock console.log and console.error
console.log = jest.fn();
console.error = jest.fn();

describe('PR Approval Command', () => {
  let mockGetPullRequest: jest.Mock;
  let mockApprovePullRequest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getGitHubRepository to return a valid repo
    (repository.getGitHubRepository as jest.Mock).mockResolvedValue({
      owner: 'test-owner',
      name: 'test-repo',
      isGitHub: true,
    } as GitHubRepo);

    // Get the mock methods from the mocked service
    const mockRepositoryService =
      (RepositoryService as jest.Mock).mock.results[0]?.value ||
      new (RepositoryService as jest.Mock)();

    mockGetPullRequest = mockRepositoryService.getPullRequest as jest.Mock;
    mockApprovePullRequest = mockRepositoryService.approvePullRequest as jest.Mock;

    // Configure mock behaviors
    mockGetPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      ciStatus: 'success',
    } as PullRequest);

    mockApprovePullRequest.mockResolvedValue(true);
  });

  it('should approve a PR with successful CI status', async () => {
    const result = await approvePullRequest(123);

    expect(result).toBe(true);
    expect(mockGetPullRequest).toHaveBeenCalledWith('test-owner', 'test-repo', 123);
    expect(mockApprovePullRequest).toHaveBeenCalledWith('test-owner', 'test-repo', 123, 'LGTM 👍');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Successfully approved PR #123'),
    );
  });

  it('should approve a PR with a custom comment', async () => {
    const result = await approvePullRequest(123, { comment: 'Custom approval message' });

    expect(result).toBe(true);
    expect(mockApprovePullRequest).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      123,
      'Custom approval message',
    );
  });

  it('should handle failing CI status with confirmation', async () => {
    // Set up PR with failing CI
    mockGetPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      ciStatus: 'failure',
    } as PullRequest);

    const confirmFailingCiMock = confirmFailingCi as jest.Mock;

    const result = await approvePullRequest(123);

    expect(result).toBe(true);
    // Check that confirmFailingCi was called
    expect(confirmFailingCiMock).toHaveBeenCalledWith(123, 'Test PR');
  });

  it('should handle pending CI status with confirmation', async () => {
    // Set up PR with pending CI
    mockGetPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      ciStatus: 'pending',
    } as PullRequest);

    const confirmMock = confirm as jest.Mock;

    const result = await approvePullRequest(123);

    expect(result).toBe(true);
    // Check that confirm was called with a warning message
    expect(confirmMock).toHaveBeenCalled();
  });

  it('should force approve a PR with failing CI when force option is true', async () => {
    // Set up PR with failing CI
    mockGetPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      ciStatus: 'failure',
    } as PullRequest);

    const confirmFailingCiMock = confirmFailingCi as jest.Mock;

    const result = await approvePullRequest(123, { force: true });

    expect(result).toBe(true);
    // Check that confirmFailingCi was NOT called
    expect(confirmFailingCiMock).not.toHaveBeenCalled();
  });

  it('should handle non-GitHub repositories', async () => {
    // Mock getGitHubRepository to return null (not a GitHub repo)
    (repository.getGitHubRepository as jest.Mock).mockResolvedValue(null);

    await expect(approvePullRequest(123)).rejects.toThrow('Not in a GitHub repository');
  });

  it('should handle invalid PR numbers', async () => {
    await expect(approvePullRequest('invalid' as any)).rejects.toThrow(
      'Invalid pull request number',
    );
    await expect(approvePullRequest(-1)).rejects.toThrow('Invalid pull request number');
  });

  it('should handle API errors', async () => {
    // Mock getPullRequest to throw an error
    mockGetPullRequest.mockRejectedValue(new Error('API error'));

    const result = await approvePullRequest(123);

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error: API error'));
  });
});
