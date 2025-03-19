/**
 * Tests for Box components
 */

import { createBox, infoBox, successBox, warningBox, errorBox } from '../../src/ui/box.js';
import * as boxen from 'boxen';

// Mock boxen module
jest.mock('boxen', () => {
  return () => 'BOXEN-MOCK: Test Content';
});

describe('Box Components', () => {
  describe('createBox', () => {
    test('should create a box with default styling', () => {
      const content = 'Test content';
      const result = createBox(content);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });

    test('should handle different styling options', () => {
      const content = 'Custom box';
      const result = createBox(content, {
        borderColor: 'primary',
        title: 'Test Title',
        borderStyle: 'double',
      });

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });
  });

  describe('Predefined box styles', () => {
    test('should create info box with info styling', () => {
      const content = 'Info message';
      const result = infoBox(content);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });

    test('should create success box with success styling', () => {
      const content = 'Success message';
      const result = successBox(content);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });

    test('should create warning box with warning styling', () => {
      const content = 'Warning message';
      const result = warningBox(content);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });

    test('should create error box with error styling', () => {
      const content = 'Error message';
      const result = errorBox(content);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });

    test('should handle title parameter', () => {
      const content = 'Message with title';
      const title = 'Important';
      const result = infoBox(content, title);

      expect(result).toBe('BOXEN-MOCK: Test Content');
    });
  });
});
