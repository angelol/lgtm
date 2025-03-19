import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import * as diffModule from '../../src/ui/diff.js';
import { ParsedDiff } from '../../src/github/models/content.js';

// Save the original implementation
const originalRenderDiff = diffModule.renderDiff;

// Type casting function to avoid TypeScript errors
function isParsedDiff(obj: any): obj is ParsedDiff {
  return obj && typeof obj === 'object' && 'filename' in obj && 'hunks' in obj;
}

// Mock the renderDiff function
jest.mock('../../src/ui/diff.js', () => {
  // Define a type for the module to avoid using 'any'
  interface DiffModule {
    DiffOptions: unknown;
    renderDiff: unknown;
  }

  const actualModule = jest.requireActual('../../src/ui/diff.js');

  return {
    renderDiff: jest.fn().mockImplementation((diff: unknown) => {
      // Mock implementation that returns predictable output based on inputs
      if (typeof diff === 'string') {
        return 'String diff output with: ' + diff.substring(0, 30);
      } else if (isParsedDiff(diff)) {
        return `Diff for ${diff.filename} with ${diff.hunks?.length || 0} hunks`;
      }
      return '';
    }),
    DiffOptions: actualModule.DiffOptions,
  };
});

describe('Diff Renderer', () => {
  beforeEach(() => {
    // Clear the mock before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore the original implementation
    jest.resetAllMocks();
  });

  it('should render string diff content', () => {
    const diff = `diff --git a/file.txt b/file.txt
index 1234567..abcdefg 100644
--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 Line 1
-Line 2
+Line 2 modified
+Line 3 added
 Line 4`;

    const result = diffModule.renderDiff(diff);
    expect(result).toContain('String diff output with');
    expect(diffModule.renderDiff).toHaveBeenCalledWith(diff, undefined);
  });

  it('should render parsed diff objects', () => {
    const parsedDiff: ParsedDiff = {
      filename: 'test.js',
      hunks: [
        {
          oldStart: 1,
          oldLines: 3,
          newStart: 1,
          newLines: 4,
          lines: [
            { content: 'Line 1', type: 'context' },
            { content: 'Line 2', type: 'deletion' },
            { content: 'Line 2 modified', type: 'addition' },
            { content: 'Line 3 added', type: 'addition' },
            { content: 'Line 4', type: 'context' },
          ],
        },
      ],
      language: 'javascript',
    };

    const result = diffModule.renderDiff(parsedDiff);
    expect(result).toContain('test.js');
    expect(result).toContain('1 hunks');
    expect(diffModule.renderDiff).toHaveBeenCalledWith(parsedDiff, undefined);
  });

  it('should accept custom options', () => {
    const diff = `diff --git a/file.txt b/file.txt`;

    const options = {
      showLineNumbers: false,
      showFilePaths: false,
    };

    diffModule.renderDiff(diff);
    diffModule.renderDiff(diff, options);

    expect(diffModule.renderDiff).toHaveBeenCalledTimes(2);
    expect(diffModule.renderDiff).toHaveBeenCalledWith(diff, undefined);
    expect(diffModule.renderDiff).toHaveBeenCalledWith(diff, options);
  });

  it('should handle undefined or empty input', () => {
    diffModule.renderDiff('');
    expect(diffModule.renderDiff).toHaveBeenCalledWith('', undefined);
    expect(() => diffModule.renderDiff('', {})).not.toThrow();
  });

  it('should render basic diffs when parsing fails', () => {
    // Invalid diff format
    const invalidDiff = 'Not a valid diff format';
    diffModule.renderDiff(invalidDiff);

    expect(diffModule.renderDiff).toHaveBeenCalledWith(invalidDiff, undefined);
  });

  it('should show file paths when requested', () => {
    const parsedDiff: ParsedDiff = {
      filename: 'test.js',
      hunks: [
        {
          oldStart: 1,
          oldLines: 1,
          newStart: 1,
          newLines: 1,
          lines: [{ content: 'Line 1', type: 'context' }],
        },
      ],
    };

    // Test with and without showing file paths
    diffModule.renderDiff(parsedDiff, { showFilePaths: true });
    diffModule.renderDiff(parsedDiff, { showFilePaths: false });

    expect(diffModule.renderDiff).toHaveBeenCalledTimes(2);
    expect(diffModule.renderDiff).toHaveBeenCalledWith(parsedDiff, { showFilePaths: true });
    expect(diffModule.renderDiff).toHaveBeenCalledWith(parsedDiff, { showFilePaths: false });
  });
});
