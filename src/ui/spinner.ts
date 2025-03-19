/**
 * Spinner Component
 * Implementation of loading animations and spinners
 */

import chalk from 'chalk';
import { getTheme } from './theme.js';
import { ColorTheme, Size } from './types.js';
import { supportsUnicode } from './utils.js';

/**
 * Options for spinner configuration
 */
export interface SpinnerOptions {
  /** Text to display next to the spinner */
  text?: string;
  /** Spinner color */
  color?: keyof ColorTheme;
  /** Spinner size */
  size?: Size;
  /** Spinner type */
  type?: 'dots' | 'line' | 'clock' | 'bar';
  /** Whether to show text at the end instead of beginning */
  textAtEnd?: boolean;
}

/**
 * Different spinner frame sets
 */
const SPINNERS = {
  dots: {
    frames: supportsUnicode() ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] : ['-', '\\', '|', '/'],
    interval: 80
  },
  line: {
    frames: supportsUnicode() ? ['─', '┄', '┈', '┄'] : ['-', '=', '-', '='],
    interval: 130
  },
  clock: {
    frames: supportsUnicode() ? ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'] : ['○', '◔', '◑', '◕', '●'],
    interval: 100
  },
  bar: {
    frames: supportsUnicode() ? ['▰▱▱▱▱', '▰▰▱▱▱', '▰▰▰▱▱', '▰▰▰▰▱', '▰▰▰▰▰', '▰▰▰▰▱', '▰▰▰▱▱', '▰▰▱▱▱', '▰▱▱▱▱'] : ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[====]', '[=== ]', '[==  ]', '[=   ]'],
    interval: 120
  }
};

/**
 * Creates a new spinner instance
 */
export class Spinner {
  private frames: string[];
  private interval: number;
  private color: string;
  private text: string;
  private textAtEnd: boolean;
  private frameIndex = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private lastFrameLength = 0;
  
  constructor(options: SpinnerOptions = {}) {
    const theme = getTheme();
    const spinnerType = options.type || 'dots';
    const spinner = SPINNERS[spinnerType];
    
    this.frames = spinner.frames;
    this.interval = spinner.interval;
    this.color = theme[options.color || 'primary'] || theme.primary;
    this.text = options.text || 'Loading...';
    this.textAtEnd = options.textAtEnd || false;
  }
  
  /**
   * Starts the spinner animation
   */
  start(): this {
    if (!this.intervalId) {
      this.render();
      this.intervalId = setInterval(() => {
        this.render();
      }, this.interval);
    }
    return this;
  }
  
  /**
   * Stops the spinner animation
   */
  stop(): this {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.clear();
    }
    return this;
  }
  
  /**
   * Stops the spinner and shows a success message
   */
  succeed(text?: string): this {
    return this.stopWithSymbol('✓', 'success', text);
  }
  
  /**
   * Stops the spinner and shows an error message
   */
  fail(text?: string): this {
    return this.stopWithSymbol('✗', 'error', text);
  }
  
  /**
   * Stops the spinner and shows a warning message
   */
  warn(text?: string): this {
    return this.stopWithSymbol('⚠', 'warning', text);
  }
  
  /**
   * Stops the spinner and shows an info message
   */
  info(text?: string): this {
    return this.stopWithSymbol('ℹ', 'info', text);
  }
  
  /**
   * Updates the spinner text
   */
  setText(text: string): this {
    this.text = text;
    return this;
  }
  
  /**
   * Renders the current frame
   */
  private render(): void {
    this.clear();
    
    const frame = this.frames[this.frameIndex];
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    
    const coloredFrame = chalk.hex(this.color)(frame);
    const output = this.textAtEnd 
      ? `${coloredFrame} ${this.text}`
      : `${this.text} ${coloredFrame}`;
      
    process.stdout.write(output);
    this.lastFrameLength = output.length;
  }
  
  /**
   * Clears the current line
   */
  private clear(): void {
    if (this.lastFrameLength > 0) {
      process.stdout.write('\r' + ' '.repeat(this.lastFrameLength) + '\r');
    }
  }
  
  /**
   * Stops the spinner with a status symbol
   */
  private stopWithSymbol(symbol: string, colorKey: keyof ColorTheme, text?: string): this {
    this.stop();
    const theme = getTheme();
    const finalText = text || this.text;
    const coloredSymbol = chalk.hex(theme[colorKey])(supportsUnicode() ? symbol : symbol.charAt(0));
    
    process.stdout.write(`${coloredSymbol} ${finalText}\n`);
    return this;
  }
} 