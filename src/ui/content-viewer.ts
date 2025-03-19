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
    // Ensure content is always an array and never undefined
    this.content = typeof content === 'string' 
      ? (content ? content.split('\n') : ['']) 
      : (Array.isArray(content) ? (content.length > 0 ? content : ['']) : ['']);
    
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
    const wrappedCallback = (a: ContentViewerAction): void => {
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
    if (this.hasNextPage()) {
      const visibleLines = this.getContentHeight();
      this.currentLine = Math.min(this.currentLine + visibleLines, this.content.length - 1);
      this.render();
    }
  }

  /**
   * Move to the previous page of content
   */
  previousPage(): void {
    if (this.hasPreviousPage()) {
      const visibleLines = this.getContentHeight();
      this.currentLine = Math.max(this.currentLine - visibleLines, 0);
      this.render();
    }
  }

  /**
   * Toggle help display
   */
  toggleHelp(): void {
    this.showingHelp = !this.showingHelp;
    this.render();
  }

  /**
   * Get available height for content display
   */
  private getContentHeight(): number {
    // If we have a fixed height option, use that
    if (this.options.maxHeight) {
      return this.options.maxHeight;
    }

    const terminalHeight = this.terminalHeight;

    // Calculate space needed for UI elements
    let uiElementsHeight = 1; // At least 1 for the controls

    // Title takes 2 lines (title + separator)
    if (this.options.title) {
      uiElementsHeight += 2;
    }

    // Help takes 3+ lines
    if (this.showingHelp) {
      const additionalActions = this.options.additionalActions || {};
      const additionalActionsCount = Object.keys(additionalActions).length;
      uiElementsHeight += 3 + Math.ceil(additionalActionsCount / 2);
    }

    // Calculate available space
    const availableHeight = Math.max(1, terminalHeight - uiElementsHeight);

    return availableHeight;
  }

  /**
   * Check if there are more pages of content ahead
   */
  hasNextPage(): boolean {
    const visibleLines = this.getContentHeight();
    return this.content.length > 0 && this.currentLine + visibleLines < this.content.length;
  }

  /**
   * Check if there are more pages of content behind
   */
  hasPreviousPage(): boolean {
    return this.content.length > 0 && this.currentLine > 0;
  }

  /**
   * Render the content viewer
   */
  render(): void {
    if (!this.isActive || !this.content || this.content.length === 0) {
      // Handle empty content gracefully
      console.clear();
      if (this.options.title) {
        console.log(chalk.bold(this.options.title));
        console.log(chalk.dim('─'.repeat(this.options.title.length)));
      }
      console.log('\n*No content to display*\n');
      console.log(chalk.dim('Press q to quit'));
      return;
    }

    console.clear();

    // Render title if provided
    if (this.options.title) {
      console.log(chalk.bold(this.options.title));
      console.log(chalk.dim('─'.repeat(this.options.title.length)));
    }

    const visibleLines = this.getContentHeight();
    const endLine = Math.min(this.currentLine + visibleLines, this.content.length);

    // Display content lines
    for (let i = this.currentLine; i < endLine; i++) {
      const line = this.content[i] || ''; // Ensure we have a string even if undefined
      
      // Show line numbers if requested
      if (this.options.showLineNumbers) {
        const lineNumber = String(i + 1).padStart(3, ' ');
        console.log(`${chalk.dim(lineNumber)} ${line}`);
      } else {
        console.log(line);
      }
    }

    // Show pagination info and controls
    console.log(this.renderControls());

    // Show help if requested
    if (this.showingHelp) {
      console.log(this.renderHelp());
    }
  }

  /**
   * Render the control bar
   */
  private renderControls(): string {
    const { theme } = this;
    const startLine = this.currentLine + 1; // 1-indexed for display
    const endLine = Math.min(this.currentLine + this.getContentHeight(), this.content.length);
    const totalLines = this.content.length;

    const paginationInfo = chalk.hex(theme.normal)(
      `Showing lines ${startLine}-${endLine} of ${totalLines}`,
    );

    const hasPrev = this.hasPreviousPage();
    const hasNext = this.hasNextPage();

    const prevSymbol = hasPrev ? safeSymbol('◀', '<') : ' ';
    const nextSymbol = hasNext ? safeSymbol('▶', '>') : ' ';

    const prevControl = hasPrev
      ? chalk.hex(theme.highlight)(prevSymbol)
      : chalk.hex(theme.muted)(prevSymbol);

    const nextControl = hasNext
      ? chalk.hex(theme.highlight)(nextSymbol)
      : chalk.hex(theme.muted)(nextSymbol);

    const helpPrompt = chalk.hex(theme.muted)(`Press ${chalk.bold('h')} for help`);

    return `\n${paginationInfo} ${prevControl} ${nextControl} ${helpPrompt}`;
  }

  /**
   * Render the help text
   */
  private renderHelp(): string {
    const { theme } = this;
    const helpLines = [];

    helpLines.push(chalk.bold.hex(theme.primary)('\nKeyboard Controls:'));

    // Navigation controls
    helpLines.push(
      `${chalk.bold.hex(theme.highlight)('n, j, ↓, space')} Next page   ${chalk.bold.hex(
        theme.highlight,
      )('p, k, ↑, b')} Previous page   ${chalk.bold.hex(theme.highlight)('q, Esc')} Quit`,
    );

    // Help toggle
    helpLines.push(
      `${chalk.bold.hex(theme.highlight)('h')} Toggle help   ${chalk.bold.hex(
        theme.highlight,
      )('/')} Search (coming soon)`,
    );

    // Custom actions
    if (this.options.additionalActions && Object.keys(this.options.additionalActions).length > 0) {
      helpLines.push(chalk.bold.hex(theme.primary)('\nAdditional Actions:'));

      const actionsLine = Object.entries(this.options.additionalActions)
        .map(
          ([key, desc]) => `${chalk.bold.hex(theme.highlight)(key)} ${chalk.hex(theme.normal)(desc)}`,
        )
        .join('   ');

      helpLines.push(actionsLine);
    }

    return helpLines.join('\n');
  }
}

/**
 * Helper function to show content in a viewer
 * @param content - Content to view
 * @param options - Viewer options
 */
export async function showContent(
  content: string | string[],
  options: ContentViewerOptions = {},
): Promise<void> {
  if (!content || (Array.isArray(content) && content.length === 0)) {
    console.log('*No content to display*');
    return;
  }
  
  const viewer = new ContentViewer(content, options);
  await viewer.start();
}
