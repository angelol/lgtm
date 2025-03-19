/**
 * Tests for text formatting utilities
 */

import {
  truncate,
  padLeft,
  padRight,
  center,
  getVisualLength,
  wrapText,
  separator,
} from '../../src/ui/text.js';

describe('Text Formatting', () => {
  describe('truncate', () => {
    test('should truncate text that exceeds max length', () => {
      expect(truncate('This is a long text', 10)).toBe('This is...');
    });

    test('should not truncate text within max length', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    test('should use custom ellipsis if provided', () => {
      expect(truncate('This is a long text', 10, '..more')).toBe('This..more');
    });
  });

  describe('padLeft', () => {
    test('should pad string from left to reach specified length', () => {
      expect(padLeft('test', 8)).toBe('    test');
    });

    test('should use custom pad character if provided', () => {
      expect(padLeft('test', 8, '-')).toBe('----test');
    });

    test('should not change text longer than pad length', () => {
      expect(padLeft('longer text', 5)).toBe('longer text');
    });
  });

  describe('padRight', () => {
    test('should pad string from right to reach specified length', () => {
      expect(padRight('test', 8)).toBe('test    ');
    });

    test('should use custom pad character if provided', () => {
      expect(padRight('test', 8, '-')).toBe('test----');
    });

    test('should not change text longer than pad length', () => {
      expect(padRight('longer text', 5)).toBe('longer text');
    });
  });

  describe('center', () => {
    test('should center text within specified length', () => {
      expect(center('test', 10)).toBe('   test   ');
    });

    test('should handle odd padding distribution', () => {
      expect(center('test', 9)).toBe('  test   ');
    });

    test('should use custom pad character if provided', () => {
      expect(center('test', 10, '-')).toBe('---test---');
    });

    test('should not modify text longer than length', () => {
      expect(center('this text is too long', 10)).toBe('this text is too long');
    });
  });

  describe('getVisualLength', () => {
    test('should return correct length for plain text', () => {
      expect(getVisualLength('test string')).toBe(11);
    });

    test('should exclude ANSI escape sequences from length', () => {
      // ANSI bold sequence added to the string
      const boldText = '\u001b[1mBold text\u001b[0m';
      expect(getVisualLength(boldText)).toBe(9); // 'Bold text' is 9 chars
    });
  });

  describe('wrapText', () => {
    test('should wrap text at word boundaries to fit width', () => {
      const result = wrapText('This is a long sentence that needs to be wrapped.', 20);
      expect(result).toEqual(['This is a long', 'sentence that needs', 'to be wrapped.']);
    });

    test('should handle single-line text within width', () => {
      const result = wrapText('Short text', 20);
      expect(result).toEqual(['Short text']);
    });
  });

  describe('separator', () => {
    test('should create separator line of specified width', () => {
      expect(separator(5)).toBe('─────');
    });

    test('should use custom character if provided', () => {
      expect(separator(5, '=')).toBe('=====');
    });

    test('should default to width 80 if not specified', () => {
      expect(separator().length).toBe(80);
    });
  });
});
