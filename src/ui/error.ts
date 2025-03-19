/**
 * Error Formatting Module
 * Provides utilities for formatting and displaying error messages
 */

import chalk from 'chalk';
import { ErrorLevel } from './types.js';
import { themeChalk, statusChalk, statusSymbol } from './theme.js';
import { createBox, errorBox, warningBox, infoBox } from './box.js';
import { separator } from './text.js';

/**
 * Gets the appropriate color for the error level
 */
const getErrorColor = (level: ErrorLevel): string => {
  switch (level) {
    case 'fatal':
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

/**
 * Gets the error prefix symbol for the specified level
 */
const getErrorPrefix = (level: ErrorLevel): string => {
  switch (level) {
    case 'fatal':
      return statusChalk('error')('✖');
    case 'error':
      return statusChalk('error')('✖');
    case 'warning':
      return statusChalk('warning')('⚠');
    case 'info':
    default:
      return statusChalk('info')('ℹ');
  }
};

/**
 * Gets the title for the error box based on the level
 */
const getErrorTitle = (level: ErrorLevel): string => {
  switch (level) {
    case 'fatal':
      return 'FATAL ERROR';
    case 'error':
      return 'ERROR';
    case 'warning':
      return 'WARNING';
    case 'info':
    default:
      return 'INFORMATION';
  }
};

/**
 * Formats an error message with detailed information
 */
export const formatError = (
  message: string,
  level: ErrorLevel = 'error',
  details?: string,
  suggestions?: string[]
): string => {
  const color = getErrorColor(level);
  const prefix = getErrorPrefix(level);
  const title = getErrorTitle(level);
  
  let content = `${prefix} ${message}`;
  
  if (details) {
    content += `\n\n${details}`;
  }
  
  if (suggestions && suggestions.length > 0) {
    content += '\n\n' + themeChalk('secondary')('Suggestions:');
    content += '\n' + suggestions.map(s => `• ${s}`).join('\n');
  }
  
  switch (level) {
    case 'error':
    case 'fatal':
      return errorBox(content, title);
    case 'warning':
      return warningBox(content, title);
    case 'info':
    default:
      return infoBox(content, title);
  }
};

/**
 * Formats a simple inline error message
 */
export const formatInlineError = (message: string, level: ErrorLevel = 'error'): string => {
  const prefix = getErrorPrefix(level);
  return `${prefix} ${message}`;
};

/**
 * Error handler for command line errors
 */
export const handleCliError = (
  error: Error | string,
  level: ErrorLevel = 'error',
  suggestions?: string[]
): void => {
  const message = typeof error === 'string' ? error : error.message;
  const details = typeof error === 'object' && error.stack ? error.stack.split('\n').slice(1).join('\n') : undefined;
  
  // Only show stack trace for fatal errors or when in development
  const formattedError = formatError(
    message,
    level,
    level === 'fatal' || process.env.NODE_ENV === 'development' ? details : undefined,
    suggestions
  );
  
  console.error(formattedError);
  
  // Exit process on fatal errors
  if (level === 'fatal') {
    process.exit(1);
  }
};

/**
 * Creates a validation error message
 */
export const validationError = (message: string, field?: string): string => {
  const prefix = statusChalk('error')(statusSymbol('error'));
  let errorMessage = `${prefix} ${message}`;
  
  if (field) {
    errorMessage = `${prefix} ${field}: ${message}`;
  }
  
  return errorMessage;
};

/**
 * Creates a multi-line validation error message for multiple fields
 */
export const multiValidationError = (errors: Record<string, string>): string => {
  const prefix = statusChalk('error')(statusSymbol('error'));
  const lines = Object.entries(errors).map(([field, message]) => `${prefix} ${field}: ${message}`);
  
  return lines.join('\n');
}; 