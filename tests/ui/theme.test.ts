/**
 * Tests for theme management module
 */

import {
  defaultTheme,
  darkTheme,
  highContrastTheme,
  getTheme,
  setTheme,
  getColor,
  getStatusColor,
  statusSymbol,
  coloredStatusSymbol,
} from '../../src/ui/theme.js';

describe('Theme Management', () => {
  // Reset theme after each test
  afterEach(() => {
    setTheme(defaultTheme);
  });

  test('should return default theme initially', () => {
    expect(getTheme()).toEqual(defaultTheme);
  });

  test('should change active theme when set', () => {
    setTheme(darkTheme);
    expect(getTheme()).toEqual(darkTheme);

    setTheme(highContrastTheme);
    expect(getTheme()).toEqual(highContrastTheme);
  });

  test('should get color from active theme', () => {
    setTheme(defaultTheme);
    expect(getColor('primary')).toBe(defaultTheme.primary);
    expect(getColor('success')).toBe(defaultTheme.success);
    expect(getColor('error')).toBe(defaultTheme.error);

    setTheme(darkTheme);
    expect(getColor('primary')).toBe(darkTheme.primary);
    expect(getColor('success')).toBe(darkTheme.success);
    expect(getColor('error')).toBe(darkTheme.error);
  });

  test('should return appropriate status colors', () => {
    setTheme(defaultTheme);

    expect(getStatusColor('success')).toBe(defaultTheme.success);
    expect(getStatusColor('warning')).toBe(defaultTheme.warning);
    expect(getStatusColor('error')).toBe(defaultTheme.error);
    expect(getStatusColor('info')).toBe(defaultTheme.info);
    expect(getStatusColor('pending')).toBe(defaultTheme.secondary);
    expect(getStatusColor('neutral')).toBe(defaultTheme.muted);
  });

  test('should return appropriate status symbols', () => {
    expect(statusSymbol('success')).toBe('✓');
    expect(statusSymbol('warning')).toBe('⚠');
    expect(statusSymbol('error')).toBe('✖');
    expect(statusSymbol('info')).toBe('ℹ');
    expect(statusSymbol('pending')).toBe('⏳');
    expect(statusSymbol('neutral')).toBe('•');
  });

  test('colored status symbol should return a string', () => {
    // Just testing it returns a string with color codes
    const coloredSymbol = coloredStatusSymbol('success');
    expect(typeof coloredSymbol).toBe('string');
    expect(coloredSymbol.length).toBeGreaterThan(1);
  });
});
