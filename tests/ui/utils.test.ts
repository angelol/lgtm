/**
 * Tests for UI utilities
 */

import {
  getTerminalSize,
  safeSymbol,
  supportsColor,
  supportsUnicode,
  percentageToBar
} from '../../src/ui/utils.js';

describe('UI Utilities', () => {
  describe('getTerminalSize', () => {
    test('should return terminal dimensions', () => {
      const size = getTerminalSize();
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
      expect(typeof size.width).toBe('number');
      expect(typeof size.height).toBe('number');
      
      // Ensure we have sensible fallback values if process.stdout is not available
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });

  describe('safeSymbol', () => {
    let originalPlatform: string;
    
    beforeEach(() => {
      originalPlatform = process.platform;
    });
    
    afterEach(() => {
      // Restore original properties
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
    
    test('should return unicode character if supported', () => {
      // Mock platform to be non-Windows (Unicode supported by default)
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      
      expect(safeSymbol('★', '*')).toBe('★');
    });

    test('should return fallback if unicode not supported', () => {
      // Mock platform to be Windows
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Mock environment variables to indicate no Unicode support
      const originalEnv = process.env;
      process.env = {};
      
      expect(safeSymbol('★', '*')).toBe('*');
      
      // Restore original env
      process.env = originalEnv;
    });
  });

  describe('percentageToBar', () => {
    test('should render progress bar with filled and empty characters', () => {
      expect(percentageToBar(0.5, 10, '█', '░')).toBe('█████░░░░░');
      expect(percentageToBar(0.25, 8, '█', '░')).toBe('██░░░░░░');
      expect(percentageToBar(1, 5, '█', '░')).toBe('█████');
      expect(percentageToBar(0, 5, '█', '░')).toBe('░░░░░');
    });

    test('should handle values out of range', () => {
      expect(percentageToBar(1.5, 10, '█', '░')).toBe('██████████'); // > 1
      expect(percentageToBar(-0.5, 10, '█', '░')).toBe('░░░░░░░░░░'); // < 0
    });

    test('should use custom characters if provided', () => {
      expect(percentageToBar(0.5, 10, '#', '-')).toBe('#####-----');
    });
  });

  describe('supportsColor', () => {
    let originalEnv: NodeJS.ProcessEnv;
    
    beforeEach(() => {
      originalEnv = { ...process.env };
    });
    
    afterEach(() => {
      process.env = originalEnv;
    });
    
    test('should use environment variables to determine color support', () => {
      // Test with FORCE_COLOR
      process.env = { FORCE_COLOR: '1' };
      expect(supportsColor()).toBe(true);
      
      process.env = { FORCE_COLOR: '0' };
      expect(supportsColor()).toBe(false);
      
      // Test with NO_COLOR
      process.env = { NO_COLOR: '1' };
      expect(supportsColor()).toBe(false);
    });
  });

  describe('supportsUnicode', () => {
    let originalPlatform: string;
    let originalEnv: NodeJS.ProcessEnv;
    
    beforeEach(() => {
      originalPlatform = process.platform;
      originalEnv = { ...process.env };
    });
    
    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
      process.env = originalEnv;
    });
    
    test('should return true for non-Windows platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });
      expect(supportsUnicode()).toBe(true);
      
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });
      expect(supportsUnicode()).toBe(true);
    });

    test('should check environment variables for Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });
      
      // Windows Terminal
      process.env = { WT_SESSION: '1' };
      expect(supportsUnicode()).toBe(true);
      
      // VS Code
      process.env = { TERM_PROGRAM: 'vscode' };
      expect(supportsUnicode()).toBe(true);
      
      // xterm
      process.env = { TERM: 'xterm-256color' };
      expect(supportsUnicode()).toBe(true);
      
      // Default case
      process.env = {};
      expect(supportsUnicode()).toBe(false);
    });
  });
}); 