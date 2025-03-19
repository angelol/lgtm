/**
 * Content Models
 *
 * Type definitions for GitHub content-related data structures.
 */

/**
 * Represents a pull request description with metadata
 */
export interface PullRequestDescription {
  /** The full markdown description text */
  body: string;
  /** The rendered HTML version of the description (if available) */
  bodyHtml?: string;
  /** Metadata about who authored the description and when */
  author: {
    login: string;
    avatarUrl: string;
  };
  /** When the description was last updated */
  updatedAt: string;
}

/**
 * Represents a file change in a pull request
 */
export interface FileChange {
  /** Filename with path */
  filename: string;
  /** Status of the file: added, modified, removed */
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  /** Number of additions in this file */
  additions: number;
  /** Number of deletions in this file */
  deletions: number;
  /** Total number of changes (additions + deletions) */
  changes: number;
  /** Whether the file is a binary file */
  isBinary: boolean;
  /** URL to view the file on GitHub */
  viewUrl: string;
  /** URL to get the raw content of the file */
  rawUrl?: string;
  /** The file content patch (if available and not a binary file) */
  patch?: string;
  /** Previous filename if the file was renamed */
  previousFilename?: string;
}

/**
 * Represents a complete diff of a pull request
 */
export interface PullRequestDiff {
  /** Files changed in this PR */
  files: FileChange[];
  /** Total number of files changed */
  totalFiles: number;
  /** Total number of additions across all files */
  totalAdditions: number;
  /** Total number of deletions across all files */
  totalDeletions: number;
  /** Total number of changes (additions + deletions) */
  totalChanges: number;
}

/**
 * Represents parsed markdown content with sections
 */
export interface ParsedMarkdown {
  /** The original markdown string */
  raw: string;
  /** Parsed sections by heading */
  sections: {
    /** The heading text */
    heading: string;
    /** The level of the heading (1-6) */
    level: number;
    /** The content under this heading */
    content: string;
  }[];
  /** Any links found in the markdown */
  links: {
    /** The link text */
    text: string;
    /** The URL of the link */
    url: string;
  }[];
}

/**
 * Represents parsed diff content with syntactic information
 */
export interface ParsedDiff {
  /** The filename this diff applies to */
  filename: string;
  /** The hunks (sections) of changes in this file */
  hunks: {
    /** Starting line number in the old file */
    oldStart: number;
    /** Number of lines in the old file hunk */
    oldLines: number;
    /** Starting line number in the new file */
    newStart: number;
    /** Number of lines in the new file hunk */
    newLines: number;
    /** The code lines in this hunk */
    lines: {
      /** The content of the line */
      content: string;
      /** The type of the line */
      type: 'context' | 'addition' | 'deletion';
      /** Line number in the old file, if applicable */
      oldLineNumber?: number;
      /** Line number in the new file, if applicable */
      newLineNumber?: number;
    }[];
  }[];
  /** Language of the file for syntax highlighting, if detectable */
  language?: string;
}
