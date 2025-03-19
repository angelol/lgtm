/**
 * Tests for Confirmation Prompts
 */

import inquirer from 'inquirer';
import { confirm, confirmFailingCi, confirmDangerousAction, ConfirmOptions } from '../../src/ui/confirm.js';
import { formatCiStatus } from '../../src/ui/utils.js';

// Mock inquirer.prompt
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

// Mock formatCiStatus
jest.mock('../../src/ui/utils.js', () => ({
  formatCiStatus: jest.fn().mockImplementation((status) => {
    if (status === 'success') return '✓ CI Passing';
    if (status === 'failure') return '✗ CI Failed';
    return '? CI Unknown';
  })
}));

describe('Confirmation Prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should display a basic confirmation prompt', async () => {
    // Mock the inquirer.prompt to return true
    (inquirer.prompt as jest.Mock).mockResolvedValue({ answer: true });
    
    const options: ConfirmOptions = {
      message: 'Are you sure?'
    };
    
    const result = await confirm(options);
    
    // Verify correct result is returned
    expect(result).toBe(true);
    
    // Verify inquirer was called with the right parameters
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    expect(inquirer.prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
        name: 'answer',
        message: 'Are you sure?',
        default: false
      })
    ]);
  });
  
  it('should return false when user cancels', async () => {
    // Mock the inquirer.prompt to return false
    (inquirer.prompt as jest.Mock).mockResolvedValue({ answer: false });
    
    const result = await confirm({ message: 'Continue?' });
    
    // Verify false is returned
    expect(result).toBe(false);
  });
  
  it('should use default value from options', async () => {
    // Mock the inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ answer: true });
    
    await confirm({
      message: 'Continue with default yes?',
      defaultValue: true
    });
    
    // Verify default value was passed to inquirer
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    expect(promptCall.default).toBe(true);
  });
  
  it('should handle CI failure confirmation', async () => {
    // Mock the inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ answer: false });
    
    // Mock formatCiStatus
    (formatCiStatus as jest.Mock).mockReturnValue('✗ CI Failed');
    
    const result = await confirmFailingCi(123, 'Fix authentication bug');
    
    // Verify false is returned
    expect(result).toBe(false);
    
    // Verify inquirer was called with the right parameters
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    
    // Verify CI status was requested
    expect(formatCiStatus).toHaveBeenCalledWith('failure');
    
    // Verify prompt contains PR number
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    const message = promptCall.message;
    expect(message).toContain('PR #123');
    expect(message).toContain('Fix authentication bug');
  });
  
  it('should handle dangerous action confirmation', async () => {
    // Mock the inquirer.prompt
    (inquirer.prompt as jest.Mock).mockResolvedValue({ answer: true });
    
    const result = await confirmDangerousAction('delete this repository', 'This action cannot be undone.');
    
    // Verify true is returned
    expect(result).toBe(true);
    
    // Verify inquirer was called with the right parameters
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    
    // Verify prompt contains warning message
    const promptCall = (inquirer.prompt as jest.Mock).mock.calls[0][0][0];
    const message = promptCall.message;
    expect(message).toContain('delete this repository');
    expect(message).toContain('This action cannot be undone.');
  });
}); 