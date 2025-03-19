/**
 * Selection Interface
 * Implementation of interactive selection components
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { formatDistanceToNow } from '../utils/date.js';
import { PullRequest } from '../github/services/repository-service.js';
import { formatCiStatus } from './utils.js';
import { ColorTheme } from './types.js';
import { getTheme } from './theme.js';

/**
 * Options for PR selection interface
 */
export interface PrSelectionOptions {
  title?: string;
  message?: string;
  pageSize?: number;
  theme?: ColorTheme;
}

/**
 * Format a pull request for display in the selection list
 */
function formatPullRequestChoice(pr: PullRequest, theme: ColorTheme): string {
  const ciStatusText = formatCiStatus(pr.ciStatus);
  const timeAgo = formatDistanceToNow(new Date(pr.createdAt));

  return `${chalk.hex(theme.highlight)('#' + pr.number)} | ${pr.title} | ${chalk.hex(theme.secondary)('@' + pr.author.login)} | ${chalk.hex(theme.muted)(timeAgo)} | ${ciStatusText}`;
}

/**
 * Display an interactive list of PRs for selection
 * @returns The selected PR number or null if cancelled
 */
export async function selectPullRequest(
  pullRequests: PullRequest[],
  options: PrSelectionOptions = {},
): Promise<number | null> {
  const theme = options.theme || getTheme();
  const pageSize = options.pageSize || 10;

  // Add a cancel option
  const choices = [
    ...pullRequests.map(pr => ({
      name: formatPullRequestChoice(pr, theme),
      value: pr.number,
      short: `PR #${pr.number}`,
    })),
    new inquirer.Separator(),
    { name: 'Cancel', value: null },
  ];

  const { selectedPr } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedPr',
      message: options.message || 'Select a PR to approve:',
      pageSize,
      choices,
    },
  ]);

  return selectedPr;
}
