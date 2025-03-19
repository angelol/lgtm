/**
 * Tests for Spinner Component
 */

import { Spinner, SpinnerOptions } from '../../src/ui/spinner.js';

// Mock stdout write to avoid actual terminal output
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
let stdoutOutput: string[] = [];

describe('Spinner Component', () => {
  beforeEach(() => {
    // Reset captured output
    stdoutOutput = [];

    // Mock process.stdout.write with arrow function
    process.stdout.write = ((str: string | Uint8Array): boolean => {
      stdoutOutput.push(str.toString());
      return true;
    }) as typeof process.stdout.write;

    // Mock setInterval to immediately invoke the callback instead of waiting
    jest.spyOn(global, 'setInterval').mockImplementation((callback: () => void) => {
      callback();
      return { ref: {} } as unknown as NodeJS.Timeout;
    });

    // Mock clearInterval to do nothing
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original stdout.write
    process.stdout.write = originalStdoutWrite;

    // Restore timer mocks
    jest.restoreAllMocks();
  });

  it('should create a spinner with default options', () => {
    const spinner = new Spinner();

    expect(spinner).toBeDefined();
    expect(spinner).toBeInstanceOf(Spinner);
  });

  it('should start and stop the spinner', () => {
    const spinner = new Spinner();

    // Start the spinner - this should render a frame
    spinner.start();

    // Verify output contains the default loading text
    expect(stdoutOutput.length).toBeGreaterThan(0);
    const output = stdoutOutput.join('');
    expect(output).toContain('Loading...');

    // Clear collected output
    stdoutOutput = [];

    // Stop the spinner
    spinner.stop();

    // Verify clearing output was generated
    expect(stdoutOutput.length).toBeGreaterThan(0);
  });

  it('should use custom text and color from options', () => {
    const options: SpinnerOptions = {
      text: 'Custom spinner text',
      color: 'success',
      type: 'dots',
    };

    const spinner = new Spinner(options);
    spinner.start();

    // Verify output contains the custom text
    const output = stdoutOutput.join('');
    expect(output).toContain('Custom spinner text');

    spinner.stop();
  });

  it('should update text while running', () => {
    const spinner = new Spinner({ text: 'Initial text' });
    spinner.start();

    // Clear output from initial render
    stdoutOutput = [];

    // Update the text
    spinner.setText('Updated text');

    // Manually trigger a re-render since we mocked interval
    const setIntervalMock = global.setInterval as jest.MockedFunction<typeof setInterval>;
    setIntervalMock.mock.calls[0][0]();

    // Verify output contains the updated text
    const output = stdoutOutput.join('');
    expect(output).toContain('Updated text');

    spinner.stop();
  });

  it('should display success message', () => {
    const spinner = new Spinner({ text: 'Working' });
    spinner.start();

    // Clear output from initial render
    stdoutOutput = [];

    // Show success
    spinner.succeed('Operation completed successfully');

    // Verify output contains success message
    const output = stdoutOutput.join('');
    expect(output).toContain('Operation completed successfully');
    expect(output).toContain('✓'); // or a fallback character
  });

  it('should display error message', () => {
    const spinner = new Spinner({ text: 'Working' });
    spinner.start();

    // Clear output from initial render
    stdoutOutput = [];

    // Show error
    spinner.fail('Operation failed');

    // Verify output contains error message
    const output = stdoutOutput.join('');
    expect(output).toContain('Operation failed');
    expect(output).toContain('✗'); // or a fallback character
  });
});
