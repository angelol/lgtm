/**
 * PR Action Menu
 *
 * Implements the interactive action menu for selected pull requests.
 */

import { showActionMenu, MenuItem } from '../../ui/menu.js';
import { getGitHubRepository } from '../../utils/repository.js';
import { RepositoryService } from '../services/repository-service.js';
import { GitHubApiClient } from '../services/github-api-client.js';
import { approvePullRequest } from './approve-pr.js';
import { reviewPullRequest } from './review-pr.js';
import { viewPullRequestDescription } from './description-pr.js';
import { formatCiStatus } from '../../ui/utils.js';
import { PullRequest } from '../services/repository-service.js';
import chalk from 'chalk';
import { authService } from '../../auth/index.js';
import { config } from '../../config/index.js';

/**
 * Options for PR action
 */
export interface PrActionOptions {
  /** Force approve even with failing CI */
  force?: boolean;
  /** Custom approval comment */
  comment?: string;
}

/**
 * Available PR actions
 */
export type PrAction = 'approve' | 'view-description' | 'review-changes' | 'open-browser' | null;

/**
 * Get a PR by number
 */
async function getPullRequest(prNumber: number): Promise<PullRequest | null> {
  const repoInfo = await getGitHubRepository();
  if (!repoInfo || !repoInfo.owner || !repoInfo.name) {
    throw new Error('Not in a GitHub repository. Please run from a GitHub repository directory.');
  }

  const owner = repoInfo.owner;
  const repo = repoInfo.name;

  const apiClient = new GitHubApiClient(authService, config);
  const repositoryService = new RepositoryService(apiClient);

  try {
    return await repositoryService.getPullRequest(owner, repo, prNumber);
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    return null;
  }
}

/**
 * Show the action menu for a PR and execute the selected action
 * @param prNumber The PR number to show actions for
 * @param options Options for PR actions
 * @returns The result of the action (success/failure)
 */
export async function showPrActionMenu(
  prNumber: number,
  options: PrActionOptions = {},
): Promise<boolean> {
  // Get PR details
  const pr = await getPullRequest(prNumber);
  if (!pr) {
    return false;
  }

  // Format PR metadata for display
  const ciStatus = formatCiStatus(pr.ciStatus);

  // Show the menu header with PR info
  console.log(chalk.bold(`\nPR #${pr.number}: "${pr.title}"`));
  console.log(`Author: @${pr.author.login}`);
  console.log(`Status: ${ciStatus}`);
  console.log();

  // Create actions for menu
  const actions: MenuItem<PrAction>[] = [
    { name: 'View Description', value: 'view-description' },
    { name: 'Review Changes', value: 'review-changes' },
    { name: 'Open in Browser', value: 'open-browser' },
    { name: 'Approve', value: 'approve' },
    { name: 'Cancel', value: null },
  ];

  // Show action menu
  const action = await showActionMenu(actions, {
    message: `What would you like to do with PR #${pr.number}?`,
  });

  // Execute the selected action
  switch (action) {
    case 'approve':
      return await approvePullRequest(prNumber, options);

    case 'view-description':
      return await viewPullRequestDescription(prNumber, options);

    case 'review-changes':
      return await reviewPullRequest(prNumber, {
        ...options,
        autoApprove: true,
      });

    case 'open-browser':
      console.log(chalk.yellow('Open in browser feature coming soon'));
      return true;

    case null:
    default:
      console.log('Action canceled.');
      return false;
  }
}
