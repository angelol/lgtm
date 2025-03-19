import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { reviewPullRequest } from '../../../src/github/commands/review-pr.js';
import { GitHubApiClient } from '../../../src/github/services/github-api-client.js';
import { RepositoryService } from '../../../src/github/services/repository-service.js';
import { ContentService } from '../../../src/github/services/content-service.js';
import * as repository from '../../../src/utils/repository.js';
import { GitHubRepo } from '../../../src/utils/repository.js';
import { PullRequest } from '../../../src/github/services/repository-service.js';
import { FileChange } from '../../../src/github/models/content.js';

// Mock the repository utility functions
jest.mock('../../../src/utils/repository.js', () => ({
  getGitHubRepository: jest.fn(),
}));

// Mock the GitHubApiClient
jest.mock('../../../src/github/services/github-api-client.js');

// Mock the RepositoryService
jest.mock('../../../src/github/services/repository-service.js', () => {
  return {
    RepositoryService: jest.fn().mockImplementation(() => ({
      getPullRequest: jest.fn(),
      approvePullRequest: jest.fn(),
    })),
  };
});

// Mock the ContentService
jest.mock('../../../src/github/services/content-service.js', () => {
  return {
    ContentService: jest.fn().mockImplementation(() => ({
      getPullRequestDiff: jest.fn(),
    })),
  };
});

// Mock the FileDiffViewer
jest.mock('../../../src/ui/file-diff-viewer.js', () => ({
  showFileDiff: jest.fn().mockResolvedValue({}),
  FileDiffViewer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue({}),
    on: jest.fn((event, callback) => {
      if (event === 'approve') {
        callback();
      }
      return { on: jest.fn() };
    }),
  })),
}));

// Mock the confirm prompt
jest.mock('../../../src/ui/confirm.js', () => ({
  confirm: jest.fn().mockResolvedValue(true),
}));

// Mock console.log and console.error
console.log = jest.fn();
console.error = jest.fn();

describe('PR Review Command', () => {
  let mockGetPullRequest: jest.Mock;
  let mockGetPullRequestDiff: jest.Mock;
  let mockApprovePullRequest: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getGitHubRepository to return a valid repo
    (repository.getGitHubRepository as jest.Mock).mockResolvedValue({
      owner: 'test-owner',
      name: 'test-repo',
      isGitHub: true,
    } as GitHubRepo);

    // Get the mock methods from the mocked services
    const mockRepositoryService =
      (RepositoryService as jest.Mock).mock.results[0]?.value ||
      new (RepositoryService as jest.Mock)();

    const mockContentService =
      (ContentService as jest.Mock).mock.results[0]?.value || new (ContentService as jest.Mock)();

    mockGetPullRequest = mockRepositoryService.getPullRequest as jest.Mock;
    mockApprovePullRequest = mockRepositoryService.approvePullRequest as jest.Mock;
    mockGetPullRequestDiff = mockContentService.getPullRequestDiff as jest.Mock;

    // Configure mock behaviors
    mockGetPullRequest.mockResolvedValue({
      number: 123,
      title: 'Test PR',
      ciStatus: 'success',
      author: {
        login: 'testuser',
      },
    } as PullRequest);

    mockGetPullRequestDiff.mockResolvedValue({
      files: [
        {
          filename: 'test-file.js',
          status: 'modified',
          additions: 5,
          deletions: 2,
          changes: 7,
          patch:
            '@@ -1,5 +1,8 @@\n const test = () => {\n-  return "old";\n+  return "new";\n+  // Added comment\n+  // Another comment\n }',
        } as FileChange,
      ],
      totalFiles: 1,
      totalAdditions: 5,
      totalDeletions: 2,
      totalChanges: 7,
    });

    mockApprovePullRequest.mockResolvedValue(true);
  });

  it('should display PR diff and return without error', async () => {
    const result = await reviewPullRequest(123);

    expect(result).toBe(true);
    expect(mockGetPullRequest).toHaveBeenCalledWith('test-owner', 'test-repo', 123);
    expect(mockGetPullRequestDiff).toHaveBeenCalledWith('test-owner', 'test-repo', 123);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Reviewing changes in PR #123:'),
    );
  });

  it('should approve PR after review if approved', async () => {
    const FileDiffViewer = require('../../../src/ui/file-diff-viewer.js').FileDiffViewer;
    const fileDiffViewerInstance = new FileDiffViewer({});

    // Simulate 'approve' event emission
    const onSpy = jest.spyOn(fileDiffViewerInstance, 'on');

    const result = await reviewPullRequest(123, { autoApprove: true });

    expect(result).toBe(true);
    expect(mockApprovePullRequest).toHaveBeenCalledWith('test-owner', 'test-repo', 123, 'LGTM 👍');
  });

  it('should not approve PR if review was canceled', async () => {
    // Mock the FileDiffViewer to simulate cancellation
    const showFileDiff = require('../../../src/ui/file-diff-viewer.js').showFileDiff as jest.Mock;
    showFileDiff.mockResolvedValue('quit');

    const result = await reviewPullRequest(123, { autoApprove: true });

    expect(result).toBe(true);
    expect(mockApprovePullRequest).not.toHaveBeenCalled();
  });

  it('should handle non-GitHub repositories', async () => {
    // Mock getGitHubRepository to return null (not a GitHub repo)
    (repository.getGitHubRepository as jest.Mock).mockResolvedValue(null);

    await expect(reviewPullRequest(123)).rejects.toThrow('Not in a GitHub repository');
  });

  it('should handle invalid PR numbers', async () => {
    await expect(reviewPullRequest('invalid' as any)).rejects.toThrow(
      'Invalid pull request number',
    );
    await expect(reviewPullRequest(-1)).rejects.toThrow('Invalid pull request number');
  });

  it('should handle API errors when getting PR details', async () => {
    // Mock getPullRequest to throw an error
    mockGetPullRequest.mockRejectedValue(new Error('API error'));

    const result = await reviewPullRequest(123);

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error: API error'));
  });

  it('should handle API errors when getting PR diff', async () => {
    // Mock getPullRequestDiff to throw an error
    mockGetPullRequestDiff.mockRejectedValue(new Error('Diff API error'));

    const result = await reviewPullRequest(123);

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error: Diff API error'));
  });
});
