/**
 * Content Viewer Component
 * Implementation of paged content viewing for large text content
 */

import readline from 'readline';
import chalk from 'chalk';
import { getTheme } from './theme.js';
import { ColorTheme } from './types.js';
import { safeSymbol } from './utils.js';

/**
 * Content viewer options
 */
export interface ContentViewerOptions {
  /** Maximum height of the content area */
  maxHeight?: number;
  /** Title to display above the content */
  title?: string;
  /** Custom theme to use */
  theme?: ColorTheme;
  /** Custom key bindings */
  keyBindings?: Partial<ContentViewerKeyBindings>;
  /** Whether to display line numbers */
  showLineNumbers?: boolean;
  /** Whether to display a help footer */
  showHelp?: boolean;
  /** Whether to wrap long lines */
  wrapLines?: boolean;
  /** Additional actions to display in help */
  additionalActions?: Record<string, string>;
}

/**
 * Key bindings for the content viewer
 */
export interface ContentViewerKeyBindings {
  /** Key for next page */
  next: string[];
  /** Key for previous page */
  previous: string[];
  /** Key to quit viewing */
  quit: string[];
  /** Key to search content */
  search: string[];
  /** Key to toggle help */
  help: string[];
}

/**
 * Default key bindings
 */
const DEFAULT_KEY_BINDINGS: ContentViewerKeyBindings = {
  next: ['n', 'j', 'down', 'space'],
  previous: ['p', 'k', 'up', 'b'],
  quit: ['q', 'escape', 'ctrl+c'],
  search: ['/'],
  help: ['h'],
};

/**
 * Actions that can be taken with the content viewer
 */
export type ContentViewerAction = 'next' | 'previous' | 'quit' | 'search' | 'help' | string;

/**
 * Callback function called when an action is performed
 */
export type ContentViewerActionCallback = (action: ContentViewerAction) => void;

/**
 * Content viewer for displaying paged content with keyboard navigation
 */
export class ContentViewer {
  private content: string[];
  private options: ContentViewerOptions;
  private keyBindings: ContentViewerKeyBindings;
  private theme: ColorTheme;
  private currentLine: number = 0;
  private rl: readline.Interface | null = null;
  private isActive: boolean = false;
  private terminalHeight: number;
  private showingHelp: boolean = false;
  private actionListeners: ContentViewerActionCallback[] = [];

  /**
   * Create a new content viewer
   * @param content - The content to view, either as a string or an array of lines
   * @param options - Configuration options
   */
  constructor(content: string | string[], options: ContentViewerOptions = {}) {
    this.content = typeof content === 'string' ? content.split('\n') : content;
    this.options = options;
    this.theme = options.theme || getTheme();
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...options.keyBindings };
    this.terminalHeight = process.stdout.rows || 24;
  }

  /**
   * Start the interactive content viewer
   * @returns A promise that resolves when viewing is complete
   */
  async start(): Promise<void> {
    if (this.isActive) {
      return; // Already running
    }

    this.isActive = true;

    // Create readline interface with properly typed parameters
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    // Disable output to avoid interference with our rendering
    // @ts-expect-error - We're intentionally disabling output after creating the interface
    this.rl.output = null;

    // Put terminal in raw mode to capture keystrokes
    process.stdin.setRawMode?.(true);

    // Handle key presses
    process.stdin.on('keypress', this.handleKeyPress.bind(this));

    // Initial render
    this.render();

    // Return a promise that resolves when the viewer is closed
    return new Promise<void>(resolve => {
      this.once('quit', () => {
        this.close();
        resolve();
      });
    });
  }

  /**
   * Close the content viewer
   */
  close(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    // Restore terminal
    process.stdin.setRawMode?.(false);
    process.stdin.removeListener('keypress', this.handleKeyPress.bind(this));

    // Clear content from screen
    console.clear();
  }

  /**
   * Add a listener for content viewer actions
   * @param callback Function to call when an action occurs
   */
  on(action: ContentViewerAction | 'all', callback: ContentViewerActionCallback): void {
    this.actionListeners.push(a => {
      if (action === 'all' || a === action) {
        callback(a);
      }
    });
  }

  /**
   * Add a one-time listener for content viewer actions
   * @param action The action to listen for
   * @param callback Function to call when the action occurs
   */
  once(action: ContentViewerAction | 'all', callback: ContentViewerActionCallback): void {
    const wrappedCallback = (a: ContentViewerAction) => {
      if (action === 'all' || a === action) {
        // Remove this listener
        this.actionListeners = this.actionListeners.filter(
          listener => listener !== wrappedCallback,
        );
        callback(a);
      }
    };

    this.actionListeners.push(wrappedCallback);
  }

  /**
   * Trigger an action
   * @param action The action to trigger
   */
  private triggerAction(action: ContentViewerAction): void {
    // Call all listeners
    for (const listener of this.actionListeners) {
      listener(action);
    }

    // Handle built-in actions
    switch (action) {
      case 'next':
        this.nextPage();
        break;
      case 'previous':
        this.previousPage();
        break;
      case 'help':
        this.toggleHelp();
        break;
    }
  }

  /**
   * Handle keyboard input
   */
  private handleKeyPress(
    _str: string,
    key: { name: string; ctrl: boolean; meta: boolean; shift: boolean },
  ): void {
    if (!this.isActive || !key) {
      return;
    }

    const keyString = key.ctrl ? `ctrl+${key.name}` : key.name;

    // Check which action this key corresponds to
    for (const [action, keys] of Object.entries(this.keyBindings)) {
      if (keys.includes(key.name) || keys.includes(keyString)) {
        this.triggerAction(action);
        return;
      }
    }

    // Check for custom actions in additionalActions
    if (this.options.additionalActions && key.name && key.name.length === 1) {
      const customAction = Object.keys(this.options.additionalActions).find(k => k === key.name);
      if (customAction) {
        this.triggerAction(customAction);
        return;
      }
    }
  }

  /**
   * Move to the next page of content
   */
  nextPage(): void {
    const contentHeight = this.getContentHeight();
    const maxLine = Math.max(0, this.content.length - contentHeight);

    this.currentLine = Math.min(this.currentLine + contentHeight, maxLine);
    this.render();
  }

  /**
   * Move to the previous page of content
   */
  previousPage(): void {
    const contentHeight = this.getContentHeight();
    this.currentLine = Math.max(0, this.currentLine - contentHeight);
    this.render();
  }

  /**
   * Toggle display of help information
   */
  toggleHelp(): void {
    this.showingHelp = !this.showingHelp;
    this.render();
  }

  /**
   * Get the available height for content
   */
  private getContentHeight(): number {
    const maxHeight = this.options.maxHeight || this.terminalHeight;
    let reservedLines = 0;

    // Space for title
    if (this.options.title) {
      reservedLines += 2; // Title + empty line
    }

    // Space for controls footer
    reservedLines += 2; // Controls + empty line

    // Space for help if showing
    if (this.showingHelp || this.options.showHelp) {
      reservedLines += 4; // Help takes about 4 lines
    }

    return Math.max(5, maxHeight - reservedLines);
  }

  /**
   * Check if there is more content after the current view
   */
  hasNextPage(): boolean {
    return this.currentLine + this.getContentHeight() < this.content.length;
  }

  /**
   * Check if there is content before the current view
   */
  hasPreviousPage(): boolean {
    return this.currentLine > 0;
  }

  /**
   * Render the content viewer
   */
  render(): void {
    if (!this.isActive) {
      return;
    }

    console.clear();

    // Render title if present
    if (this.options.title) {
      console.log(chalk.bold.hex(this.theme.primary)(this.options.title));
      console.log();
    }

    // Calculate available height
    const contentHeight = this.getContentHeight();
    const visibleContent = this.content.slice(this.currentLine, this.currentLine + contentHeight);

    // Render content with line numbers if enabled
    if (this.options.showLineNumbers) {
      const maxLineNumberWidth = String(this.currentLine + contentHeight).length;

      visibleContent.forEach((line, i) => {
        const lineNumber = String(this.currentLine + i + 1).padStart(maxLineNumberWidth, ' ');
        console.log(`${chalk.hex(this.theme.muted)(lineNumber)} | ${line}`);
      });
    } else {
      visibleContent.forEach(line => console.log(line));
    }

    // Fill empty space if content is shorter than available height
    const emptyLines = contentHeight - visibleContent.length;
    for (let i = 0; i < emptyLines; i++) {
      console.log();
    }

    // Render controls
    console.log();
    console.log(this.renderControls());

    // Render help if enabled
    if (this.showingHelp || this.options.showHelp) {
      console.log();
      console.log(this.renderHelp());
    }
  }

  /**
   * Render navigation controls
   */
  private renderControls(): string {
    const { hasNextPage, hasPreviousPage } = this;

    const prevBtn = hasPreviousPage()
      ? chalk.hex(this.theme.primary)(`${safeSymbol('◀', '<')} Prev (p)`)
      : chalk.hex(this.theme.muted)(`${safeSymbol('◀', '<')} Prev (p)`);

    const nextBtn = hasNextPage()
      ? chalk.hex(this.theme.primary)(`Next (n) ${safeSymbol('▶', '>')}`)
      : chalk.hex(this.theme.muted)(`Next (n) ${safeSymbol('▶', '>')}`);

    const quitBtn = chalk.hex(this.theme.warning)(`Quit (q)`);
    const helpBtn = chalk.hex(this.theme.info)(`Help (h)`);

    const currentPosition = chalk.hex(this.theme.info)(
      `Lines ${this.currentLine + 1}-${Math.min(this.currentLine + this.getContentHeight(), this.content.length)} of ${this.content.length}`,
    );

    return `${prevBtn}  ${currentPosition}  ${nextBtn}  ${quitBtn}  ${helpBtn}`;
  }

  /**
   * Render help information
   */
  private renderHelp(): string {
    const helpText = [
      chalk.bold.hex(this.theme.primary)('Keyboard Controls:'),
      `${chalk.hex(this.theme.info)('n, j, ↓, Space')} - Next page`,
      `${chalk.hex(this.theme.info)('p, k, ↑, b')} - Previous page`,
      `${chalk.hex(this.theme.info)('q, Esc')} - Quit viewer`,
      `${chalk.hex(this.theme.info)('h')} - Toggle help`,
    ];

    // Add custom actions if any
    if (this.options.additionalActions) {
      for (const [key, description] of Object.entries(this.options.additionalActions)) {
        helpText.push(`${chalk.hex(this.theme.info)(key)} - ${description}`);
      }
    }

    return helpText.join('\n');
  }
}

/**
 * Display content in an interactive paged viewer
 * @param content The content to display
 * @param options Viewer options
 * @returns A promise that resolves when viewing is complete
 */
export async function showContent(
  content: string | string[],
  options: ContentViewerOptions = {},
): Promise<void> {
  const viewer = new ContentViewer(content, options);
  return viewer.start();
}
