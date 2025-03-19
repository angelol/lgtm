/**
 * Tests for Content Viewer Component
 */

import { ContentViewer, ContentViewerOptions } from '../../src/ui/content-viewer.js';
import { getTheme } from '../../src/ui/theme.js';
import { ColorTheme } from '../../src/ui/types.js';

// Mock Node.js modules
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    close: jest.fn(),
    output: null
  })
}));

// Mock process.stdin
const mockStdin = {
  setRawMode: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleClear = console.clear;

describe('Content Viewer Component', () => {
  // Test data with 50 lines of content
  const testContent = Array.from({ length: 50 }, (_, i) => `Line ${i + 1} of content`);
  
  // Store original process.stdin
  const originalStdin = process.stdin;
  
  beforeEach(() => {
    // Mock process.stdin
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true
    });
    
    // Mock console methods
    console.log = jest.fn();
    console.clear = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore process.stdin
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true
    });
    
    // Restore console methods
    console.log = originalConsoleLog;
    console.clear = originalConsoleClear;
  });

  it('should create a content viewer with default options', () => {
    const viewer = new ContentViewer(testContent);
    
    // Default theme should be used
    expect((viewer as any).theme).toEqual(getTheme());
    
    // Content should be stored
    expect((viewer as any).content).toEqual(testContent);
    
    // Should start at line 0
    expect((viewer as any).currentLine).toBe(0);
  });
  
  it('should handle string content by splitting into lines', () => {
    const stringContent = 'Line 1\nLine 2\nLine 3';
    const viewer = new ContentViewer(stringContent);
    
    expect((viewer as any).content).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });
  
  it('should apply custom options', () => {
    const customTheme = { ...getTheme(), primary: '#ff0000' };
    const options: ContentViewerOptions = {
      maxHeight: 30,
      title: 'Test Content',
      theme: customTheme,
      showLineNumbers: true,
      showHelp: true
    };
    
    const viewer = new ContentViewer(testContent, options);
    
    expect((viewer as any).theme).toEqual(customTheme);
    expect((viewer as any).options).toEqual(options);
  });
  
  it('should start and close the viewer', async () => {
    const viewer = new ContentViewer(testContent);
    
    // Set up mock behavior for quit action
    const triggerActionSpy = jest.spyOn(viewer as any, 'triggerAction');
    
    // Set a timeout to trigger the quit action
    setTimeout(() => {
      const quitCallback = (viewer as any).actionListeners.find(
        (l: any) => l.toString().includes('quit')
      );
      if (quitCallback) quitCallback('quit');
    }, 10);
    
    // Start the viewer
    await viewer.start();
    
    // Verify start behavior
    expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
    expect(mockStdin.on).toHaveBeenCalledWith('keypress', expect.any(Function));
    expect(console.clear).toHaveBeenCalled();
    
    // Verify close behavior
    expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
    expect(mockStdin.removeListener).toHaveBeenCalledWith('keypress', expect.any(Function));
  });
  
  it('should render content correctly', () => {
    const viewer = new ContentViewer(testContent.slice(0, 10));
    
    // Mock getContentHeight to return a fixed value for testing
    jest.spyOn(viewer as any, 'getContentHeight').mockReturnValue(5);
    
    // Call render
    (viewer as any).render();
    
    // Should clear the console
    expect(console.clear).toHaveBeenCalled();
    
    // Should render the content lines
    expect(console.log).toHaveBeenCalledWith(testContent[0]);
    expect(console.log).toHaveBeenCalledWith(testContent[4]);
    
    // Should render controls
    const controlsCalls = (console.log as jest.Mock).mock.calls.filter(
      call => call[0] && typeof call[0] === 'string' && call[0].includes('Lines 1-')
    );
    expect(controlsCalls.length).toBeGreaterThan(0);
  });
  
  it('should navigate between pages', () => {
    const viewer = new ContentViewer(testContent);
    
    // Mock getContentHeight to return a fixed value for testing
    jest.spyOn(viewer as any, 'getContentHeight').mockReturnValue(10);
    
    // Mock render to verify it's called after navigation
    const renderSpy = jest.spyOn(viewer as any, 'render').mockImplementation(() => {});
    
    // Initial position should be line 0
    expect((viewer as any).currentLine).toBe(0);
    
    // Navigate to next page
    (viewer as any).nextPage();
    expect((viewer as any).currentLine).toBe(10);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    
    // Navigate to next page again
    (viewer as any).nextPage();
    expect((viewer as any).currentLine).toBe(20);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    
    // Navigate back to previous page
    (viewer as any).previousPage();
    expect((viewer as any).currentLine).toBe(10);
    expect(renderSpy).toHaveBeenCalledTimes(3);
    
    // Navigate back to first page
    (viewer as any).previousPage();
    expect((viewer as any).currentLine).toBe(0);
    expect(renderSpy).toHaveBeenCalledTimes(4);
    
    // Try to go before first page (should stay at 0)
    (viewer as any).previousPage();
    expect((viewer as any).currentLine).toBe(0);
    expect(renderSpy).toHaveBeenCalledTimes(5);
  });
  
  it('should toggle help display', () => {
    const viewer = new ContentViewer(testContent);
    
    // Mock render to verify it's called after toggling help
    const renderSpy = jest.spyOn(viewer as any, 'render').mockImplementation(() => {});
    
    // Help should be hidden by default
    expect((viewer as any).showingHelp).toBe(false);
    
    // Toggle help
    (viewer as any).toggleHelp();
    expect((viewer as any).showingHelp).toBe(true);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    
    // Toggle help again
    (viewer as any).toggleHelp();
    expect((viewer as any).showingHelp).toBe(false);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
  
  it('should handle keyboard input correctly', () => {
    const viewer = new ContentViewer(testContent);
    
    // Mock action methods
    const nextPageSpy = jest.spyOn(viewer as any, 'nextPage').mockImplementation(() => {});
    const previousPageSpy = jest.spyOn(viewer as any, 'previousPage').mockImplementation(() => {});
    const toggleHelpSpy = jest.spyOn(viewer as any, 'toggleHelp').mockImplementation(() => {});
    
    // Create a mock key press handler
    const keyPressHandler = (viewer as any).handleKeyPress.bind(viewer);
    
    // Test 'n' key for next page
    keyPressHandler('n', { name: 'n', ctrl: false, meta: false, shift: false });
    expect(nextPageSpy).toHaveBeenCalledTimes(1);
    
    // Test 'p' key for previous page
    keyPressHandler('p', { name: 'p', ctrl: false, meta: false, shift: false });
    expect(previousPageSpy).toHaveBeenCalledTimes(1);
    
    // Test 'h' key for help
    keyPressHandler('h', { name: 'h', ctrl: false, meta: false, shift: false });
    expect(toggleHelpSpy).toHaveBeenCalledTimes(1);
    
    // Test custom action
    const actionListenerSpy = jest.fn();
    (viewer as any).actionListeners.push((action: string) => {
      if (action === 'quit') actionListenerSpy(action);
    });
    
    keyPressHandler('q', { name: 'q', ctrl: false, meta: false, shift: false });
    expect(actionListenerSpy).toHaveBeenCalledWith('quit');
  });
  
  it('should calculate content height correctly', () => {
    // Mock terminal height
    Object.defineProperty(process.stdout, 'rows', { value: 30, configurable: true });
    
    // With default options
    const defaultViewer = new ContentViewer(testContent);
    expect((defaultViewer as any).getContentHeight()).toBe(28); // 30 - 2 (controls)
    
    // With title
    const titleViewer = new ContentViewer(testContent, { title: 'Test Content' });
    expect((titleViewer as any).getContentHeight()).toBe(26); // 30 - 2 (title) - 2 (controls)
    
    // With help shown
    const helpViewer = new ContentViewer(testContent, { showHelp: true });
    expect((helpViewer as any).getContentHeight()).toBe(24); // 30 - 2 (controls) - 4 (help)
    
    // With explicit max height
    const maxHeightViewer = new ContentViewer(testContent, { maxHeight: 20 });
    expect((maxHeightViewer as any).getContentHeight()).toBe(18); // 20 - 2 (controls)
  });
  
  it('should report pagination state correctly', () => {
    const viewer = new ContentViewer(testContent);
    
    // Mock getContentHeight to return a fixed value for testing
    jest.spyOn(viewer as any, 'getContentHeight').mockReturnValue(10);
    
    // At the start
    expect((viewer as any).hasPreviousPage()).toBe(false);
    expect((viewer as any).hasNextPage()).toBe(true);
    
    // Move to middle
    (viewer as any).currentLine = 20;
    expect((viewer as any).hasPreviousPage()).toBe(true);
    expect((viewer as any).hasNextPage()).toBe(true);
    
    // Move to end
    (viewer as any).currentLine = 40;
    expect((viewer as any).hasPreviousPage()).toBe(true);
    expect((viewer as any).hasNextPage()).toBe(false);
  });
  
  it('should handle event listeners correctly', () => {
    const viewer = new ContentViewer(testContent);
    
    // Test on() method
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    viewer.on('next', listener1);
    viewer.on('all', listener2);
    
    // Trigger an action
    (viewer as any).triggerAction('next');
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    
    // Test once() method
    const onceListener = jest.fn();
    viewer.once('quit', onceListener);
    
    // Trigger action
    (viewer as any).triggerAction('quit');
    expect(onceListener).toHaveBeenCalledTimes(1);
    
    // Trigger again should not call the listener
    (viewer as any).triggerAction('quit');
    expect(onceListener).toHaveBeenCalledTimes(1);
  });
}); 