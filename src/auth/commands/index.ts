/**
 * Authentication Commands Module
 *
 * Registers all authentication-related commands.
 */

import { Command } from 'commander';
import { addLoginCommand } from './login-command.js';
import { addStatusCommand } from './status-command.js';
import { addLogoutCommand } from './logout-command.js';

/**
 * Register all authentication commands
 *
 * @param authCommand - The parent auth command
 */
export function registerAuthCommands(authCommand: Command): void {
  addLoginCommand(authCommand);
  addStatusCommand(authCommand);
  addLogoutCommand(authCommand);
}
