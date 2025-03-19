/**
 * File Diff Viewer Component
 * Implementation of file-by-file navigation for PR diffs
 */

import { EventEmitter } from 'events';
import readline from 'readline';
import chalk from 'chalk';
import { PullRequestDiff, FileChange } from '../github/models/content.js';
import { renderDiff } from './diff.js';
import { getTheme } from './theme.js';
import { ColorTheme } from './types.js';

/**
 * Options for the file diff viewer
 */
export interface FileDiffViewerOptions {
  /** Custom theme to use */
  theme?: ColorTheme;
  /** Custom key bindings */
  keyBindings?: Partial<FileDiffViewerKeyBindings>;
  /** Additional actions to display in help */
  additionalActions?: Record<string, string>;
  /** Whether to display a help footer */
  showHelp?: boolean;
  /** Whether to show line numbers in diffs */
  showLineNumbers?: boolean;
  /** Whether to use syntax highlighting in diffs */
  highlight?: boolean;
}

/**
 * Key bindings for the file diff viewer
 */
export interface FileDiffViewerKeyBindings {
  /** Key for next file */
  next: string[];
  /** Key for previous file */
  previous: string[];
  /** Key to quit viewing */
  quit: string[];
  /** Key to open in browser */
  open: string[];
  /** Key to approve PR */
  approve: string[];
  /** Key to toggle help */
  help: string[];
}

/**
 * Default key bindings
 */
const DEFAULT_KEY_BINDINGS: FileDiffViewerKeyBindings = {
  next: ['n', 'right'],
  previous: ['p', 'left'],
  quit: ['q', 'escape', 'ctrl+c'],
  open: ['o'],
  approve: ['a'],
  help: ['h', '?'],
};

/**
 * Actions that can be taken with the file diff viewer
 */
export type FileDiffViewerAction =
  | 'next'
  | 'previous'
  | 'quit'
  | 'open'
  | 'approve'
  | 'help'
  | string;

/**
 * Callback for file diff viewer actions
 */
export type FileDiffViewerActionCallback = (
  action: FileDiffViewerAction,
  file?: FileChange,
  index?: number,
) => void;

/**
 * File diff viewer for navigating through changed files in a PR
 */
export class FileDiffViewer extends EventEmitter {
  private diff: PullRequestDiff;
  private options: FileDiffViewerOptions;
  private keyBindings: FileDiffViewerKeyBindings;
  private theme: ColorTheme;
  private currentFileIndex: number = 0;
  private rl: readline.Interface | null = null;
  private isActive: boolean = false;
  private showingHelp: boolean = false;

  /**
   * Create a new file diff viewer
   * @param diff - The pull request diff containing files to navigate
   * @param options - Configuration options
   */
  constructor(diff: PullRequestDiff, options: FileDiffViewerOptions = {}) {
    super();
    this.diff = diff;
    this.options = options;
    this.theme = options.theme || getTheme();
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...options.keyBindings };
  }

  /**
   * Start the interactive file diff viewer
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
    const keyPressHandler = this.handleKeyPress.bind(this);
    process.stdin.on('keypress', keyPressHandler);

    // Initial render
    this.render();

    // Return a promise that resolves when the viewer is closed
    return new Promise<void>(resolve => {
      this.once('quit', () => {
        this.close();
        // Remove the keypress handler
        process.stdin.removeListener('keypress', keyPressHandler);
        resolve();
      });
    });
  }

  /**
   * Close the file diff viewer
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

    // Clear content from screen
    console.clear();
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
   * Trigger an action
   * @param action The action to trigger
   */
  private triggerAction(action: FileDiffViewerAction): void {
    const currentFile = this.getCurrentFile();

    // Handle built-in actions
    switch (action) {
      case 'next':
        this.nextFile();
        break;
      case 'previous':
        this.previousFile();
        break;
      case 'help':
        this.toggleHelp();
        break;
      case 'quit':
        this.emit('quit');
        break;
      case 'open':
        this.emit('open', currentFile, this.currentFileIndex);
        break;
      case 'approve':
        this.emit('approve');
        break;
    }

    // Emit the action for external handlers
    this.emit(action, currentFile, this.currentFileIndex);
  }

  /**
   * Move to the next file in the diff
   * @returns The next file or undefined if at the end
   */
  nextFile(): FileChange | undefined {
    if (this.currentFileIndex < this.diff.files.length - 1) {
      this.currentFileIndex++;
      const file = this.getCurrentFile();
      this.render();
      this.emit('nextFile', file, this.currentFileIndex);
      return file;
    }
    return undefined;
  }

  /**
   * Move to the previous file in the diff
   * @returns The previous file or undefined if at the beginning
   */
  previousFile(): FileChange | undefined {
    if (this.currentFileIndex > 0) {
      this.currentFileIndex--;
      const file = this.getCurrentFile();
      this.render();
      this.emit('previousFile', file, this.currentFileIndex);
      return file;
    }
    return undefined;
  }

  /**
   * Get the current file being viewed
   */
  getCurrentFile(): FileChange {
    return this.diff.files[this.currentFileIndex];
  }

  /**
   * Get the current file index
   */
  getCurrentFileIndex(): number {
    return this.currentFileIndex;
  }

  /**
   * Set the current file index
   * @param index The index to set
   */
  setCurrentFileIndex(index: number): void {
    if (index >= 0 && index < this.diff.files.length) {
      this.currentFileIndex = index;
      this.render();
    }
  }

  /**
   * Get the total number of files in the diff
   */
  getTotalFiles(): number {
    return this.diff.files.length;
  }

  /**
   * Check if there is a next file
   */
  hasNextFile(): boolean {
    return this.currentFileIndex < this.diff.files.length - 1;
  }

  /**
   * Check if there is a previous file
   */
  hasPreviousFile(): boolean {
    return this.currentFileIndex > 0;
  }

  /**
   * Toggle the help display
   */
  toggleHelp(): void {
    this.showingHelp = !this.showingHelp;
    this.render();
  }

  /**
   * Render the current file to the terminal
   */
  render(): void {
    if (!this.isActive) {
      return;
    }

    // Clear the screen
    console.clear();

    const currentFile = this.getCurrentFile();

    // Render file header with navigation info
    console.log(this.renderHeader(currentFile));

    // Render the current file's diff
    const diffOutput = renderDiff(currentFile.patch || '', {
      showLineNumbers: this.options.showLineNumbers,
      highlight: this.options.highlight,
    });
    console.log(diffOutput);

    // Render controls and help
    console.log(this.renderControls());

    if (this.showingHelp || this.options.showHelp) {
      console.log(this.renderHelp());
    }
  }

  /**
   * Render the header for the current file
   */
  private renderHeader(file: FileChange): string {
    const theme = this.theme;

    // Get file status with appropriate color
    let statusColor = theme.info;
    switch (file.status) {
      case 'added':
        statusColor = theme.success;
        break;
      case 'removed':
        statusColor = theme.error;
        break;
      case 'modified':
      default:
        statusColor = theme.warning;
        break;
    }

    const fileStatus = chalk.hex(statusColor)(file.status.toUpperCase());

    // Create header with file info
    const header = `
${chalk.bold.hex(theme.primary)(`File ${this.currentFileIndex + 1}/${this.diff.files.length}: ${file.filename}`)}
${chalk.hex(theme.secondary)(`Status: ${fileStatus}   Changes: +${file.additions}/-${file.deletions}`)}
`;

    return header;
  }

  /**
   * Render the controls footer
   */
  private renderControls(): string {
    const theme = this.theme;

    // Create controls based on available actions
    const controls = [];

    if (this.hasPreviousFile()) {
      controls.push(`${chalk.bold.hex(theme.primary)('p')} prev`);
    }

    if (this.hasNextFile()) {
      controls.push(`${chalk.bold.hex(theme.primary)('n')} next`);
    }

    controls.push(`${chalk.bold.hex(theme.primary)('o')} open`);
    controls.push(`${chalk.bold.hex(theme.primary)('a')} approve`);
    controls.push(`${chalk.bold.hex(theme.primary)('q')} quit`);
    controls.push(`${chalk.bold.hex(theme.primary)('?')} help`);

    return `\n${controls.join(' | ')}\n`;
  }

  /**
   * Render the help text
   */
  private renderHelp(): string {
    const theme = this.theme;

    const helpText = `
${chalk.bold.hex(theme.primary)('KEYBOARD SHORTCUTS')}
${chalk.bold.hex(theme.secondary)('n, →')}       : Next file
${chalk.bold.hex(theme.secondary)('p, ←')}       : Previous file
${chalk.bold.hex(theme.secondary)('o')}         : Open current file in browser
${chalk.bold.hex(theme.secondary)('a')}         : Approve the PR
${chalk.bold.hex(theme.secondary)('q, Esc')}    : Quit
${chalk.bold.hex(theme.secondary)('?, h')}      : Toggle help
`;

    return helpText;
  }
}

/**
 * Helper function to show a file diff viewer
 * @param diff The PR diff to view
 * @param options Viewing options
 * @returns A promise that resolves when viewing is complete
 */
export async function showFileDiff(
  diff: PullRequestDiff,
  options: FileDiffViewerOptions = {},
): Promise<void> {
  const viewer = new FileDiffViewer(diff, options);
  return viewer.start();
}
