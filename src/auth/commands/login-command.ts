/**
 * Authentication Login Command
 *
 * Handles the `lgtm auth login` command.
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { authService, AuthMethod } from '../services/auth-service.js';

/**
 * Add the login command to the auth command
 *
 * @param authCommand - The parent auth command
 */
export function addLoginCommand(authCommand: Command): void {
  authCommand
    .command('login')
    .description('Log in to GitHub')
    .action(async () => {
      try {
        // Check if already authenticated
        const existingStatus = await authService.getAuthStatus();

        if (existingStatus) {
          console.log(`Already logged in as ${chalk.green(existingStatus.login)}`);

          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Do you want to login again with a different account?',
              default: false,
            },
          ]);

          if (!confirm) {
            return;
          }

          // Logout before continuing
          await authService.logout();
        }

        // Prompt for authentication method
        const { method } = await inquirer.prompt([
          {
            type: 'list',
            name: 'method',
            message: 'How would you like to authenticate?',
            choices: [
              {
                name: 'Login with a web browser',
                value: AuthMethod.Browser,
              },
              {
                name: 'Paste an authentication token',
                value: AuthMethod.Token,
              },
            ],
          },
        ]);

        let user;

        if (method === AuthMethod.Browser) {
          user = await authService.loginWithBrowser();
        } else {
          // Prompt for token
          const { token } = await inquirer.prompt([
            {
              type: 'password',
              name: 'token',
              message: 'Enter your GitHub personal access token:',
              validate: (input: string): string | boolean => {
                if (!input) return 'Token is required';
                if (input.length < 10) return 'Token seems too short';
                return true;
              },
            },
          ]);

          user = await authService.loginWithToken(token);
        }

        console.log(
          `\n${chalk.green('✓')} Authentication complete. You're now logged in as ${chalk.bold(user.login)}`,
        );
      } catch (error) {
        console.error(`${chalk.red('Error:')} ${(error as Error).message}`);
        process.exit(1);
      }
    });
}
