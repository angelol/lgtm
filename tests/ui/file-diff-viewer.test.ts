import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { FileDiffViewer } from '../../src/ui/file-diff-viewer.js';
import { PullRequestDiff, FileChange } from '../../src/github/models/content.js';

// Mock console.clear to avoid clearing test output
console.clear = jest.fn();

describe('FileDiffViewer', () => {
  let mockFiles: FileChange[];
  let mockDiff: PullRequestDiff;

  beforeEach(() => {
    mockFiles = [
      {
        filename: 'file1.js',
        status: 'modified',
        additions: 5,
        deletions: 3,
        changes: 8,
        isBinary: false,
        viewUrl: 'https://github.com/test/repo/file1.js',
        patch: '@@ -1,3 +1,5 @@ file1 content'
      },
      {
        filename: 'file2.css',
        status: 'added',
        additions: 10,
        deletions: 0,
        changes: 10,
        isBinary: false,
        viewUrl: 'https://github.com/test/repo/file2.css',
        patch: '@@ -0,0 +1,10 @@ file2 content'
      },
      {
        filename: 'file3.md',
        status: 'modified',
        additions: 2,
        deletions: 2,
        changes: 4,
        isBinary: false,
        viewUrl: 'https://github.com/test/repo/file3.md',
        patch: '@@ -1,5 +1,5 @@ file3 content'
      }
    ];
    
    mockDiff = {
      files: mockFiles,
      totalFiles: mockFiles.length,
      totalAdditions: 17,
      totalDeletions: 5,
      totalChanges: 22
    };
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize with the correct files and display the first file', () => {
    const viewer = new FileDiffViewer(mockDiff);
    expect(viewer.getCurrentFileIndex()).toBe(0);
    expect(viewer.getCurrentFile().filename).toBe('file1.js');
    expect(viewer.getTotalFiles()).toBe(3);
  });

  it('should navigate to the next file', () => {
    const viewer = new FileDiffViewer(mockDiff);
    
    // Start at file index 0
    expect(viewer.getCurrentFileIndex()).toBe(0);
    
    // Move to next file
    viewer.nextFile();
    expect(viewer.getCurrentFileIndex()).toBe(1);
    expect(viewer.getCurrentFile().filename).toBe('file2.css');
    
    // Move to last file
    viewer.nextFile();
    expect(viewer.getCurrentFileIndex()).toBe(2);
    expect(viewer.getCurrentFile().filename).toBe('file3.md');
    
    // Should not go beyond the last file
    viewer.nextFile();
    expect(viewer.getCurrentFileIndex()).toBe(2);
  });

  it('should navigate to the previous file', () => {
    const viewer = new FileDiffViewer(mockDiff);
    
    // Start with the last file
    viewer.setCurrentFileIndex(2);
    expect(viewer.getCurrentFileIndex()).toBe(2);
    
    // Move to previous file
    viewer.previousFile();
    expect(viewer.getCurrentFileIndex()).toBe(1);
    expect(viewer.getCurrentFile().filename).toBe('file2.css');
    
    // Move to first file
    viewer.previousFile();
    expect(viewer.getCurrentFileIndex()).toBe(0);
    expect(viewer.getCurrentFile().filename).toBe('file1.js');
    
    // Should not go before the first file
    viewer.previousFile();
    expect(viewer.getCurrentFileIndex()).toBe(0);
  });

  it('should check if there is a next or previous file', () => {
    const viewer = new FileDiffViewer(mockDiff);
    
    // First file
    viewer.setCurrentFileIndex(0);
    expect(viewer.hasNextFile()).toBe(true);
    expect(viewer.hasPreviousFile()).toBe(false);
    
    // Middle file
    viewer.setCurrentFileIndex(1);
    expect(viewer.hasNextFile()).toBe(true);
    expect(viewer.hasPreviousFile()).toBe(true);
    
    // Last file
    viewer.setCurrentFileIndex(2);
    expect(viewer.hasNextFile()).toBe(false);
    expect(viewer.hasPreviousFile()).toBe(true);
  });

  it('should emit events when navigating between files', () => {
    const viewer = new FileDiffViewer(mockDiff);
    
    const nextFileSpy = jest.fn();
    const previousFileSpy = jest.fn();
    
    viewer.on('nextFile', nextFileSpy);
    viewer.on('previousFile', previousFileSpy);
    
    viewer.nextFile();
    expect(nextFileSpy).toHaveBeenCalledWith(mockFiles[1], 1);
    
    viewer.previousFile();
    expect(previousFileSpy).toHaveBeenCalledWith(mockFiles[0], 0);
  });
}); 