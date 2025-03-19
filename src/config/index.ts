/**
 * Configuration Management Module
 * 
 * This module manages user configuration and settings.
 */

import Configstore from 'configstore';
import chalk from 'chalk';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  // Default behavior for CI status checking
  requireCiPass: true,
  
  // Default comment when approving PRs
  approvalComment: 'LGTM 👍',
  
  // Terminal UI settings
  ui: {
    colorEnabled: true,
    showSpinner: true,
    compactMode: false,
  },
  
  // GitHub API settings
  github: {
    apiBaseUrl: 'https://api.github.com',
    webBaseUrl: 'https://github.com',
    maxRetryCount: 3,
    retryDelay: 1000,
  },
};

/**
 * Configuration class for managing user settings
 */
export class Config {
  private store: Configstore;
  
  /**
   * Creates a new configuration instance
   */
  constructor() {
    try {
      this.store = new Configstore('lgtm-cli', DEFAULT_CONFIG);
    } catch (error) {
      console.error(chalk.red('Error initializing configuration:'), error);
      // Create an in-memory store that will not persist if we can't write to disk
      this.store = {
        all: { ...DEFAULT_CONFIG },
        get: (key: string) => this.getNestedValue(this.store.all, key),
        set: (key: string, value: unknown) => {
          this.setNestedValue(this.store.all, key, value);
        },
        delete: (key: string) => {
          this.deleteNestedValue(this.store.all, key);
        },
        clear: () => {
          this.store.all = { ...DEFAULT_CONFIG };
        },
        path: 'memory-only',
      } as unknown as Configstore;
      
      console.warn(
        chalk.yellow('Using in-memory configuration that will not be persisted.')
      );
    }
  }
  
  /**
   * Gets a configuration value
   * 
   * @param key - Configuration key (can be nested with dots, e.g. 'ui.colorEnabled')
   * @param defaultValue - Default value if not found
   * @returns The configuration value or default value
   */
  get<T>(key: string, defaultValue?: T): T {
    return this.store.get(key) ?? defaultValue;
  }
  
  /**
   * Sets a configuration value
   * 
   * @param key - Configuration key
   * @param value - Value to set
   */
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
  
  /**
   * Deletes a configuration value
   * 
   * @param key - Configuration key
   */
  delete(key: string): void {
    this.store.delete(key);
  }
  
  /**
   * Gets all configuration values
   * 
   * @returns All configuration values
   */
  getAll(): Record<string, unknown> {
    return this.store.all;
  }
  
  /**
   * Resets all configuration to defaults
   */
  reset(): void {
    this.store.clear();
    
    // Re-apply defaults after clearing
    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      this.store.set(key, value);
    }
  }
  
  /**
   * Gets a nested value from an object using a dot-notated key
   * 
   * @param obj - Object to get value from
   * @param key - Dot-notated key (e.g. 'a.b.c')
   * @returns The value at the specified path or undefined
   */
  private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
    const keys = key.split('.');
    let result = obj;
    
    for (const k of keys) {
      if (result == null || typeof result !== 'object') {
        return undefined;
      }
      
      result = result[k] as Record<string, unknown>;
    }
    
    return result;
  }
  
  /**
   * Sets a nested value in an object using a dot-notated key
   * 
   * @param obj - Object to set value in
   * @param key - Dot-notated key (e.g. 'a.b.c')
   * @param value - Value to set
   */
  private setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      return;
    }
    
    let current = obj;
    
    for (const k of keys) {
      if (current[k] == null || typeof current[k] !== 'object') {
        current[k] = {};
      }
      
      current = current[k] as Record<string, unknown>;
    }
    
    current[lastKey] = value;
  }
  
  /**
   * Deletes a nested value in an object using a dot-notated key
   * 
   * @param obj - Object to delete value from
   * @param key - Dot-notated key (e.g. 'a.b.c')
   */
  private deleteNestedValue(obj: Record<string, unknown>, key: string): void {
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      return;
    }
    
    let current = obj;
    
    for (const k of keys) {
      if (current[k] == null || typeof current[k] !== 'object') {
        return;
      }
      
      current = current[k] as Record<string, unknown>;
    }
    
    delete current[lastKey];
  }
}

/**
 * Singleton instance of the configuration
 */
export const config = new Config(); 