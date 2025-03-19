/**
 * Box Component Utility
 * Provides functions for creating styled boxes in the terminal
 */

import boxen from 'boxen';
import { getColor, themeChalk } from './theme.js';
import { BoxStyle } from './types.js';
import { getTerminalSize } from './utils.js';
import { center, wrapText } from './text.js';

// Define the BoxenOptions type to match the boxen library structure
interface BoxenOptions {
  padding?: { top: number; right: number; bottom: number; left: number };
  margin?: { top: number; right: number; bottom: number; left: number };
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  borderColor?: string;
  backgroundColor?: string;
  title?: string;
  titleAlignment?: 'center' | 'left' | 'right';
  width?: number;
  height?: number;
  float?: 'left' | 'right' | 'center';
  dimBorder?: boolean;
}

/**
 * Maps BoxStyle border style to boxen border style
 */
const mapBorderStyle = (style?: BoxStyle['borderStyle']): BoxenOptions['borderStyle'] => {
  switch (style) {
    case 'single':
      return 'single';
    case 'double':
      return 'double';
    case 'round':
      return 'round';
    case 'bold':
      return 'bold';
    case 'none':
      return 'none';
    default:
      return 'single';
  }
};

/**
 * Normalizes padding to boxen format
 */
const normalizePadding = (
  padding?: BoxStyle['padding'],
): { top: number; right: number; bottom: number; left: number } | undefined => {
  if (padding === undefined) {
    return undefined;
  }

  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }

  if (Array.isArray(padding)) {
    if (padding.length === 2) {
      return { top: padding[0], right: padding[1], bottom: padding[0], left: padding[1] };
    }
    if (padding.length === 4) {
      return { top: padding[0], right: padding[1], bottom: padding[2], left: padding[3] };
    }
  }

  return undefined;
};

/**
 * Creates a styled box with the given content and style options
 */
export const createBox = (content: string, style: BoxStyle = {}): string => {
  const { width: termWidth } = getTerminalSize();

  // Set default styles
  const {
    padding = 1,
    margin = 0,
    borderStyle = 'single',
    borderColor = 'primary',
    backgroundColor,
    textColor,
    align = 'left',
    title,
    titleAlignment = 'center',
    width = 'auto',
    maxWidth,
    overflow = 'wrap',
  } = style;

  // Calculate box width
  let boxWidth: number | undefined;
  if (width === 'full') {
    boxWidth = termWidth;
  } else if (width !== 'auto') {
    boxWidth = width;
  }

  // Apply max width constraint
  if (maxWidth !== undefined && (boxWidth === undefined || boxWidth > maxWidth)) {
    boxWidth = maxWidth;
  }

  // Wrap content if needed
  let processedContent = content;
  if (overflow === 'wrap' && boxWidth !== undefined) {
    // Adjust for padding and border
    const contentWidth = boxWidth - 2; // Subtract border width
    const wrappedLines = wrapText(content, contentWidth);
    processedContent = wrappedLines.join('\n');
  }

  // Handle text alignment
  if (align === 'center' && boxWidth !== undefined) {
    const contentWidth = boxWidth - 2; // Subtract border width
    const lines = processedContent.split('\n');
    processedContent = lines.map(line => center(line, contentWidth)).join('\n');
  }

  // Apply text color
  if (textColor) {
    processedContent = themeChalk(textColor)(processedContent);
  }

  // Create box options
  const boxOptions: BoxenOptions = {
    padding: normalizePadding(padding),
    margin: normalizePadding(margin),
    borderStyle: mapBorderStyle(borderStyle),
    title: title,
    titleAlignment: titleAlignment,
    width: boxWidth,
  };

  // Apply border color
  if (borderColor) {
    boxOptions.borderColor = getColor(borderColor);
  }

  // Apply background color
  if (backgroundColor) {
    boxOptions.backgroundColor = getColor(backgroundColor);
  }

  return boxen(processedContent, boxOptions);
};

/**
 * Creates an info box with standard styling
 */
export const infoBox = (content: string, title?: string): string => {
  return createBox(content, {
    borderColor: 'info',
    title,
    titleAlignment: 'center',
    borderStyle: 'round',
    padding: [1, 2],
  });
};

/**
 * Creates a success box with standard styling
 */
export const successBox = (content: string, title?: string): string => {
  return createBox(content, {
    borderColor: 'success',
    title,
    titleAlignment: 'center',
    borderStyle: 'round',
    padding: [1, 2],
  });
};

/**
 * Creates a warning box with standard styling
 */
export const warningBox = (content: string, title?: string): string => {
  return createBox(content, {
    borderColor: 'warning',
    title,
    titleAlignment: 'center',
    borderStyle: 'round',
    padding: [1, 2],
  });
};

/**
 * Creates an error box with standard styling
 */
export const errorBox = (content: string, title?: string): string => {
  return createBox(content, {
    borderColor: 'error',
    title,
    titleAlignment: 'center',
    borderStyle: 'round',
    padding: [1, 2],
  });
};
