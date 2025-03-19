#!/usr/bin/env node

/**
 * LGTM CLI - Main entry point
 * A CLI tool for approving GitHub pull requests from the terminal.
 */

import { Command } from 'commander';
import { verifyNodeVersion } from './utils/version.js';
import chalk from 'chalk';
import { config } from './config/index.js';
import { registerAuthCommands } from './auth/commands/index.js';
import { authService } from './auth/index.js';
import { 
  approvePullRequest as _approvePullRequest, 
  listPullRequests, 
  displayPullRequests,
  showPrActionMenu 
} from './github/index.js';

/**
 * Main entry point function
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  // Verify Node.js version
  verifyNodeVersion();
  
  const program = new Command();
  
  // Set up basic program information
  program
    .name('lgtm')
    .description('A CLI tool to approve GitHub PRs with a delightful UX')
    .version('0.1.0');
  
  // Default command (no arguments)
  program
    .argument('[pr]', 'Pull request number to approve')
    .option('-l, --list', 'List open pull requests')
    .option('-r, --review', 'Review pull request changes before approval')
    .option('-d, --description', 'View pull request description')
    .option('-o, --open', 'Open pull request in browser')
    .option('-f, --force', 'Force approval even with failing CI')
    .option('-c, --comment <comment>', 'Provide a custom approval comment')
    .action(async (pr, options) => {
      // For now, just display the command
      console.log(chalk.green('Welcome to LGTM CLI!'));
      
      // Check if authenticated
      const isAuthenticated = await authService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log(`${chalk.yellow('✨')} Welcome to LGTM! To get started, you need to authenticate with GitHub.\n`);
        
        // Trigger the login flow
        try {
          const loginCommand = program.commands.find(cmd => cmd.name() === 'auth')
            ?.commands.find(cmd => cmd.name() === 'login');
          
          if (loginCommand) {
            await loginCommand.parseAsync([], { from: 'user' });
          } else {
            console.error(`${chalk.red('Error:')} Could not find login command.`);
            process.exit(1);
          }
        } catch (error) {
          console.error(`${chalk.red('Error:')} ${(error as Error).message}`);
          process.exit(1);
        }
        
        console.log('\nNow you can use LGTM to approve pull requests!');
        return;
      }
      
      // Non-Interactive List Mode
      if (options.list) {
        try {
          const pullRequests = await listPullRequests({ interactive: false });
          if (Array.isArray(pullRequests) && pullRequests.length > 0) {
            displayPullRequests(pullRequests);
          }
          return;
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      }
      
      // Handle PR approval if a PR number was provided
      if (pr) {
        try {
          // Extract options for PR actions
          const actionOptions = {
            force: options.force || false,
            comment: options.comment
          };
          
          // Based on options, decide what to do with this PR
          if (options.review) {
            console.log(chalk.yellow(`Review mode for PR #${pr} coming soon`));
            return;
          }
          
          if (options.description) {
            console.log(chalk.yellow(`Description view for PR #${pr} coming soon`));
            return;
          }
          
          if (options.open) {
            console.log(chalk.yellow(`Opening PR #${pr} in browser coming soon`));
            return;
          }
          
          // Default: Show PR action menu
          const success = await showPrActionMenu(Number(pr), actionOptions);
          
          // Exit with appropriate code based on success
          if (!success) {
            process.exit(1);
          }
          
          return;
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      } else {
        // Interactive PR selection mode (default with no arguments)
        try {
          const selectedPr = await listPullRequests({ interactive: true });
          
          if (typeof selectedPr === 'number') {
            // Show PR action menu for the selected PR
            const actionOptions = {
              force: options.force || false,
              comment: options.comment
            };
            
            const success = await showPrActionMenu(selectedPr, actionOptions);
            
            // Exit with appropriate code based on success
            if (!success) {
              process.exit(1);
            }
          }
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      }
    });
  
  // Auth command group
  const authCommand = program
    .command('auth')
    .description('Manage GitHub authentication');
  
  // Register auth commands
  registerAuthCommands(authCommand);
  
  // Config command group
  const configCommand = program
    .command('config')
    .description('Manage configuration');
  
  configCommand
    .command('get [key]')
    .description('Get a configuration value')
    .action((key) => {
      if (!key) {
        console.log(config.getAll());
      } else {
        const value = config.get(key);
        console.log(`${key}:`, value);
      }
    });
  
  configCommand
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key, value) => {
      // Try to parse the value as JSON, fall back to string if not valid JSON
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        parsedValue = value;
      }
      
      config.set(key, parsedValue);
      console.log(`Set ${key} to:`, parsedValue);
    });
  
  configCommand
    .command('reset [key]')
    .description('Reset configuration to defaults')
    .action((key) => {
      if (!key) {
        config.reset();
        console.log('Configuration reset to defaults');
      } else {
        const defaultValue = key.includes('.')
          ? undefined // Can't easily get nested default values
          : (config as any).DEFAULT_CONFIG?.[key];
        
        if (defaultValue !== undefined) {
          config.set(key, defaultValue);
          console.log(`Reset ${key} to default:`, defaultValue);
        } else {
          config.delete(key);
          console.log(`Removed ${key} from configuration`);
        }
      }
    });
  
  // Parse arguments
  program.parse();
}

// Run the main function
main().catch(error => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
}); 