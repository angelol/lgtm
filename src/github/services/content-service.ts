/**
 * Content Service
 *
 * Provides functionality for retrieving and parsing PR content from GitHub.
 */

import { GitHubApiClient } from './github-api-client.js';
import { NotFoundError, PermissionError, wrapError } from '../../utils/errors.js';
import {
  PullRequestDescription,
  FileChange,
  PullRequestDiff,
  ParsedMarkdown,
  ParsedDiff,
} from '../models/content.js';

/**
 * Service for retrieving and parsing content from GitHub pull requests
 */
export class ContentService {
  constructor(private apiClient: GitHubApiClient) {
    if (!apiClient) {
      throw new Error('GitHub API client is required');
    }
  }

  /**
   * Fetches the description of a pull request
   */
  public async getPullRequestDescription(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequestDescription> {
    try {
      const pr = await this.apiClient.request<any>(
        `GET /repos/${owner}/${repo}/pulls/${pullNumber}`,
      );

      // GitHub API may return null for body
      const body = pr.body || '';

      return {
        body,
        bodyHtml: pr.body_html,
        author: {
          login: pr.user.login,
          avatarUrl: pr.user.avatar_url,
        },
        updatedAt: pr.updated_at,
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Pull request #${pullNumber} not found in ${owner}/${repo}`);
      }
      if (error.status === 403) {
        throw new PermissionError(
          `You don't have access to pull request #${pullNumber} in ${owner}/${repo}`,
        );
      }
      throw wrapError(
        error,
        `Failed to get description for PR #${pullNumber} from ${owner}/${repo}`,
      );
    }
  }

  /**
   * Retrieves file changes from a pull request
   */
  public async getFileChanges(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<FileChange[]> {
    try {
      const fileChanges = await this.apiClient.request<any[]>(
        `GET /repos/${owner}/${repo}/pulls/${pullNumber}/files`,
        { per_page: 100 }, // Limit to 100 files, could implement pagination for more
      );

      return fileChanges.map(file => ({
        filename: file.filename,
        status: this._mapFileStatus(file.status),
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        isBinary: !file.patch, // If there's no patch, assume it's binary
        viewUrl: file.blob_url,
        rawUrl: file.raw_url,
        patch: file.patch,
        previousFilename: file.previous_filename,
      }));
    } catch (error: any) {
      if (error.status === 404) {
        throw new NotFoundError(`Pull request #${pullNumber} not found in ${owner}/${repo}`);
      }
      if (error.status === 403) {
        throw new PermissionError(
          `You don't have access to pull request #${pullNumber} in ${owner}/${repo}`,
        );
      }
      throw wrapError(
        error,
        `Failed to get file changes for PR #${pullNumber} from ${owner}/${repo}`,
      );
    }
  }

  /**
   * Retrieves the complete diff for a pull request
   */
  public async getPullRequestDiff(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<PullRequestDiff> {
    try {
      const files = await this.getFileChanges(owner, repo, pullNumber);

      // Calculate totals
      let totalAdditions = 0;
      let totalDeletions = 0;
      let totalChanges = 0;

      for (const file of files) {
        totalAdditions += file.additions;
        totalDeletions += file.deletions;
        totalChanges += file.changes;
      }

      return {
        files,
        totalFiles: files.length,
        totalAdditions,
        totalDeletions,
        totalChanges,
      };
    } catch (error) {
      throw wrapError(error, `Failed to get diff for PR #${pullNumber} from ${owner}/${repo}`);
    }
  }

  /**
   * Parses markdown content into a structured format
   */
  public parseMarkdown(markdown: string): ParsedMarkdown {
    // Implementation will parse markdown into sections and links
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

    const sections: ParsedMarkdown['sections'] = [];
    const links: ParsedMarkdown['links'] = [];

    // Find all links
    let linkMatch;
    while ((linkMatch = linkRegex.exec(markdown)) !== null) {
      links.push({
        text: linkMatch[1],
        url: linkMatch[2],
      });
    }

    // Find all headings and their content
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
        content: '', // Will be filled in on the next iteration or at the end
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
        content: markdown.trim(),
      });
    }

    return {
      raw: markdown,
      sections,
      links,
    };
  }

  /**
   * Parses diff content into a structured format with syntax information
   */
  public parseDiff(filename: string, patch: string): ParsedDiff {
    if (!patch) {
      return {
        filename,
        hunks: [],
      };
    }

    const hunks: ParsedDiff['hunks'] = [];
    const lines = patch.split('\n');

    let currentHunk: ParsedDiff['hunks'][0] | null = null;

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
          lines: [],
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
        type,
      });
    }

    // Add the last hunk if we have one
    if (currentHunk) {
      hunks.push(currentHunk);
    }

    // Try to determine language from filename
    const extension = filename.split('.').pop()?.toLowerCase();
    let language = undefined;

    // Simple mapping of extensions to languages
    if (extension) {
      const languageMap: Record<string, string> = {
        js: 'javascript',
        ts: 'typescript',
        jsx: 'javascript',
        tsx: 'typescript',
        py: 'python',
        rb: 'ruby',
        go: 'go',
        java: 'java',
        rs: 'rust',
        php: 'php',
        cs: 'csharp',
        cpp: 'cpp',
        c: 'c',
        h: 'c',
        hpp: 'cpp',
        html: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'sass',
        md: 'markdown',
        json: 'json',
        yml: 'yaml',
        yaml: 'yaml',
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
      };

      language = languageMap[extension];
    }

    return {
      filename,
      hunks,
      language,
    };
  }

  /**
   * Maps GitHub file status to our FileChange status type
   */
  private _mapFileStatus(
    status: string,
  ): 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged' {
    const statusMap: Record<string, FileChange['status']> = {
      added: 'added',
      modified: 'modified',
      removed: 'removed',
      renamed: 'renamed',
      copied: 'copied',
      changed: 'changed',
      unchanged: 'unchanged',
    };

    return statusMap[status] || 'modified';
  }
}
