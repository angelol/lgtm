/**
 * Version checking utilities
 * 
 * This module provides utilities for checking Node.js version compatibility.
 */

import semver from 'semver';

/**
 * Configuration for version checking
 */
export interface VersionCheckConfig {
  /**
   * Minimum Node.js version required
   */
  minVersion: string;
  
  /**
   * Maximum Node.js version supported (exclusive)
   */
  maxVersion: string;
  
  /**
   * Current Node.js version (defaults to process.versions.node)
   */
  currentVersion?: string;
}

/**
 * Result of a version check
 */
export interface VersionCheckResult {
  /**
   * Whether the current version is supported
   */
  isSupported: boolean;
  
  /**
   * The current Node.js version
   */
  currentVersion: string;
  
  /**
   * The version range that is supported
   */
  supportedRange: string;
  
  /**
   * Error message if version is not supported
   */
  errorMessage?: string;
}

/**
 * Default version check configuration
 */
export const DEFAULT_VERSION_CONFIG: VersionCheckConfig = {
  minVersion: '16.0.0',
  maxVersion: '24.0.0',
};

/**
 * Checks if the current Node.js version is supported
 * 
 * @param config - Configuration for version checking
 * @returns Result of the version check
 */
export function checkNodeVersion(
  config: VersionCheckConfig = DEFAULT_VERSION_CONFIG
): VersionCheckResult {
  const currentVersion = config.currentVersion || process.versions.node;
  const supportedRange = `>=${config.minVersion} <${config.maxVersion}`;
  
  const isSupported = semver.satisfies(currentVersion, supportedRange);
  
  let errorMessage: string | undefined;
  if (!isSupported) {
    errorMessage = `LGTM requires Node.js version ${supportedRange}. Current version: ${currentVersion}`;
  }
  
  return {
    isSupported,
    currentVersion,
    supportedRange,
    errorMessage,
  };
}

/**
 * Checks if the current Node.js version is supported and exits if not
 * 
 * @param config - Configuration for version checking
 * @returns Result of the version check if version is supported, never returns otherwise
 */
export function verifyNodeVersion(
  config: VersionCheckConfig = DEFAULT_VERSION_CONFIG
): VersionCheckResult {
  const result = checkNodeVersion(config);
  
  if (!result.isSupported && result.errorMessage) {
    console.error(`Error: ${result.errorMessage}`);
    process.exit(1);
  }
  
  return result;
}

/**
 * Checks if a specific Node.js API is available
 * 
 * @param apiCheckFn - Function to check if API exists
 * @returns Whether the API is available
 */
export function isApiAvailable(apiCheckFn: () => boolean): boolean {
  try {
    return apiCheckFn();
  } catch (error) {
    return false;
  }
}

/**
 * Feature detection for various Node.js APIs
 */
export const features = {
  /**
   * Checks if the Fetch API is natively available
   * @returns Whether fetch is available
   */
  hasFetch: (): boolean => isApiAvailable(() => typeof globalThis.fetch === 'function'),
  
  /**
   * Checks if the AbortController API is available
   * @returns Whether AbortController is available
   */
  hasAbortController: (): boolean => isApiAvailable(() => typeof AbortController === 'function'),
  
  /**
   * Checks if the native ESM modules are available
   * @returns Whether import.meta is available
   */
  hasNativeEsm: (): boolean => isApiAvailable(() => typeof import.meta === 'object'),
  
  /**
   * Checks if async local storage is available
   * @returns Whether AsyncLocalStorage is available
   */
  hasAsyncLocalStorage: (): boolean => {
    try {
      // Dynamic import to avoid syntax errors in Node.js versions that don't support it
      const nodeAsyncHooks = new Function('return require("async_hooks")')();
      return typeof nodeAsyncHooks.AsyncLocalStorage === 'function';
    } catch (error) {
      return false;
    }
  },
}; 