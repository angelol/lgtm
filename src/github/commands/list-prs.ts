/**
 * PR Listing and Selection Command
 * 
 * Implements commands for listing and selecting GitHub pull requests.
 */

import chalk from 'chalk';
import { getGitHubRepository } from '../../utils/repository.js';
import { RepositoryService } from '../services/repository-service.js';
import { GitHubApiClient } from '../services/github-api-client.js';
import { NotFoundError, PermissionError } from '../../utils/errors.js';
import { selectPullRequest } from '../../ui/selection.js';
import { PullRequest } from '../services/repository-service.js';
import { authService } from '../../auth/index.js';
import { config } from '../../config/index.js';

/**
 * Interface for PR listing options
 */
export interface ListPrOptions {
  /** State of PRs to list (open, closed, all) */
  state?: 'open' | 'closed' | 'all';
  /** Sort order (created, updated, popularity, long-running) */
  sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  /** Interactive mode */
  interactive?: boolean;
}

/**
 * Lists pull requests for the current repository
 * @param options - Options for listing PRs
 * @returns Array of pull requests or selected PR number in interactive mode
 */
export async function listPullRequests(
  options: ListPrOptions = {}
): Promise<PullRequest[] | number | null> {
  // Get the current GitHub repository
  const repoInfo = await getGitHubRepository();
  if (!repoInfo || !repoInfo.owner || !repoInfo.name) {
    throw new Error('Not in a GitHub repository. Please run from a GitHub repository directory.');
  }
  
  const owner = repoInfo.owner;
  const repo = repoInfo.name;
  
  // Set up API client
  const apiClient = new GitHubApiClient(authService, config);
  const repositoryService = new RepositoryService(apiClient);
  
  try {
    // Get list of PRs
    const pullRequests = await repositoryService.listPullRequests(owner, repo, {
      state: options.state || 'open',
      sort: options.sort || 'updated'
    });
    
    if (pullRequests.length === 0) {
      console.log(chalk.yellow(`No ${options.state || 'open'} pull requests found in ${owner}/${repo}`));
      return options.interactive ? null : [];
    }
    
    // Interactive or list mode
    if (options.interactive) {
      // Interactive selection
      const selectedPr = await selectPullRequest(pullRequests, {
        message: `Select a PR from ${owner}/${repo}:`
      });
      
      return selectedPr;
    } else {
      // Just return the list
      return pullRequests;
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.error(chalk.red(`Error: Repository ${owner}/${repo} not found`));
    } else if (error instanceof PermissionError) {
      console.error(chalk.red(`Error: You don't have access to repository ${owner}/${repo}`));
    } else {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
    }
    
    return options.interactive ? null : [];
  }
}

/**
 * Display pull requests in a formatted table
 * @param pullRequests - The PRs to display
 */
export function displayPullRequests(pullRequests: PullRequest[]): void {
  if (pullRequests.length === 0) {
    return; // Nothing to display
  }
  
  const repoInfo = pullRequests[0].url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  const repoPath = repoInfo ? `${repoInfo[1]}/${repoInfo[2]}` : 'repository';
  
  console.log(chalk.bold(`OPEN PULL REQUESTS for ${repoPath}:`));
  console.log();
  
  for (const pr of pullRequests) {
    const timeAgo = new Date(pr.createdAt).toLocaleDateString();
    const ciStatus = getCiStatusIndicator(pr.ciStatus);
    
    console.log(`#${pr.number} | ${pr.title} | @${pr.author.login} | ${timeAgo} | ${ciStatus}`);
  }
}

/**
 * Get a colored indicator for CI status
 */
function getCiStatusIndicator(status: string | null): string {
  switch (status) {
    case 'success':
      return chalk.green('✅ CI Passing');
    case 'failure':
      return chalk.red('❌ CI Failed');
    case 'pending':
      return chalk.yellow('⏳ CI Running');
    default:
      return chalk.gray('? CI Unknown');
  }
} 