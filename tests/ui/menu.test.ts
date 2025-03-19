/**
 * Tests for Menu UI Component
 */

import inquirer from 'inquirer';
import { showActionMenu, MenuItem, ActionMenuOptions } from '../../src/ui/menu.js';
import { getTheme } from '../../src/ui/theme.js';

// Mock inquirer.prompt to avoid actual prompts during tests
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
  Separator: jest.fn().mockImplementation(function() {
    this.type = 'separator';
    return this;
  })
}));

describe('Menu UI Component', () => {
  // Sample menu items
  const menuItems: MenuItem<string>[] = [
    {
      name: 'View Description',
      value: 'view-description',
      description: 'View the PR description'
    },
    {
      name: 'Review Changes',
      value: 'review-changes',
      description: 'Review the code changes'
    },
    {
      name: 'Open in Browser',
      value: 'open-browser',
      description: 'Open the PR in your web browser'
    },
    {
      name: 'Approve',
      value: 'approve',
      description: 'Approve the PR'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should display an action menu and return selected action', async () => {
    // Mock inquirer.prompt to return 'approve'
    (inquirer.prompt as jest.Mock).mockResolvedValue({ action: 'approve' });
    
    const result = await showActionMenu(menuItems);
    
    // Verify correct action is returned
    expect(result).toBe('approve');
    
    // Verify inquirer was called with the right parameters
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?'
      })
    ]);
    
    // Verify the choices include the menu items and a cancel option
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.choices.length).toBe(6); // 4 actions + separator + cancel option
    
    // Verify menu item values are correct
    expect(promptCall.choices[0].value).toBe('view-description');
    expect(promptCall.choices[1].value).toBe('review-changes');
    expect(promptCall.choices[2].value).toBe('open-browser');
    expect(promptCall.choices[3].value).toBe('approve');
    expect(promptCall.choices[5].value).toBe(null); // Cancel option
  });

  it('should return null when cancel is selected', async () => {
    // Mock inquirer.prompt to return null (cancel option)
    (inquirer.prompt as jest.Mock).mockResolvedValue({ action: null });
    
    const result = await showActionMenu(menuItems);
    
    // Verify null is returned
    expect(result).toBe(null);
  });

  it('should use provided options for customization', async () => {
    // Mock inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ action: 'review-changes' });
    
    const options: ActionMenuOptions = {
      message: 'Custom menu prompt:',
      pageSize: 6,
      theme: getTheme('dark')
    };
    
    const result = await showActionMenu(menuItems, options);
    
    // Verify return value
    expect(result).toBe('review-changes');
    
    // Verify options were passed to inquirer
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.message).toBe('Custom menu prompt:');
    expect(promptCall.pageSize).toBe(6);
  });
  
  it('should handle disabled menu items', async () => {
    // Create new menu items with a disabled item
    const itemsWithDisabled: MenuItem<string>[] = [
      ...menuItems,
      {
        name: 'Delete PR',
        value: 'delete',
        description: 'Delete this PR',
        disabled: 'You do not have permission to delete'
      }
    ];
    
    // Mock inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ action: 'open-browser' });
    
    const result = await showActionMenu(itemsWithDisabled);
    
    // Verify return value
    expect(result).toBe('open-browser');
    
    // Verify disabled item was passed to inquirer correctly
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.choices[4].disabled).toBe('You do not have permission to delete');
  });
}); 