/**
 * Interactive Menu Component
 * Implementation of interactive action menus
 */

import inquirer from 'inquirer';
import { getTheme } from './theme.js';
import { ColorTheme } from './types.js';

/**
 * Action menu item
 */
export interface MenuItem<T> {
  /** Display name of the menu item */
  name: string;
  /** Value returned when this item is selected */
  value: T;
  /** Short description of the action */
  description?: string;
  /** Whether this item is disabled (with optional reason) */
  disabled?: boolean | string;
}

/**
 * Options for action menu
 */
export interface ActionMenuOptions {
  /** Menu title */
  title?: string;
  /** Prompt message */
  message?: string;
  /** Number of items to display per page */
  pageSize?: number;
  /** Optional theme overrides */
  theme?: ColorTheme;
}

/**
 * Display an interactive action menu
 * @returns The selected action value or null if cancelled
 */
export async function showActionMenu<T>(
  actions: MenuItem<T>[],
  options: ActionMenuOptions = {}
): Promise<T | null> {
  const theme = options.theme || getTheme();
  const pageSize = options.pageSize || 8;
  
  // Ensure we have a cancel option
  const allChoices = [
    ...actions,
    new inquirer.Separator(),
    { name: 'Cancel', value: null }
  ];
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: options.message || 'What would you like to do?',
      pageSize,
      choices: allChoices
    }
  ]);
  
  return action;
} 