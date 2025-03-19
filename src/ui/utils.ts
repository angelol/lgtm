/**
 * UI Utilities
 * Common utility functions for UI operations
 */

import { TerminalDimensions } from './types.js';

/**
 * Gets the current terminal size
 */
export const getTerminalSize = (): TerminalDimensions => {
  // Default to a reasonable fallback size if process.stdout is not available
  const columns = process.stdout?.columns || 80;
  const rows = process.stdout?.rows || 24;
  
  return {
    width: columns,
    height: rows,
  };
};

/**
 * Clears the terminal screen
 */
export const clearScreen = (): void => {
  process.stdout.write('\x1Bc');
};

/**
 * Moves the cursor to home position (0,0)
 */
export const moveCursorToHome = (): void => {
  process.stdout.write('\x1B[0;0H');
};

/**
 * Moves the cursor up by n lines
 */
export const moveCursorUp = (lines = 1): void => {
  process.stdout.write(`\x1B[${lines}A`);
};

/**
 * Moves the cursor down by n lines
 */
export const moveCursorDown = (lines = 1): void => {
  process.stdout.write(`\x1B[${lines}B`);
};

/**
 * Detects if the terminal supports color
 */
export const supportsColor = (): boolean => {
  if (process.env.FORCE_COLOR !== undefined) {
    return process.env.FORCE_COLOR !== '0';
  }

  if (process.env.NODE_DISABLE_COLORS !== undefined) {
    return false;
  }

  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  if (process.env.TERM === 'dumb') {
    return false;
  }

  return process.stdout.isTTY === true;
};

/**
 * Detects if the terminal supports Unicode
 */
export const supportsUnicode = (): boolean => {
  if (process.platform === 'win32') {
    return process.env.CI === 'true' || 
           process.env.WT_SESSION !== undefined || // Windows Terminal
           process.env.TERM_PROGRAM === 'vscode' ||
           process.env.TERM?.includes('xterm') === true;
  }
  
  return true;
};

/**
 * Returns either the Unicode character or a fallback for terminals 
 * that don't support Unicode
 */
export const safeSymbol = (unicode: string, fallback: string): string => {
  return supportsUnicode() ? unicode : fallback;
};

/**
 * Converts a percentage to a visual bar
 */
export const percentageToBar = (percentage: number, length = 10, filledChar = '█', emptyChar = '░'): string => {
  // Ensure percentage is between 0 and 1
  const clampedPercentage = Math.max(0, Math.min(1, percentage));
  const filledLength = Math.round(clampedPercentage * length);
  const emptyLength = length - filledLength;
  
  return filledChar.repeat(filledLength) + emptyChar.repeat(emptyLength);
}; 