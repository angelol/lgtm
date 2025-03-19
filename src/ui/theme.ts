/**
 * UI Theme Management
 * Provides color themes and styling utilities for the CLI application
 */

import chalk from 'chalk';
import { ColorTheme, StatusType } from './types.js';

/**
 * Default color theme for the application
 */
export const defaultTheme: ColorTheme = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  muted: '#6c757d',
  highlight: '#f8f9fa',
  normal: '#ffffff',
  subtle: '#adb5bd',
  background: '#343a40',
};

/**
 * Dark theme option
 */
export const darkTheme: ColorTheme = {
  primary: '#61afef',
  secondary: '#abb2bf',
  success: '#98c379',
  warning: '#e5c07b',
  error: '#e06c75',
  info: '#56b6c2',
  muted: '#5c6370',
  highlight: '#ffffff',
  normal: '#abb2bf',
  subtle: '#828997',
  background: '#282c34',
};

/**
 * High contrast theme for better accessibility
 */
export const highContrastTheme: ColorTheme = {
  primary: '#1e90ff',
  secondary: '#c0c0c0',
  success: '#00cc00',
  warning: '#ffcc00',
  error: '#ff0000',
  info: '#00ccff',
  muted: '#a0a0a0',
  highlight: '#ffffff',
  normal: '#ffffff',
  subtle: '#d0d0d0',
  background: '#000000',
};

// Current active theme
let activeTheme: ColorTheme = defaultTheme;

/**
 * Gets the current active theme
 */
export const getTheme = (): ColorTheme => activeTheme;

/**
 * Sets the active theme
 */
export const setTheme = (theme: ColorTheme): void => {
  activeTheme = theme;
};

/**
 * Gets a color from the current theme
 */
export const getColor = (color: keyof ColorTheme): string => {
  return activeTheme[color];
};

/**
 * Gets the appropriate status color based on the status type
 */
export const getStatusColor = (status: StatusType): string => {
  switch (status) {
    case 'success':
      return activeTheme.success;
    case 'warning':
      return activeTheme.warning;
    case 'error':
      return activeTheme.error;
    case 'info':
      return activeTheme.info;
    case 'pending':
      return activeTheme.secondary;
    case 'neutral':
    default:
      return activeTheme.muted;
  }
};

/**
 * Gets a chalk instance with the specified color from the active theme
 */
export const themeChalk = (color: keyof ColorTheme) => {
  return chalk.hex(getColor(color));
};

/**
 * Gets a chalk instance for the specified status
 */
export const statusChalk = (status: StatusType) => {
  return chalk.hex(getStatusColor(status));
};

/**
 * Status symbols for various states
 */
export const statusSymbol = (status: StatusType): string => {
  switch (status) {
    case 'success':
      return '✓';
    case 'warning':
      return '⚠';
    case 'error':
      return '✖';
    case 'info':
      return 'ℹ';
    case 'pending':
      return '⏳';
    case 'neutral':
    default:
      return '•';
  }
};

/**
 * Returns the appropriate colored status symbol
 */
export const coloredStatusSymbol = (status: StatusType): string => {
  return statusChalk(status)(statusSymbol(status));
};
