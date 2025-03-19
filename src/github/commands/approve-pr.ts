/**
 * PR Approval Command
 * 
 * Implements the command to approve GitHub pull requests.
 */

import chalk from 'chalk';
import { getGitHubRepository } from '../../utils/repository.js';
import { RepositoryService } from '../services/repository-service.js';
import { GitHubApiClient } from '../services/github-api-client.js';
import { confirm, confirmFailingCi } from '../../ui/confirm.js';
import { NotFoundError, PermissionError } from '../../utils/errors.js';
import { formatCiStatus } from '../../ui/utils.js';
import { authService } from '../../auth/index.js';
import { config } from '../../config/index.js';

/**
 * Interface for PR approval options
 */
export interface ApprovePrOptions {
  /** Comment to include with the approval */
  comment?: string;
  /** Whether to force approval even with failing CI */
  force?: boolean;
}

/**
 * Approves a pull request
 * @param prNumber - The pull request number to approve
 * @param options - Options for the approval
 * @returns Promise that resolves to true if the PR was successfully approved
 */
export async function approvePullRequest(
  prNumber: number | string,
  options: ApprovePrOptions = {}
): Promise<boolean> {
  // Convert prNumber to a number if it's a string
  const pullNumber = typeof prNumber === 'string' ? parseInt(prNumber, 10) : prNumber;
  
  // Validate the PR number
  if (isNaN(pullNumber) || pullNumber <= 0) {
    throw new Error(`Invalid pull request number: ${prNumber}`);
  }
  
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
    // Get PR details including CI status
    const pr = await repositoryService.getPullRequest(owner, repo, pullNumber);
    
    // Check CI status if not forcing approval
    if (!options.force && pr.ciStatus) {
      if (pr.ciStatus === 'failure') {
        // Confirm approval for failing CI
        const shouldApprove = await confirmFailingCi(pullNumber, pr.title);
        if (!shouldApprove) {
          console.log('Approval canceled.');
          return false;
        }
      } else if (pr.ciStatus === 'pending') {
        // For pending CI, create a custom confirmation
        const ciStatusDisplay = formatCiStatus('pending');
        const message = [
          chalk.yellow(`⚠️  Warning: CI checks are still running for PR #${pullNumber}`),
          `Title: ${pr.title}`,
          `Status: ${ciStatusDisplay}`,
          'Do you still want to approve this PR?'
        ].join('\n');
        
        const shouldApprove = await confirm({
          message,
          defaultValue: false,
          status: 'warning'
        });
        
        if (!shouldApprove) {
          console.log('Approval canceled.');
          return false;
        }
      }
    }
    
    // Approve the PR
    const comment = options.comment || 'LGTM 👍';
    await repositoryService.approvePullRequest(owner, repo, pullNumber, comment);
    
    // Success message
    console.log(chalk.green(`✅ Successfully approved PR #${pullNumber}: "${pr.title}"`));
    return true;
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.error(chalk.red(`Error: PR #${pullNumber} not found in ${owner}/${repo}`));
    } else if (error instanceof PermissionError) {
      console.error(chalk.red(`Error: You don't have permission to approve PR #${pullNumber} in ${owner}/${repo}`));
    } else {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
    }
    return false;
  }
} 