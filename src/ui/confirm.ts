/**
 * Confirmation Prompts
 * Implementation of confirmation dialogs
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getTheme } from './theme.js';
import { ColorTheme, StatusType } from './types.js';
import { formatCiStatus } from './utils.js';

/**
 * Confirmation prompt options
 */
export interface ConfirmOptions {
  /** Confirmation message */
  message: string;
  /** Default value (true = Yes, false = No) */
  defaultValue?: boolean;
  /** Status indicator for the prompt (affects color) */
  status?: StatusType;
  /** Theme overrides */
  theme?: ColorTheme;
}

/**
 * Shows a basic confirmation prompt
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const theme = options.theme || getTheme();
  const defaultValue = options.defaultValue !== undefined ? options.defaultValue : false;
  
  // Colorize message based on status
  let colorizedMessage = options.message;
  
  if (options.status) {
    const colorKey = statusToColorKey(options.status);
    colorizedMessage = chalk.hex(theme[colorKey])(options.message);
  }
  
  const { answer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'answer',
      message: colorizedMessage,
      default: defaultValue
    }
  ]);
  
  return answer;
}

/**
 * Shows a confirmation prompt for approving a PR with failing CI
 */
export async function confirmFailingCi(prNumber: number, prTitle: string): Promise<boolean> {
  const theme = getTheme();
  const ciStatus = formatCiStatus('failure');
  
  const message = [
    chalk.hex(theme.warning)(`⚠️  Warning: CI checks are failing for PR #${prNumber}`),
    `Title: ${prTitle}`,
    `Status: ${ciStatus}`,
    'Do you still want to approve this PR?'
  ].join('\n');
  
  return confirm({
    message,
    defaultValue: false,
    status: 'warning'
  });
}

/**
 * Shows a dangerous action confirmation
 */
export async function confirmDangerousAction(action: string, details?: string): Promise<boolean> {
  const theme = getTheme();
  
  let message = chalk.hex(theme.error)(`⚠️  Warning: You are about to ${action}`);
  
  if (details) {
    message += `\n${details}`;
  }
  
  message += '\nAre you sure you want to continue?';
  
  return confirm({
    message,
    defaultValue: false,
    status: 'error'
  });
}

/**
 * Maps status type to theme color key
 */
function statusToColorKey(status: StatusType): keyof ColorTheme {
  switch (status) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
      return 'info';
    case 'pending':
      return 'warning';
    case 'neutral':
    default:
      return 'normal';
  }
} 