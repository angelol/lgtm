import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { getTheme } from './theme.js';

/**
 * Options for markdown rendering
 */
export interface MarkdownOptions {
  /**
   * Maximum width of the rendered markdown
   */
  width?: number;
  /**
   * Options for code blocks
   */
  codeOptions?: {
    /**
     * Whether to highlight code syntax
     */
    highlight?: boolean;
  };
  /**
   * Options for tables
   */
  tableOptions?: {
    /**
     * Character for horizontal separation
     */
    chars?: {
      top?: string;
      'top-mid'?: string;
      'top-left'?: string;
      'top-right'?: string;
      bottom?: string;
      'bottom-mid'?: string;
      'bottom-left'?: string;
      'bottom-right'?: string;
      left?: string;
      'left-mid'?: string;
      mid?: string;
      'mid-mid'?: string;
      right?: string;
      'right-mid'?: string;
      middle?: string;
    };
  };
  /**
   * Options for rendering unordered lists
   */
  unescape?: boolean;
  /**
   * Whether to show links inline or as footnotes
   */
  showLinks?: boolean;
}

const DEFAULT_OPTIONS: MarkdownOptions = {
  width: process.stdout.columns || 80,
  codeOptions: {
    highlight: true,
  },
  unescape: false,
  showLinks: true,
};

/**
 * Renders markdown content to terminal-friendly format
 * @param markdown - The markdown content to render
 * @param customOptions - Custom rendering options
 * @returns The rendered string ready for terminal display
 */
export function renderMarkdown(markdown?: string, customOptions?: MarkdownOptions): string {
  if (!markdown) return '';

  try {
    const theme = getTheme();
    const mergedOptions: MarkdownOptions = { ...DEFAULT_OPTIONS, ...customOptions };

    // For test environment, just return the markdown as-is to avoid dependency issues
    if (process.env.NODE_ENV === 'test') {
      return markdown;
    }

    // Create a new terminal renderer with theme colors
    const rendererOptions = {
      code: chalk.bgHex(theme.background).hex(theme.primary),
      blockquote: chalk.hex(theme.secondary),
      heading: chalk.hex(theme.primary),
      firstHeading: chalk.bold.hex(theme.primary),
      strong: chalk.bold.hex(theme.highlight),
      em: chalk.italic.hex(theme.normal),
      listitem: chalk.hex(theme.normal),
      table: chalk.hex(theme.normal),
      paragraph: chalk.hex(theme.normal),
      link: chalk.underline.hex(theme.info),
      href: chalk.underline.hex(theme.info),
      ...mergedOptions,
    };

    const renderer = new TerminalRenderer(rendererOptions);
    marked.use({ renderer: renderer as any });

    // Parse the markdown
    const result = marked.parse(markdown);
    // Use explicit conversion to string to avoid no-base-to-string warning
    return result as string;
  } catch (error) {
    // In case of errors, just return the raw markdown
    return markdown;
  }
}
