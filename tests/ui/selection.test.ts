/**
 * Tests for Selection UI Component
 */

import inquirer from 'inquirer';
import { selectPullRequest, PrSelectionOptions } from '../../src/ui/selection.js';
import { PullRequest } from '../../src/github/services/repository-service.js';
import { getTheme } from '../../src/ui/theme.js';

// Mock inquirer.prompt to avoid actual prompts during tests
jest.mock('inquirer');

describe('Selection UI Component', () => {
  // Create sample PR data for tests
  const mockPRs: PullRequest[] = [
    {
      number: 123,
      title: 'Fix bug in authentication',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'open',
      url: 'https://github.com/owner/repo/pull/123',
      author: {
        login: 'developer1',
        avatarUrl: 'https://github.com/avatar/developer1'
      },
      headRef: 'feature-branch',
      baseRef: 'main',
      isDraft: false,
      mergeable: true,
      labels: [{ name: 'bug', color: 'ff0000' }],
      ciStatus: 'success'
    },
    {
      number: 124,
      title: 'Add new feature',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: 'open',
      url: 'https://github.com/owner/repo/pull/124',
      author: {
        login: 'developer2',
        avatarUrl: 'https://github.com/avatar/developer2'
      },
      headRef: 'feature-branch-2',
      baseRef: 'main',
      isDraft: false,
      mergeable: true,
      labels: [{ name: 'enhancement', color: '00ff00' }],
      ciStatus: 'pending'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
  });

  it('should display a list of pull requests and return selected PR number', async () => {
    // Mock the inquirer.prompt to return the first PR
    (inquirer.prompt as jest.Mock).mockResolvedValue({ selectedPr: 123 });
    
    const result = await selectPullRequest(mockPRs);
    
    // Verify correct PR number is returned
    expect(result).toBe(123);
    
    // Verify inquirer was called with the right parameters
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'selectedPr',
        message: 'Select a PR to approve:'
      })
    ]);
    
    // Verify the choices include the PRs and a cancel option
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.choices.length).toBe(4); // 2 PRs + separator + cancel option
    
    // Verify PR values are correct
    expect(promptCall.choices[0].value).toBe(123);
    expect(promptCall.choices[1].value).toBe(124);
    expect(promptCall.choices[3].value).toBe(null); // Cancel option
  });

  it('should return null when cancel is selected', async () => {
    // Mock the inquirer.prompt to return null (cancel option)
    (inquirer.prompt as jest.Mock).mockResolvedValue({ selectedPr: null });
    
    const result = await selectPullRequest(mockPRs);
    
    // Verify null is returned
    expect(result).toBe(null);
  });

  it('should use provided options for customization', async () => {
    // Mock inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ selectedPr: 124 });
    
    const options: PrSelectionOptions = {
      message: 'Custom message:',
      pageSize: 5,
      theme: getTheme('dark')
    };
    
    const result = await selectPullRequest(mockPRs, options);
    
    // Verify return value
    expect(result).toBe(124);
    
    // Verify options were passed to inquirer
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.message).toBe('Custom message:');
    expect(promptCall.pageSize).toBe(5);
  });
}); 