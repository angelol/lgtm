/**
 * UI Framework Types
 * Defines the core types and interfaces for the UI component system
 */

/**
 * Color theme configuration for consistent styling
 */
export interface ColorTheme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  muted: string;
  highlight: string;
  normal: string;
  subtle: string;
  background: string;
}

/**
 * Status indicator for various UI elements
 */
export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral';

/**
 * Size options for UI components
 */
export type Size = 'small' | 'medium' | 'large';

/**
 * Basic UI component props
 */
export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: Record<string, string | number>;
}

/**
 * Progress indicator props
 */
export interface ProgressProps extends BaseComponentProps {
  type?: 'spinner' | 'bar' | 'dots';
  message?: string;
  value?: number;
  total?: number;
  status?: StatusType;
  size?: Size;
}

/**
 * Terminal dimensions
 */
export interface TerminalDimensions {
  width: number;
  height: number;
}

/**
 * Container layout options
 */
export type ContainerLayout = 'centered' | 'left-aligned' | 'right-aligned' | 'full-width';

/**
 * Box style configuration
 */
export interface BoxStyle extends BaseComponentProps {
  padding?: number | [number, number] | [number, number, number, number];
  margin?: number | [number, number] | [number, number, number, number];
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'none';
  borderColor?: keyof ColorTheme;
  backgroundColor?: keyof ColorTheme;
  textColor?: keyof ColorTheme;
  align?: 'left' | 'center' | 'right';
  title?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  width?: number | 'auto' | 'full';
  height?: number | 'auto';
  maxWidth?: number;
  overflow?: 'wrap' | 'truncate' | 'scroll';
}

/**
 * Text style options
 */
export interface TextStyle {
  color?: keyof ColorTheme;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
  inverse?: boolean;
  size?: Size;
}

/**
 * Error message level
 */
export type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info';
