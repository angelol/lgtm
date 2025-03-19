/**
 * Authentication Logout Command
 *
 * Handles the `lgtm auth logout` command.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { authService } from '../services/auth-service.js';

/**
 * Add the logout command to the auth command
 *
 * @param authCommand - The parent auth command
 */
export function addLogoutCommand(authCommand: Command): void {
  authCommand
    .command('logout')
    .description('Log out of GitHub')
    .action(async () => {
      try {
        const status = await authService.getAuthStatus();

        if (!status) {
          console.log(`${chalk.yellow('!')} Not currently logged in to GitHub.`);
          return;
        }

        // Confirm logout
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to log out from ${status.login}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          console.log('Logout cancelled.');
          return;
        }

        const success = await authService.logout();

        if (success) {
          console.log(`${chalk.green('✓')} Successfully logged out.`);
        } else {
          console.log(`${chalk.red('✗')} Failed to log out. Please try again.`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`${chalk.red('Error:')} ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
