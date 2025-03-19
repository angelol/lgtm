/**
 * PR List Display
 * Specialized display component for showing PR lists in tabular format
 */

import { PullRequest } from '../github/services/repository-service.js';
import { TableDisplay, Column } from './table.js';
import { formatCiStatus } from './utils.js';
import { getTheme } from './theme.js';
import { formatDistanceToNow } from '../utils/date.js';
import chalk from 'chalk';

/**
 * Options for PR list display
 */
export interface PrListDisplayOptions {
  /** Whether to show PR number */
  showNumber?: boolean;
  /** Whether to show PR author */
  showAuthor?: boolean;
  /** Whether to show PR age */
  showAge?: boolean;
  /** Whether to show PR labels */
  showLabels?: boolean;
  /** Whether to show CI status */
  showCiStatus?: boolean;
  /** Whether to show borders */
  showBorders?: boolean;
  /** Max number of characters for title */
  maxTitleLength?: number;
  /** Max number of labels to display */
  maxLabels?: number;
}

/**
 * Handles display of PRs in a tabular format
 */
export class PrListDisplay {
  private tableDisplay: TableDisplay;
  private options: Required<PrListDisplayOptions>;

  /**
   * Creates a new PR list display
   */
  constructor(options: PrListDisplayOptions = {}) {
    this.options = {
      showNumber: options.showNumber !== undefined ? options.showNumber : true,
      showAuthor: options.showAuthor !== undefined ? options.showAuthor : true,
      showAge: options.showAge !== undefined ? options.showAge : true,
      showLabels: options.showLabels !== undefined ? options.showLabels : false,
      showCiStatus: options.showCiStatus !== undefined ? options.showCiStatus : true,
      showBorders: options.showBorders !== undefined ? options.showBorders : false,
      maxTitleLength: options.maxTitleLength || 40,
      maxLabels: options.maxLabels || 3
    };

    this.tableDisplay = new TableDisplay({
      theme: getTheme(),
      showBorders: this.options.showBorders,
      truncate: true
    });
  }

  /**
   * Gets column definitions for PR list table
   */
  private getColumns(): Column[] {
    const columns: Column[] = [];

    // PR number column
    if (this.options.showNumber) {
      columns.push({
        key: 'number',
        header: '#',
        width: 6,
        minWidth: 4,
        align: 'left',
        format: (value) => `#${value}`,
        priority: 100 // Essential column
      });
    }

    // Title column
    columns.push({
      key: 'title',
      header: 'Title',
      width: this.options.maxTitleLength,
      minWidth: 20,
      resizable: true,
      priority: 100, // Essential column
      format: (value) => {
        return value;
      }
    });

    // Author column
    if (this.options.showAuthor) {
      columns.push({
        key: 'author',
        header: 'Author',
        width: 14,
        minWidth: 10,
        hideable: true,
        priority: 50,
        format: (value) => {
          return `@${value.login}`;
        },
        style: {
          cell: 'secondary'
        }
      });
    }

    // Age column
    if (this.options.showAge) {
      columns.push({
        key: 'createdAt',
        header: 'Age',
        width: 12,
        minWidth: 8,
        hideable: true,
        priority: 40,
        format: (value) => {
          return formatDistanceToNow(new Date(value));
        },
        style: {
          cell: 'muted'
        }
      });
    }

    // Labels column
    if (this.options.showLabels) {
      columns.push({
        key: 'labels',
        header: 'Labels',
        width: 20,
        minWidth: 10,
        hideable: true,
        resizable: true,
        priority: 30,
        format: (labels) => {
          if (!labels || labels.length === 0) {
            return '';
          }

          const visibleLabels = labels.slice(0, this.options.maxLabels);
          
          return visibleLabels
            .map((label: { name: string; color: string }) => {
              return chalk.hex(`#${label.color}`)(label.name);
            })
            .join(', ') + 
            (labels.length > this.options.maxLabels ? `, +${labels.length - this.options.maxLabels}` : '');
        }
      });
    }

    // CI Status column
    if (this.options.showCiStatus) {
      columns.push({
        key: 'ciStatus',
        header: 'Status',
        width: 15,
        minWidth: 10,
        hideable: true,
        priority: 60,
        format: (status) => {
          // Use the formatCiStatus utility to get colorized status
          return formatCiStatus(status);
        }
      });
    }

    return columns;
  }

  /**
   * Transform PR data for display
   */
  private transformPrData(pullRequests: PullRequest[]): Record<string, any>[] {
    return pullRequests.map(pr => {
      // Return a flattened object that matches the column keys
      return {
        number: pr.number,
        title: pr.title,
        author: pr.author,
        createdAt: pr.createdAt,
        labels: pr.labels,
        ciStatus: pr.ciStatus,
        isDraft: pr.isDraft
      };
    });
  }

  /**
   * Renders a list of PRs in tabular format
   */
  public render(pullRequests: PullRequest[]): string {
    if (pullRequests.length === 0) {
      return chalk.hex(getTheme().muted)('No open pull requests found.');
    }

    const columns = this.getColumns();
    const transformedData = this.transformPrData(pullRequests);
    return this.tableDisplay.render(transformedData, columns);
  }

  /**
   * Renders a formatted PR info string for single PR display (non-table)
   */
  public renderPrInfo(pr: PullRequest): string {
    const theme = getTheme();
    const parts: string[] = [];

    parts.push(chalk.hex(theme.primary)(`#${pr.number}`));
    parts.push(chalk.bold(pr.title));
    
    if (this.options.showAuthor) {
      parts.push(chalk.hex(theme.secondary)(`@${pr.author.login}`));
    }
    
    if (this.options.showAge) {
      parts.push(chalk.hex(theme.muted)(`${formatDistanceToNow(new Date(pr.createdAt))}`));
    }
    
    if (this.options.showCiStatus && pr.ciStatus) {
      parts.push(formatCiStatus(pr.ciStatus));
    }

    return parts.join(' | ');
  }
} 