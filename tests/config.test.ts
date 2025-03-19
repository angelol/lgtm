import { Config, DEFAULT_CONFIG } from '../src/config';
import { jest } from '@jest/globals';

// Create a mock implementation without using jest.mock
class MockConfigstore {
  all: Record<string, unknown>;
  path: string;

  constructor() {
    this.all = { ...DEFAULT_CONFIG };
    this.path = 'test-config-path';
  }

  get(key: string): unknown {
    const keysArray = key.split('.');
    let result: any = this.all;

    for (const k of keysArray) {
      if (result == null || typeof result !== 'object') return undefined;
      result = result[k];
    }

    return result;
  }

  set(key: string, value: unknown): void {
    const keysArray = key.split('.');
    if (keysArray.length === 1) {
      this.all[key] = value;
      return;
    }

    const lastKey = keysArray.pop() as string;
    let target: Record<string, unknown> = this.all;

    for (const k of keysArray) {
      if (target[k] === undefined || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k] as Record<string, unknown>;
    }

    target[lastKey] = value;
  }

  delete(key: string): void {
    const keysArray = key.split('.');
    if (keysArray.length === 1) {
      delete this.all[key];
      return;
    }

    const lastKey = keysArray.pop() as string;
    let target: Record<string, unknown> = this.all;

    for (const k of keysArray) {
      if (target[k] === undefined || typeof target[k] !== 'object') {
        return;
      }
      target = target[k] as Record<string, unknown>;
    }

    delete target[lastKey];
  }

  clear(): void {
    this.all = {};
  }
}

// Mock the Configstore import in the Config module
jest.mock('configstore', () => {
  return function () {
    return new MockConfigstore();
  };
});

describe('Configuration Management', () => {
  let config: Config;

  beforeEach(() => {
    // Create a new Config instance for each test
    config = new Config();
  });

  describe('get', () => {
    test('gets simple values', () => {
      const result = config.get('requireCiPass');
      expect(result).toBe(true);
    });

    test('gets nested values', () => {
      const result = config.get('ui.colorEnabled');
      expect(result).toBe(true);
    });

    test('returns undefined for non-existent keys', () => {
      const result = config.get('nonExistentKey');
      expect(result).toBeUndefined();
    });

    test('returns default value for non-existent keys', () => {
      const result = config.get('nonExistentKey', 'defaultValue');
      expect(result).toBe('defaultValue');
    });
  });

  describe('set', () => {
    test('sets simple values', () => {
      config.set('requireCiPass', false);
      expect(config.get('requireCiPass')).toBe(false);
    });

    test('sets nested values', () => {
      config.set('ui.colorEnabled', false);
      expect(config.get('ui.colorEnabled')).toBe(false);
    });

    test('creates nested objects if they do not exist', () => {
      config.set('newCategory.newSetting', 'value');
      expect(config.get('newCategory.newSetting')).toBe('value');
    });
  });

  describe('delete', () => {
    test('deletes simple values', () => {
      config.delete('requireCiPass');
      expect(config.get('requireCiPass')).toBeUndefined();
    });

    test('deletes nested values', () => {
      config.delete('ui.colorEnabled');
      expect(config.get('ui.colorEnabled')).toBeUndefined();

      // Parent object should still exist
      expect(config.get('ui')).toBeDefined();
    });
  });

  describe('getAll', () => {
    test('returns all configuration', () => {
      const all = config.getAll();
      // The exact object might be different due to the mock, so we'll just check for key properties
      expect(all).toHaveProperty('requireCiPass');
      expect(all).toHaveProperty('ui');
      expect(all).toHaveProperty('github');
    });
  });

  describe('reset', () => {
    test('resets all configuration to defaults', () => {
      // Change some settings
      config.set('requireCiPass', false);
      config.set('ui.colorEnabled', false);
      config.set('newSetting', 'value');

      // Reset all settings
      config.reset();

      // Should have default values
      expect(config.get('requireCiPass')).toBe(DEFAULT_CONFIG.requireCiPass);
      expect(config.get('ui.colorEnabled')).toBe(DEFAULT_CONFIG.ui.colorEnabled);

      // Custom settings should be removed
      expect(config.get('newSetting')).toBeUndefined();
    });
  });
});
