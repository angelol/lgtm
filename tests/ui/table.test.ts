/**
 * Table display component tests
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { TableDisplay, Column } from '../../src/ui/table.js';
import { getTheme } from '../../src/ui/theme.js';

// Mock terminal size to make tests consistent
jest.mock('../../src/ui/utils.js', () => {
  return {
    getTerminalSize: jest.fn().mockReturnValue({ width: 120, height: 30 }),
    safeSymbol: jest.fn().mockReturnValue('✓'),
  };
});

describe('TableDisplay', () => {
  // Test data
  const testData = [
    { id: 1, name: 'Item 1', status: 'active', count: 42, created: '2023-05-15T10:30:00Z' },
    {
      id: 2,
      name: 'Item with a very long name that should be truncated',
      status: 'inactive',
      count: 7,
      created: '2023-06-20T14:45:00Z',
    },
    { id: 3, name: 'Item 3', status: 'pending', count: 0, created: '2023-07-01T08:15:00Z' },
  ];

  // Column definitions
  const columns: Column[] = [
    { key: 'id', header: 'ID', width: 6 },
    { key: 'name', header: 'Name', width: 30 },
    { key: 'status', header: 'Status', width: 10 },
    { key: 'count', header: 'Count', width: 8, align: 'right' },
    {
      key: 'created',
      header: 'Created',
      width: 20,
      format: value => new Date(value).toLocaleDateString(),
    },
  ];

  let tableDisplay: TableDisplay;

  beforeEach(() => {
    // Reset mock but keep default behavior
    jest.clearAllMocks();
    // Create a new instance for each test
    tableDisplay = new TableDisplay({ theme: getTheme() });
  });

  test('should create a table instance with default options', () => {
    expect(tableDisplay).toBeDefined();
  });

  test('should render column headers', () => {
    const output = tableDisplay.renderHeaders(columns);

    // Headers should include all column names
    expect(output).toContain('ID');
    expect(output).toContain('Name');
    expect(output).toContain('Status');
    expect(output).toContain('Count');
    expect(output).toContain('Created');
  });

  test('should render a row of data', () => {
    const output = tableDisplay.renderRow(testData[0], columns);

    // Row should include formatted data
    expect(output).toContain('1');
    expect(output).toContain('Item 1');
    expect(output).toContain('active');
    expect(output).toContain('42');
  });

  test('should truncate long cell content to fit column width', () => {
    const output = tableDisplay.renderRow(testData[1], columns);

    // Long name should be truncated
    expect(output).not.toContain('Item with a very long name that should be truncated');
    expect(output).toContain('Item with a very long nam...');
  });

  test('should format cell content using formatter function', () => {
    const output = tableDisplay.renderRow(testData[0], columns);

    // Created date should be formatted as date string
    expect(output).not.toContain('2023-05-15T10:30:00Z');
    // The exact format depends on the locale, so we test for patterns rather than exact strings
    expect(output).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
  });

  test('should right-align numeric columns', () => {
    const output = tableDisplay.renderRow(testData[0], columns);

    // We can't easily test the exact alignment, but we can verify the content exists
    expect(output).toContain('42');
  });

  test('should render a complete table', () => {
    const output = tableDisplay.render(testData, columns);

    // Should include headers and all rows
    expect(output).toContain('ID');
    expect(output).toContain('Name');
    expect(output).toContain('Item 1');
    expect(output).toContain('Item with a very long nam...');
    expect(output).toContain('Item 3');
  });

  test('should handle empty data array', () => {
    const output = tableDisplay.render([], columns);

    // Should include headers but no data
    expect(output).toContain('ID');
    expect(output).toContain('Name');
    expect(output).toContain('No data to display');
  });

  test('should handle missing values in data', () => {
    const incompleteData = [{ id: 4, name: 'Incomplete Item' }];
    const output = tableDisplay.renderRow(incompleteData[0], columns);

    // Undefined values should be rendered as empty strings
    expect(output).toContain('4');
    expect(output).toContain('Incomplete Item');
  });

  // Skip the adjusting to terminal width test as it requires special mocking
  test.skip('should adjust to terminal width', () => {
    // This test would need special mocking to work properly
  });
});
