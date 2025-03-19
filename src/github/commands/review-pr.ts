/**
 * PR Review Command
 *
 * Implements the interactive review of pull request changes.
 */

import chalk from 'chalk';
import { getGitHubRepository } from '../../utils/repository.js';
import { RepositoryService } from '../services/repository-service.js';
import { ContentService } from '../services/content-service.js';
import { GitHubApiClient } from '../services/github-api-client.js';
import { FileDiffViewer } from '../../ui/file-diff-viewer.js';
import { confirm } from '../../ui/confirm.js';
import { formatCiStatus } from '../../ui/utils.js';
import { authService } from '../../auth/index.js';
import { config } from '../../config/index.js';

/**
 * Options for the PR review command
 */
export interface ReviewPrOptions {
  /** Force approve even with failing CI */
  force?: boolean;
  /** Custom approval comment */
  comment?: string;
  /** Automatically prompt for approval after review */
  autoApprove?: boolean;
}

/**
 * Reviews a pull request's changes interactively
 * @param prNumber The pull request number to review
 * @param options Options for the review
 * @returns Promise resolving to true if successful, false if not
 */
export async function reviewPullRequest(
  prNumber: number | string,
  options: ReviewPrOptions = {},
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

    // Display information about the PR
    console.log(chalk.bold(`\nReviewing changes in PR #${pr.number}: "${pr.title}"`));
    console.log(`Author: @${pr.author.login}`);
    console.log(`Status: ${formatCiStatus(pr.ciStatus)}`);
    console.log();

    // Get the PR diff
    const diff = await contentService.getPullRequestDiff(owner, repoName, pullNumber);

    // Display summary of changes
    console.log(
      chalk.bold(
        `Changed Files: ${diff.totalFiles} ${diff.totalFiles === 1 ? 'file' : 'files'} changed, ${diff.totalAdditions} insertion${diff.totalAdditions === 1 ? '' : 's'}(+), ${diff.totalDeletions} deletion${diff.totalDeletions === 1 ? '' : 's'}(-)`,
      ),
    );
    console.log();

    // Create file diff viewer
    const viewer = new FileDiffViewer(diff, {
      showLineNumbers: true,
      highlight: true,
      showHelp: true,
    });

    // If auto-approve is enabled, listen for approve event
    if (options.autoApprove) {
      viewer.on('approve', (): void => {
        // We need to handle this without returning the promise
        void (async (): Promise<void> => {
          // Approve the PR
          const approved = await repositoryService.approvePullRequest(
            owner,
            repoName,
            pullNumber,
            options.comment || 'LGTM 👍',
          );

          if (approved) {
            console.log(chalk.green(`\n✅ Successfully approved PR #${pullNumber}: "${pr.title}"`));
          } else {
            console.log(chalk.red(`\n❌ Failed to approve PR #${pullNumber}`));
          }
        })();
      });
    }

    // Start the interactive viewer
    await viewer.start();

    // After review is complete, ask if user wants to approve (if not auto-approved)
    if (!options.autoApprove) {
      const shouldApprove = await confirm({
        message: `Do you want to approve PR #${pullNumber}?`,
        defaultValue: true,
        status: 'info',
      });

      if (shouldApprove) {
        const approved = await repositoryService.approvePullRequest(
          owner,
          repoName,
          pullNumber,
          options.comment || 'LGTM 👍',
        );

        if (approved) {
          console.log(chalk.green(`\n✅ Successfully approved PR #${pullNumber}: "${pr.title}"`));
        } else {
          console.log(chalk.red(`\n❌ Failed to approve PR #${pullNumber}`));
        }
      }
    }

    return true;
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    return false;
  }
}
