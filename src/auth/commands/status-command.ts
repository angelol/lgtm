/**
 * Authentication Status Command
 *
 * Handles the `lgtm auth status` command.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { authService } from '../services/auth-service.js';

/**
 * Add the status command to the auth command
 *
 * @param authCommand - The parent auth command
 */
export function addStatusCommand(authCommand: Command): void {
  authCommand
    .command('status')
    .description('View authentication status')
    .action(async () => {
      try {
        const status = await authService.getAuthStatus();

        if (!status) {
          console.log(`${chalk.yellow('!')} Not logged in to GitHub.`);
          console.log(`\nRun ${chalk.cyan('lgtm auth login')} to authenticate.`);
          return;
        }

        const boxContent = `
${chalk.green('✓')} Logged in to GitHub as ${chalk.bold(status.login)}
${status.name ? `Name: ${status.name}` : ''}
`;

        console.log(
          boxen(boxContent.trim(), {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'green',
          }),
        );
      } catch (error) {
        console.error(`${chalk.red('Error:')} ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
