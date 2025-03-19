/**
 * Progress Indicators
 * Provides components for showing loading states and progress
 */

import chalk from 'chalk';
import { ProgressProps, StatusType, Size } from './types.js';
import { getStatusColor, statusSymbol } from './theme.js';
import { getVisualLength } from './text.js';
import { safeSymbol, percentageToBar } from './utils.js';

// Spinner frames for animation
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const fallbackSpinnerFrames = ['|', '/', '-', '\\'];

// Size configurations for progress components
const sizeConfig: Record<Size, { barLength: number; padding: number }> = {
  small: { barLength: 20, padding: 1 },
  medium: { barLength: 30, padding: 2 },
  large: { barLength: 40, padding: 3 },
};

/**
 * Base class for progress indicators
 */
export class ProgressIndicator {
  protected interval: NodeJS.Timeout | null = null;
  protected frameIndex = 0;
  protected lastDraw = '';
  protected props: ProgressProps;

  constructor(props: ProgressProps = {}) {
    this.props = props;
  }

  /**
   * Starts the progress animation
   */
  start(): this {
    if (this.interval) {
      return this;
    }

    this.interval = setInterval(() => {
      this.render();
    }, 80);

    this.render();
    return this;
  }

  /**
   * Stops the progress animation
   */
  stop(): this {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;

      // Clear the last render
      if (this.lastDraw) {
        const backspaces = '\b'.repeat(getVisualLength(this.lastDraw));
        const spaces = ' '.repeat(getVisualLength(this.lastDraw));
        process.stdout.write(backspaces + spaces + backspaces);
        this.lastDraw = '';
      }
    }

    return this;
  }

  /**
   * Updates the progress indicator properties
   */
  update(props: Partial<ProgressProps>): this {
    this.props = { ...this.props, ...props };
    return this;
  }

  /**
   * Completes the progress with a success message
   */
  succeed(message?: string): void {
    this.complete('success', message);
  }

  /**
   * Completes the progress with a warning message
   */
  warn(message?: string): void {
    this.complete('warning', message);
  }

  /**
   * Completes the progress with an error message
   */
  fail(message?: string): void {
    this.complete('error', message);
  }

  /**
   * Completes the progress with an info message
   */
  info(message?: string): void {
    this.complete('info', message);
  }

  /**
   * Completes the progress with the specified status
   */
  complete(status: StatusType, message?: string): void {
    this.stop();

    if (message || this.props.message) {
      const symbol = chalk.hex(getStatusColor(status))(statusSymbol(status));
      const finalMessage = message || this.props.message || '';
      process.stdout.write(`${symbol} ${finalMessage}\n`);
    }
  }

  /**
   * Renders the current frame of the progress indicator
   */
  protected render(): void {
    // To be implemented by subclasses
  }

  /**
   * Gets the current frame for a spinner animation
   */
  protected getSpinnerFrame(): string {
    const frames = safeSymbol(
      spinnerFrames[this.frameIndex],
      fallbackSpinnerFrames[this.frameIndex],
    );
    this.frameIndex = (this.frameIndex + 1) % spinnerFrames.length;
    return frames;
  }
}

/**
 * Spinner progress indicator
 */
export class Spinner extends ProgressIndicator {
  protected render(): void {
    const { message = '', status = 'pending' } = this.props;
    const spinnerFrame = chalk.hex(getStatusColor(status))(this.getSpinnerFrame());

    const output = `${spinnerFrame} ${message}`;

    // Clear previous render and draw the new frame
    if (this.lastDraw) {
      const backspaces = '\b'.repeat(getVisualLength(this.lastDraw));
      process.stdout.write(backspaces);
    }

    process.stdout.write(output);
    this.lastDraw = output;
  }
}

/**
 * Progress bar indicator
 */
export class ProgressBar extends ProgressIndicator {
  protected render(): void {
    const {
      message = '',
      status = 'pending',
      size = 'medium',
      value = 0,
      total = 100,
    } = this.props;

    const { barLength } = sizeConfig[size];
    const percentage = Math.min(1, Math.max(0, value / total));
    const bar = percentageToBar(percentage, barLength);
    const percentageText = `${Math.round(percentage * 100)}%`;

    const output = `${message} [${chalk.hex(getStatusColor(status))(bar)}] ${percentageText}`;

    // Clear previous render and draw the new frame
    if (this.lastDraw) {
      const backspaces = '\b'.repeat(getVisualLength(this.lastDraw));
      process.stdout.write(backspaces);
    }

    process.stdout.write(output);
    this.lastDraw = output;
  }
}

/**
 * Dots animation progress indicator
 */
export class DotsIndicator extends ProgressIndicator {
  protected dotsCount = 0;

  protected render(): void {
    const { message = '', status = 'pending' } = this.props;

    this.dotsCount = (this.dotsCount + 1) % 4;
    const dots = '.'.repeat(this.dotsCount);
    const paddedDots = dots.padEnd(3, ' ');

    const output = `${message} ${chalk.hex(getStatusColor(status))(paddedDots)}`;

    // Clear previous render and draw the new frame
    if (this.lastDraw) {
      const backspaces = '\b'.repeat(getVisualLength(this.lastDraw));
      process.stdout.write(backspaces);
    }

    process.stdout.write(output);
    this.lastDraw = output;
  }
}

/**
 * Creates and returns an appropriate progress indicator based on the given type
 */
export const createProgressIndicator = (options: ProgressProps = {}): ProgressIndicator => {
  const { type = 'spinner' } = options;

  switch (type) {
    case 'bar':
      return new ProgressBar(options);
    case 'dots':
      return new DotsIndicator(options);
    case 'spinner':
    default:
      return new Spinner(options);
  }
};
