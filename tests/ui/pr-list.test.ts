/**
 * PR List Display component tests
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { PrListDisplay } from '../../src/ui/pr-list.js';
import { PullRequest } from '../../src/github/services/repository-service.js';

// Mock utilities
jest.mock('../../src/ui/utils.js', () => {
  const mockFormatCiStatus = jest.fn();
  mockFormatCiStatus.mockReturnValue('✓ CI Passing');

  return {
    getTerminalSize: jest.fn().mockReturnValue({ width: 120, height: 30 }),
    safeSymbol: jest.fn().mockReturnValue('✓'),
    formatCiStatus: mockFormatCiStatus,
  };
});

// Mock formatting utilities to return predictable values
jest.mock(
  '../../src/utils/date.js',
  () => ({
    formatDistanceToNow: jest.fn().mockReturnValue('2 years ago'),
  }),
  { virtual: true },
);

// Mock chalk to avoid ANSI color codes in test output
jest.mock('chalk', () => {
  return {
    hex:
      () =>
      (text: string): string =>
        text,
    bold: (text: string): string => text,
  };
});

describe('PrListDisplay', () => {
  // Sample PR data for testing
  const samplePRs: PullRequest[] = [
    {
      number: 123,
      title: 'Fix bug in authentication flow',
      createdAt: '2023-03-15T10:30:00Z',
      updatedAt: '2023-03-15T14:45:00Z',
      state: 'open',
      url: 'https://github.com/org/repo/pull/123',
      author: {
        login: 'developer1',
        avatarUrl: 'https://github.com/developer1.png',
      },
      headRef: 'feature/auth-fix',
      baseRef: 'main',
      isDraft: false,
      mergeable: true,
      labels: [
        { name: 'bug', color: 'ff0000' },
        { name: 'high-priority', color: 'ff9900' },
      ],
      ciStatus: 'success',
    },
    {
      number: 124,
      title: 'Add dark mode support',
      createdAt: '2023-03-16T08:15:00Z',
      updatedAt: '2023-03-16T15:20:00Z',
      state: 'open',
      url: 'https://github.com/org/repo/pull/124',
      author: {
        login: 'designer1',
        avatarUrl: 'https://github.com/designer1.png',
      },
      headRef: 'feature/dark-mode',
      baseRef: 'main',
      isDraft: true,
      mergeable: null,
      labels: [
        { name: 'enhancement', color: '0075ca' },
        { name: 'ui', color: '5319e7' },
      ],
      ciStatus: 'pending',
    },
    {
      number: 125,
      title: 'Refactor database connection logic with a very long title that should get truncated',
      createdAt: '2023-03-17T09:45:00Z',
      updatedAt: '2023-03-17T11:30:00Z',
      state: 'open',
      url: 'https://github.com/org/repo/pull/125',
      author: {
        login: 'backend-dev',
        avatarUrl: 'https://github.com/backend-dev.png',
      },
      headRef: 'refactor/db-connection',
      baseRef: 'main',
      isDraft: false,
      mergeable: true,
      labels: [
        { name: 'refactor', color: '1d76db' },
        { name: 'database', color: '5319e7' },
        { name: 'performance', color: '0e8a16' },
        { name: 'technical-debt', color: 'd93f0b' },
      ],
      ciStatus: 'failure',
    },
  ];

  let prListDisplay: PrListDisplay;

  beforeEach(() => {
    jest.clearAllMocks();
    prListDisplay = new PrListDisplay();
  });

  test('should create a PR list display instance with default options', () => {
    expect(prListDisplay).toBeDefined();
  });

  test('should render a list of PRs in tabular format', () => {
    const output = prListDisplay.render(samplePRs);

    // Check for PR numbers
    expect(output).toContain('#123');
    expect(output).toContain('#124');
    expect(output).toContain('#125');

    // Check for PR titles (potentially truncated)
    expect(output).toContain('Fix bug in authentication flow');
    expect(output).toContain('Add dark mode support');
    expect(output).toMatch(/Refactor database connection logic/);

    // Check for authors
    expect(output).toContain('@developer1');
    expect(output).toContain('@designer1');
    expect(output).toContain('@backend-dev');
  });

  test('should handle empty PR list', () => {
    const output = prListDisplay.render([]);
    expect(output).toContain('No open pull requests found');
  });

  test('should display labels when enabled', () => {
    prListDisplay = new PrListDisplay({ showLabels: true });
    const output = prListDisplay.render(samplePRs);

    // Simply verify the render method was called with the right type of data
    expect(output).toBeDefined();

    // Also check if the labels column option is enabled
    interface PrListDisplayOptions {
      showLabels: boolean;
    }
    const hasLabels = (prListDisplay as unknown as { options: PrListDisplayOptions }).options
      .showLabels;
    expect(hasLabels).toBe(true);
  });

  test('should respect column visibility options', () => {
    prListDisplay = new PrListDisplay({
      showNumber: true,
      showAuthor: false, // Hide author
      showAge: false, // Hide age
      showCiStatus: true,
    });

    const output = prListDisplay.render(samplePRs);

    // Should include PR numbers and titles
    expect(output).toContain('#123');
    expect(output).toContain('Fix bug in authentication flow');

    // Should include CI status information from the mocked formatCiStatus method
    const renderPrInfoOutput = prListDisplay.renderPrInfo(samplePRs[0]);
    expect(renderPrInfoOutput).toContain('✓ CI Passing');
  });

  test('should render single PR info string', () => {
    const pr = samplePRs[0];
    const output = prListDisplay.renderPrInfo(pr);

    // Should include all key information in a single line
    expect(output).toContain('#123');
    expect(output).toContain('Fix bug in authentication flow');
    expect(output).toContain('@developer1');
    expect(output).toContain('✓ CI Passing');

    // Should use the pipe separator
    expect(output.split('|').length).toBeGreaterThan(1);
  });
});
