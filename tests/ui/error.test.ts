/**
 * Tests for Error Formatting module
 */

import {
  formatError,
  formatInlineError,
  validationError,
  multiValidationError,
} from '../../src/ui/error.js';

// Mock the box components to avoid actual terminal output
jest.mock('../../src/ui/box.js', () => ({
  errorBox: jest.fn((content, title) => `ERROR-BOX: ${title} - ${content}`),
  warningBox: jest.fn((content, title) => `WARNING-BOX: ${title} - ${content}`),
  infoBox: jest.fn((content, title) => `INFO-BOX: ${title} - ${content}`),
  createBox: jest.fn((content) => `BOX: ${content}`),
}));

describe('Error Formatting', () => {
  describe('formatError', () => {
    test('should format error message with title', () => {
      const result = formatError('Something went wrong', 'error');
      expect(result).toContain('ERROR-BOX');
      expect(result).toContain('Something went wrong');
    });
    
    test('should format warning message', () => {
      const result = formatError('This is a warning', 'warning');
      expect(result).toContain('WARNING-BOX');
      expect(result).toContain('This is a warning');
    });
    
    test('should format info message', () => {
      const result = formatError('Informational message', 'info');
      expect(result).toContain('INFO-BOX');
      expect(result).toContain('Informational message');
    });
    
    test('should include details if provided', () => {
      const result = formatError('Error message', 'error', 'Error details here');
      expect(result).toContain('Error message');
      expect(result).toContain('Error details here');
    });
    
    test('should include suggestions if provided', () => {
      const suggestions = ['Try this', 'Or try that'];
      const result = formatError('Error message', 'error', undefined, suggestions);
      expect(result).toContain('Error message');
      expect(result).toContain('Suggestions');
      suggestions.forEach(suggestion => {
        expect(result).toContain(suggestion);
      });
    });
  });
  
  describe('formatInlineError', () => {
    test('should format inline error message', () => {
      const result = formatInlineError('Invalid input');
      expect(result).toContain('Invalid input');
    });
    
    test('should use appropriate formatting for different error levels', () => {
      const errorResult = formatInlineError('Error message', 'error');
      const warningResult = formatInlineError('Warning message', 'warning');
      const infoResult = formatInlineError('Info message', 'info');
      
      expect(errorResult).toContain('Error message');
      expect(warningResult).toContain('Warning message');
      expect(infoResult).toContain('Info message');
    });
  });
  
  describe('validationError', () => {
    test('should format validation error message', () => {
      const result = validationError('Invalid format');
      expect(result).toContain('Invalid format');
    });
    
    test('should include field name if provided', () => {
      const result = validationError('is required', 'Username');
      expect(result).toContain('Username');
      expect(result).toContain('is required');
    });
  });
  
  describe('multiValidationError', () => {
    test('should format multiple validation errors', () => {
      const errors = {
        username: 'is required',
        password: 'must be at least 8 characters',
        email: 'invalid format'
      };
      
      const result = multiValidationError(errors);
      
      expect(result).toContain('username');
      expect(result).toContain('is required');
      expect(result).toContain('password');
      expect(result).toContain('must be at least 8 characters');
      expect(result).toContain('email');
      expect(result).toContain('invalid format');
    });
  });
}); 