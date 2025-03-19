/**
 * Text Formatting Utilities
 * Provides functions for formatting and styling text in the terminal
 */

import chalk from 'chalk';
import { TextStyle } from './types.js';
import { themeChalk } from './theme.js';

/**
 * Truncates text to the specified length if it exceeds that length
 */
export const truncate = (text: string, maxLength: number, ellipsis = '...'): string => {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};

/**
 * Left-pads text to reach the specified length
 */
export const padLeft = (text: string, length: number, char = ' '): string => {
  return text.padStart(length, char);
};

/**
 * Right-pads text to reach the specified length
 */
export const padRight = (text: string, length: number, char = ' '): string => {
  return text.padEnd(length, char);
};

/**
 * Centers text within the specified length
 */
export const center = (text: string, length: number, char = ' '): string => {
  if (text.length >= length) {
    return text;
  }
  
  const leftPadding = Math.floor((length - text.length) / 2);
  const rightPadding = length - text.length - leftPadding;
  
  return char.repeat(leftPadding) + text + char.repeat(rightPadding);
};

/**
 * Applies text styling based on the provided style object
 */
export const styleText = (text: string, style: TextStyle): string => {
  let styledText = text;
  
  if (style.color) {
    styledText = themeChalk(style.color)(styledText);
  }
  
  if (style.bold) {
    styledText = chalk.bold(styledText);
  }
  
  if (style.italic) {
    styledText = chalk.italic(styledText);
  }
  
  if (style.underline) {
    styledText = chalk.underline(styledText);
  }
  
  if (style.strikethrough) {
    styledText = chalk.strikethrough(styledText);
  }
  
  if (style.dim) {
    styledText = chalk.dim(styledText);
  }
  
  if (style.inverse) {
    styledText = chalk.inverse(styledText);
  }
  
  return styledText;
};

/**
 * Creates a heading styled text
 */
export const heading = (text: string, level: 1 | 2 | 3 = 1): string => {
  switch (level) {
    case 1:
      return styleText(text, { bold: true, color: 'primary', size: 'large' });
    case 2:
      return styleText(text, { bold: true, color: 'secondary', size: 'medium' });
    case 3:
    default:
      return styleText(text, { bold: true, size: 'small' });
  }
};

/**
 * Formats a list of items with optional bullet points
 */
export const formatList = (items: string[], bulletPoint = '•'): string => {
  return items.map(item => `${bulletPoint} ${item}`).join('\n');
};

/**
 * Wraps text to fit within a specified width
 */
export const wrapText = (text: string, width = 80): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  words.forEach(word => {
    if ((currentLine + word).length <= width) {
      currentLine += (currentLine.length === 0 ? '' : ' ') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
};

/**
 * Get the visual width of a string accounting for ANSI escape sequences
 */
export const getVisualLength = (text: string): number => {
  // Remove ANSI escape sequences when calculating length
  const stripped = text.replace(/\u001b\[.*?m/g, '');
  return stripped.length;
};

/**
 * Create a horizontal separator line
 */
export const separator = (width = 80, char = '─'): string => {
  return char.repeat(width);
}; 