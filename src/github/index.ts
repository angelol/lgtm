/**
 * GitHub Module
 *
 * Provides services for interacting with the GitHub API.
 */

// Export types and classes
export { GitHubApiClient, RateLimitInfo, RequestOptions } from './services/github-api-client.js';
export { RepositoryService, Repository, PullRequest } from './services/repository-service.js';
export { ContentService } from './services/content-service.js';
export {
  PullRequestDescription,
  FileChange,
  PullRequestDiff,
  ParsedMarkdown,
  ParsedDiff,
} from './models/content.js';

// Export commands
export { approvePullRequest, ApprovePrOptions } from './commands/approve-pr.js';
export { listPullRequests, displayPullRequests, ListPrOptions } from './commands/list-prs.js';
export { showPrActionMenu, PrActionOptions, PrAction } from './commands/pr-menu.js';
export { reviewPullRequest, ReviewPrOptions } from './commands/review-pr.js';
export { viewPullRequestDescription, DescriptionPrOptions } from './commands/description-pr.js';

// Import dependencies
import { GitHubApiClient } from './services/github-api-client.js';
import { RepositoryService } from './services/repository-service.js';
import { ContentService } from './services/content-service.js';
import { config } from '../config/index.js';
import { authService } from '../auth/services/auth-service.js';

// Create and export singleton instances
export const githubApiClient = new GitHubApiClient(authService, config);
export const repositoryService = new RepositoryService(githubApiClient);
export const contentService = new ContentService(githubApiClient);
