/**
 * PR Description Command
 *
 * Implements the view of pull request descriptions.
 */

import chalk from 'chalk';
import { getGitHubRepository } from '../../utils/repository.js';
import { RepositoryService } from '../services/repository-service.js';
import { ContentService } from '../services/content-service.js';
import { GitHubApiClient } from '../services/github-api-client.js';
import { formatCiStatus } from '../../ui/utils.js';
import { authService } from '../../auth/index.js';
import { config } from '../../config/index.js';
import { ContentViewer } from '../../ui/content-viewer.js';
import { renderMarkdown } from '../../ui/markdown.js';
import { showActionMenu, MenuItem } from '../../ui/menu.js';
import { reviewPullRequest } from './review-pr.js';
import { approvePullRequest } from './approve-pr.js';

/**
 * Options for the PR description command
 */
export interface DescriptionPrOptions {
  /** Force approve even with failing CI */
  force?: boolean;
  /** Custom approval comment */
  comment?: string;
}

/**
 * Actions available after viewing PR description
 */
export type DescriptionAction =
  | 'review' // Review PR changes
  | 'approve' // Approve PR
  | 'open' // Open in browser
  | null; // Cancel/do nothing

/**
 * Views a pull request's description in a formatted way
 * @param prNumber The pull request number to view
 * @param options Options for the description view
 * @returns Promise resolving to true if successful, false if not
 */
export async function viewPullRequestDescription(
  prNumber: number | string,
  options: DescriptionPrOptions = {},
): Promise<boolean> {
  // Validate the PR number
  const pullNumber = Number(prNumber);
  if (isNaN(pullNumber) || pullNumber <= 0) {
    throw new Error('Invalid pull request number');
  }

  // Get the GitHub repository information
  const repo = await getGitHubRepository();
  if (!repo || !repo.owner || !repo.name) {
    throw new Error('Not in a GitHub repository. Please run from a GitHub repository directory.');
  }

  const owner = repo.owner;
  const repoName = repo.name;

  // Create API clients
  const apiClient = new GitHubApiClient(authService, config);
  const repositoryService = new RepositoryService(apiClient);
  const contentService = new ContentService(apiClient);

  try {
    // Get PR details
    const pr = await repositoryService.getPullRequest(owner, repoName, pullNumber);

    // Get PR description
    const description = await contentService.getPullRequestDescription(owner, repoName, pullNumber);

    // Display information about the PR
    console.log(chalk.bold(`\nPR #${pr.number}: "${pr.title}"`));
    console.log(`Author: @${pr.author.login}`);
    console.log(`Created: ${new Date(pr.createdAt).toLocaleString()}`);
    console.log(`Status: ${formatCiStatus(pr.ciStatus)}`);

    // Display labels if any
    if (pr.labels && pr.labels.length > 0) {
      console.log(`Labels: ${pr.labels.map(label => label.name).join(', ')}`);
    }

    console.log('\n## Description');

    if (!description.body.trim()) {
      console.log('\n*No description provided*');
    } else {
      // Render the markdown
      const renderedMarkdown = renderMarkdown(description.body);

      // Create content viewer with rendered markdown
      const content = renderedMarkdown.split('\n');

      const viewer = new ContentViewer(content, {
        title: `PR #${pr.number} Description`,
        additionalActions: {
          o: 'Open in browser',
          a: 'Approve PR',
          r: 'View changes',
        },
      });

      // Create a promise to handle custom actions
      const actionPromise = new Promise<DescriptionAction>(resolve => {
        // Listen for user-defined actions
        viewer.on('o', () => resolve('open'));
        viewer.on('a', () => resolve('approve'));
        viewer.on('r', () => resolve('review'));

        // Also listen for quit to resolve with null
        viewer.on('quit', () => resolve(null));
      });

      // Start the viewer (which returns a promise that resolves when it closes)
      const viewerStartPromise = viewer.start();

      // Wait for either the viewer to close or an action to be selected
      const action = await Promise.race([viewerStartPromise.then(() => null), actionPromise]);

      // Handle action if any
      if (action) {
        return await handleDescriptionAction(action, pr.number, options);
      }
    }

    // After viewing description, show action menu
    console.log('\nWhat would you like to do next?');

    const actionItems: MenuItem<DescriptionAction>[] = [
      { name: 'Review Changes', value: 'review' },
      { name: 'Approve PR', value: 'approve' },
      { name: 'Open in Browser', value: 'open' },
      { name: 'Cancel', value: null },
    ];

    const selectedAction = await showActionMenu(actionItems, {
      message: `What would you like to do with PR #${pr.number}?`,
    });

    return await handleDescriptionAction(selectedAction, pr.number, options);
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    return false;
  }
}

/**
 * Handles the action selected after viewing PR description
 * @param action The selected action
 * @param prNumber The PR number
 * @param options Options for the action
 * @returns Promise resolving to true if successful, false if not
 */
async function handleDescriptionAction(
  action: DescriptionAction,
  prNumber: number,
  options: DescriptionPrOptions = {},
): Promise<boolean> {
  switch (action) {
    case 'review':
      return await reviewPullRequest(prNumber, {
        ...options,
        autoApprove: false,
      });

    case 'approve':
      return await approvePullRequest(prNumber, options);

    case 'open':
      console.log(chalk.yellow(`Opening PR #${prNumber} in browser feature coming soon`));
      return true;

    case null:
    default:
      return true;
  }
}
