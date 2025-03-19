/**
 * Error formatting utilities for consistent error display in the terminal
 */

import { getTheme } from './theme.js';
import { errorBox, warningBox, infoBox } from './box.js';
import { StatusType } from './types.js';

/**
 * Error level for message formatting
 */
export type ErrorLevel = 'error' | 'warning' | 'info' | 'success';

/**
 * Get color for error level from theme
 * This is used in other functions that rely on this helper.
 */
export function getErrorColor(level: ErrorLevel): string {
  const theme = getTheme();
  
  switch (level) {
    case 'error':
      return theme.error;
    case 'warning':
      return theme.warning;
    case 'info':
      return theme.info;
    case 'success':
      return theme.success;
    default:
      return theme.normal;
  }
}

/**
 * Format an error message with appropriate styling
 */
export function formatError(message: string, level: ErrorLevel = 'error'): string {
  switch (level) {
    case 'error':
      return errorBox(message);
    case 'warning':
      return warningBox(message);
    case 'info':
      return infoBox(message);
    default:
      return message;
  }
}

/**
 * Format an error message with level label
 */
export function formatErrorWithLabel(message: string, level: ErrorLevel = 'error'): string {
  switch (level) {
    case 'error':
      return errorBox(`Error: ${message}`);
    case 'warning':
      return warningBox(`Warning: ${message}`);
    case 'info':
      return infoBox(`Info: ${message}`);
    case 'success':
      return infoBox(`Success: ${message}`);
    default:
      return message;
  }
}

/**
 * Map StatusType to ErrorLevel
 */
export function statusToErrorLevel(status: StatusType): ErrorLevel {
  switch (status) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'success':
      return 'success';
    case 'pending':
      return 'info';
    default:
      return 'info';
  }
} 