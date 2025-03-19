import {
  checkNodeVersion,
  verifyNodeVersion,
  isApiAvailable,
  features,
  DEFAULT_VERSION_CONFIG,
} from '../../src/utils/version';
import { jest } from '@jest/globals';

describe('Version Check Utility', () => {
  const originalExit = process.exit;
  const originalConsoleError = console.error;

  let mockExit: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Mock process.exit and console.error
    mockExit = jest.fn() as jest.SpyInstance;
    mockConsoleError = jest.fn() as jest.SpyInstance;

    // Type assertion needed for mocking a NodeJS.Process method
    process.exit = mockExit as unknown as (code?: number) => never;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  describe('checkNodeVersion', () => {
    test('returns isSupported=true for current node version', () => {
      const result = checkNodeVersion();
      expect(result.isSupported).toBe(true);
      expect(result.currentVersion).toBe(process.versions.node);
      expect(result.errorMessage).toBeUndefined();
    });

    test('returns isSupported=false for unsupported version', () => {
      const result = checkNodeVersion({
        minVersion: '100.0.0',
        maxVersion: '101.0.0',
        currentVersion: '99.0.0',
      });

      expect(result.isSupported).toBe(false);
      expect(result.currentVersion).toBe('99.0.0');
      expect(result.errorMessage).toContain('LGTM requires Node.js version');
    });

    test('returns isSupported=false for version too old', () => {
      const result = checkNodeVersion({
        minVersion: '16.0.0',
        maxVersion: '24.0.0',
        currentVersion: '14.0.0',
      });

      expect(result.isSupported).toBe(false);
      expect(result.currentVersion).toBe('14.0.0');
      expect(result.errorMessage).toContain('LGTM requires Node.js version');
    });

    test('returns isSupported=false for version too new', () => {
      const result = checkNodeVersion({
        minVersion: '16.0.0',
        maxVersion: '24.0.0',
        currentVersion: '25.0.0',
      });

      expect(result.isSupported).toBe(false);
      expect(result.currentVersion).toBe('25.0.0');
      expect(result.errorMessage).toContain('LGTM requires Node.js version');
    });

    test('uses default config when none provided', () => {
      const result = checkNodeVersion();

      expect(result.supportedRange).toBe(
        `>=${DEFAULT_VERSION_CONFIG.minVersion} <${DEFAULT_VERSION_CONFIG.maxVersion}`,
      );
    });
  });

  describe('verifyNodeVersion', () => {
    test('does not exit for supported version', () => {
      verifyNodeVersion({
        minVersion: '16.0.0',
        maxVersion: '24.0.0',
        currentVersion: '20.0.0',
      });

      expect(mockExit).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('exits with error for unsupported version', () => {
      verifyNodeVersion({
        minVersion: '16.0.0',
        maxVersion: '24.0.0',
        currentVersion: '14.0.0',
      });

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('isApiAvailable', () => {
    test('returns true when API is available', () => {
      const result = isApiAvailable(() => true);
      expect(result).toBe(true);
    });

    test('returns false when API throws error', () => {
      const result = isApiAvailable(() => {
        throw new Error('API not available');
      });
      expect(result).toBe(false);
    });

    test('returns false when API check returns false', () => {
      const result = isApiAvailable(() => false);
      expect(result).toBe(false);
    });
  });

  describe('features', () => {
    test('hasFetch returns boolean', () => {
      expect(typeof features.hasFetch()).toBe('boolean');
    });

    test('hasAbortController returns boolean', () => {
      expect(typeof features.hasAbortController()).toBe('boolean');
    });

    test('hasNativeEsm returns boolean', () => {
      expect(typeof features.hasNativeEsm()).toBe('boolean');
    });

    test('hasAsyncLocalStorage returns boolean', () => {
      expect(typeof features.hasAsyncLocalStorage()).toBe('boolean');
    });
  });
});
