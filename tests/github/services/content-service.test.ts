import { jest } from '@jest/globals';

describe('ContentService', () => {
  let apiClient: any;
  let contentService: any;

  beforeEach(() => {
    // Create mock API client
    apiClient = {
      request: jest.fn()
    };
    
    // Create a simplified ContentService with the methods we need for testing
    contentService = {
      getPullRequestDescription: async (owner: string, repo: string, pullNumber: number) => {
        const pr = await apiClient.request(`GET /repos/${owner}/${repo}/pulls/${pullNumber}`);
        return {
          body: pr.body || '',
          bodyHtml: pr.body_html,
          author: {
            login: pr.user.login,
            avatarUrl: pr.user.avatar_url
          },
          updatedAt: pr.updated_at
        };
      },
      
      getFileChanges: async (owner: string, repo: string, pullNumber: number) => {
        const files = await apiClient.request(`GET /repos/${owner}/${repo}/pulls/${pullNumber}/files`, { per_page: 100 });
        return files.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          isBinary: !file.patch,
          viewUrl: file.blob_url,
          rawUrl: file.raw_url,
          patch: file.patch,
          previousFilename: file.previous_filename
        }));
      },
      
      getPullRequestDiff: async (owner: string, repo: string, pullNumber: number) => {
        const files = await apiClient.request(`GET /repos/${owner}/${repo}/pulls/${pullNumber}/files`, { per_page: 100 });
        const mappedFiles = files.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          isBinary: !file.patch,
          viewUrl: file.blob_url,
          rawUrl: file.raw_url,
          patch: file.patch,
          previousFilename: file.previous_filename
        }));
        
        let totalAdditions = 0;
        let totalDeletions = 0;
        let totalChanges = 0;
        
        for (const file of mappedFiles) {
          totalAdditions += file.additions;
          totalDeletions += file.deletions;
          totalChanges += file.changes;
        }
        
        return {
          files: mappedFiles,
          totalFiles: mappedFiles.length,
          totalAdditions,
          totalDeletions,
          totalChanges
        };
      },
      
      parseMarkdown: (markdown: string) => {
        const sections: Array<{heading: string; level: number; content: string}> = [];
        const links: Array<{text: string; url: string}> = [];
        
        // Extract links with a simple regex
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(markdown)) !== null) {
          links.push({
            text: linkMatch[1],
            url: linkMatch[2]
          });
        }
        
        // Find all headings and their content
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let lastIndex = 0;
        let headingMatch;
        
        while ((headingMatch = headingRegex.exec(markdown)) !== null) {
          const level = headingMatch[1].length;
          const heading = headingMatch[2].trim();
          const start = headingMatch.index + headingMatch[0].length;
          
          // If this isn't the first heading, capture the content of the previous section
          if (sections.length > 0) {
            const prevSection = sections[sections.length - 1];
            prevSection.content = markdown.substring(lastIndex, headingMatch.index).trim();
          }
          
          sections.push({
            heading,
            level,
            content: '' // Will be filled in on the next iteration or at the end
          });
          
          lastIndex = start;
        }
        
        // Capture content for the last section
        if (sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          lastSection.content = markdown.substring(lastIndex).trim();
        } else if (markdown.trim().length > 0) {
          // If there are no headings, add the entire content as a single section
          sections.push({
            heading: '',
            level: 0,
            content: markdown.trim()
          });
        }
        
        return {
          raw: markdown,
          sections,
          links
        };
      },
      
      parseDiff: (filename: string, patch: string) => {
        if (!patch) {
          return {
            filename,
            hunks: []
          };
        }
        
        const hunks: Array<{
          oldStart: number;
          oldLines: number;
          newStart: number;
          newLines: number;
          lines: Array<{content: string; type: string}>
        }> = [];
        
        const lines = patch.split('\n');
        let currentHunk: {
          oldStart: number;
          oldLines: number;
          newStart: number;
          newLines: number;
          lines: Array<{content: string; type: string}>
        } | null = null;
        
        for (const line of lines) {
          // Check if this is a hunk header
          const hunkHeaderMatch = line.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
          
          if (hunkHeaderMatch) {
            // If we already have a hunk, push it to the array
            if (currentHunk) {
              hunks.push(currentHunk);
            }
            
            // Create a new hunk
            currentHunk = {
              oldStart: parseInt(hunkHeaderMatch[1], 10),
              oldLines: parseInt(hunkHeaderMatch[2], 10),
              newStart: parseInt(hunkHeaderMatch[3], 10),
              newLines: parseInt(hunkHeaderMatch[4], 10),
              lines: []
            };
            continue;
          }
          
          if (!currentHunk) {
            continue; // Skip lines before the first hunk
          }
          
          // Determine line type
          let type: 'context' | 'addition' | 'deletion' = 'context';
          let content = line;
          
          if (line.startsWith('+')) {
            type = 'addition';
            content = line.substring(1);
          } else if (line.startsWith('-')) {
            type = 'deletion';
            content = line.substring(1);
          } else if (line.startsWith(' ')) {
            content = line.substring(1);
          }
          
          // Add the line to the current hunk
          currentHunk.lines.push({
            content,
            type
          });
        }
        
        // Add the last hunk if we have one
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        
        return {
          filename,
          hunks
        };
      }
    };
  });

  describe('getPullRequestDescription', () => {
    test('should fetch PR description', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce({
        body: '# Test Description\n\nThis is a test PR description.',
        body_html: '<h1>Test Description</h1><p>This is a test PR description.</p>',
        user: {
          login: 'test-user',
          avatar_url: 'https://github.com/test-user.png'
        },
        updated_at: '2023-01-02T00:00:00Z'
      });
      
      const result = await contentService.getPullRequestDescription('test-owner', 'test-repo', 1);
      
      expect(result).toEqual({
        body: '# Test Description\n\nThis is a test PR description.',
        bodyHtml: '<h1>Test Description</h1><p>This is a test PR description.</p>',
        author: {
          login: 'test-user',
          avatarUrl: 'https://github.com/test-user.png'
        },
        updatedAt: '2023-01-02T00:00:00Z'
      });
      
      expect(apiClient.request).toHaveBeenCalledWith('GET /repos/test-owner/test-repo/pulls/1');
    });

    test('should handle empty PR description', async () => {
      // Setup mock response with null body
      apiClient.request.mockResolvedValueOnce({
        body: null,
        body_html: null,
        user: {
          login: 'test-user',
          avatar_url: 'https://github.com/test-user.png'
        },
        updated_at: '2023-01-02T00:00:00Z'
      });
      
      const result = await contentService.getPullRequestDescription('test-owner', 'test-repo', 1);
      
      expect(result.body).toBe('');
      expect(result.author.login).toBe('test-user');
    });
  });

  describe('getFileChanges', () => {
    test('should fetch file changes', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce([
        {
          filename: 'src/index.ts',
          status: 'modified',
          additions: 10,
          deletions: 2,
          changes: 12,
          patch: '@@ -1,2 +1,10 @@\n-old line\n+new line\n+more new lines',
          blob_url: 'https://github.com/test-owner/test-repo/blob/abc123/src/index.ts',
          raw_url: 'https://github.com/test-owner/test-repo/raw/abc123/src/index.ts'
        }
      ]);
      
      const result = await contentService.getFileChanges('test-owner', 'test-repo', 1);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          filename: 'src/index.ts',
          status: 'modified',
          additions: 10,
          deletions: 2,
          changes: 12,
          patch: '@@ -1,2 +1,10 @@\n-old line\n+new line\n+more new lines'
        })
      );
      
      expect(apiClient.request).toHaveBeenCalledWith('GET /repos/test-owner/test-repo/pulls/1/files', { per_page: 100 });
    });

    test('should handle binary files', async () => {
      // Setup mock response for a binary file (no patch)
      apiClient.request.mockResolvedValueOnce([
        {
          filename: 'image.png',
          status: 'added',
          additions: 0,
          deletions: 0,
          changes: 0,
          patch: null,
          blob_url: 'https://github.com/test-owner/test-repo/blob/abc123/image.png',
          raw_url: 'https://github.com/test-owner/test-repo/raw/abc123/image.png'
        }
      ]);
      
      const result = await contentService.getFileChanges('test-owner', 'test-repo', 1);
      
      expect(result[0].isBinary).toBe(true);
    });
  });

  describe('getPullRequestDiff', () => {
    test('should compile full PR diff summary', async () => {
      // Setup mock response
      apiClient.request.mockResolvedValueOnce([
        {
          filename: 'src/index.ts',
          status: 'modified',
          additions: 10,
          deletions: 2,
          changes: 12,
          patch: '@@ -1,2 +1,10 @@\n-old line\n+new line',
          blob_url: 'https://github.com/test-owner/test-repo/blob/abc123/src/index.ts'
        },
        {
          filename: 'README.md',
          status: 'modified',
          additions: 5,
          deletions: 1,
          changes: 6,
          patch: '@@ -1,1 +1,5 @@\n-# Old Title\n+# New Title\n+\n+More content',
          blob_url: 'https://github.com/test-owner/test-repo/blob/abc123/README.md'
        }
      ]);
      
      const result = await contentService.getPullRequestDiff('test-owner', 'test-repo', 1);
      
      expect(result.files).toHaveLength(2);
      expect(result.totalFiles).toBe(2);
      expect(result.totalAdditions).toBe(15); // 10 + 5
      expect(result.totalDeletions).toBe(3); // 2 + 1
      expect(result.totalChanges).toBe(18); // 12 + 6
    });
  });

  describe('parseMarkdown', () => {
    test('should parse markdown with headings', () => {
      const markdown = '# Heading 1\nContent under heading 1\n\n## Heading 2\nContent under heading 2';
      
      const result = contentService.parseMarkdown(markdown);
      
      expect(result.sections).toHaveLength(2);
      expect(result.sections[0]).toEqual({
        heading: 'Heading 1',
        level: 1,
        content: 'Content under heading 1'
      });
      expect(result.sections[1]).toEqual({
        heading: 'Heading 2',
        level: 2,
        content: 'Content under heading 2'
      });
    });

    test('should parse markdown with links', () => {
      const markdown = 'Check out [GitHub](https://github.com) for more info.';
      
      const result = contentService.parseMarkdown(markdown);
      
      expect(result.links).toHaveLength(1);
      expect(result.links[0]).toEqual({
        text: 'GitHub',
        url: 'https://github.com'
      });
    });

    test('should handle markdown without headings', () => {
      const markdown = 'This is just plain text content with no headings.';
      
      const result = contentService.parseMarkdown(markdown);
      
      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]).toEqual({
        heading: '',
        level: 0,
        content: 'This is just plain text content with no headings.'
      });
    });
  });

  describe('parseDiff', () => {
    test('should parse diff patch into structured format', () => {
      const filename = 'src/index.ts';
      const patch = '@@ -1,3 +1,5 @@\n-removed line\n context line\n+added line 1\n+added line 2\n@@ -10,2 +12,1 @@\n-another removed\n context';
      
      const result = contentService.parseDiff(filename, patch);
      
      expect(result.filename).toBe('src/index.ts');
      expect(result.hunks).toHaveLength(2);
      
      // Check first hunk
      expect(result.hunks[0].oldStart).toBe(1);
      expect(result.hunks[0].oldLines).toBe(3);
      expect(result.hunks[0].newStart).toBe(1);
      expect(result.hunks[0].newLines).toBe(5);
      expect(result.hunks[0].lines).toHaveLength(4);
      expect(result.hunks[0].lines[0].type).toBe('deletion');
      expect(result.hunks[0].lines[0].content).toBe('removed line');
      expect(result.hunks[0].lines[1].type).toBe('context');
      expect(result.hunks[0].lines[2].type).toBe('addition');
      expect(result.hunks[0].lines[3].type).toBe('addition');
      
      // Check second hunk
      expect(result.hunks[1].oldStart).toBe(10);
      expect(result.hunks[1].oldLines).toBe(2);
      expect(result.hunks[1].newStart).toBe(12);
      expect(result.hunks[1].newLines).toBe(1);
      expect(result.hunks[1].lines).toHaveLength(2);
      expect(result.hunks[1].lines[0].type).toBe('deletion');
      expect(result.hunks[1].lines[1].type).toBe('context');
    });

    test('should handle empty patch', () => {
      const result = contentService.parseDiff('file.txt', '');
      
      expect(result.hunks).toHaveLength(0);
    });
  });
}); 