/**
 * GitHub Module
 * 
 * Provides services for interacting with the GitHub API.
 */

// Export types and classes
export { GitHubApiClient, RateLimitInfo, RequestOptions } from './services/github-api-client.js';
export { 
  RepositoryService, 
  Repository, 
  PullRequest 
} from './services/repository-service.js';

// Import dependencies
import { GitHubApiClient } from './services/github-api-client.js';
import { RepositoryService } from './services/repository-service.js';
import { config } from '../config/index.js';
import { authService } from '../auth/services/auth-service.js';

// Create and export singleton instances
export const githubApiClient = new GitHubApiClient(authService, config);
export const repositoryService = new RepositoryService(githubApiClient); 