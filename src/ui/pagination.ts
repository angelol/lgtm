/**
 * Pagination Component
 * Implementation of pagination for long lists
 */

import chalk from 'chalk';
import { getTheme } from './theme.js';
import { ColorTheme } from './types.js';
import { safeSymbol } from './utils.js';

/**
 * Pagination options
 */
export interface PaginationOptions<T> {
  /** Items per page */
  pageSize?: number;
  /** Current page (1-based) */
  currentPage?: number;
  /** Optional formatter for items */
  itemFormatter?: (item: T, index: number) => string;
  /** Theme overrides */
  theme?: ColorTheme;
}

/**
 * Pagination state
 */
export interface PaginationState {
  /** Current page (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Start index of current page (0-based) */
  startIndex: number;
  /** End index of current page (0-based) */
  endIndex: number;
  /** Total number of items */
  totalItems: number;
}

/**
 * Default formatter for paginated items
 */
function defaultFormatter<T>(item: T, index: number): string {
  return `${index + 1}. ${String(item)}`;
}

/**
 * Creates a paginator for a collection of items
 */
export class Paginator<T> {
  private items: T[];
  private pageSize: number;
  private currentPage: number;
  private itemFormatter: (item: T, index: number) => string;
  private theme: ColorTheme;
  
  constructor(items: T[], options: PaginationOptions<T> = {}) {
    this.items = items;
    this.pageSize = options.pageSize || 10;
    this.currentPage = options.currentPage || 1;
    this.itemFormatter = options.itemFormatter || defaultFormatter;
    this.theme = options.theme || getTheme();
    
    // Ensure currentPage is within valid range
    this.currentPage = Math.max(1, Math.min(this.currentPage, this.getTotalPages()));
  }
  
  /**
   * Gets the current pagination state
   */
  getState(): PaginationState {
    const totalPages = this.getTotalPages();
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize - 1, this.items.length - 1);
    
    return {
      currentPage: this.currentPage,
      totalPages,
      hasPreviousPage: this.currentPage > 1,
      hasNextPage: this.currentPage < totalPages,
      startIndex,
      endIndex,
      totalItems: this.items.length
    };
  }
  
  /**
   * Gets the total number of pages
   */
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.pageSize));
  }
  
  /**
   * Gets items for the current page
   */
  getCurrentPageItems(): T[] {
    const { startIndex, endIndex } = this.getState();
    return this.items.slice(startIndex, endIndex + 1);
  }
  
  /**
   * Moves to the next page
   * @returns Whether the operation was successful
   */
  nextPage(): boolean {
    if (this.getState().hasNextPage) {
      this.currentPage++;
      return true;
    }
    return false;
  }
  
  /**
   * Moves to the previous page
   * @returns Whether the operation was successful
   */
  previousPage(): boolean {
    if (this.getState().hasPreviousPage) {
      this.currentPage--;
      return true;
    }
    return false;
  }
  
  /**
   * Moves to a specific page
   * @param page Page number (1-based)
   * @returns Whether the operation was successful
   */
  goToPage(page: number): boolean {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      return true;
    }
    return false;
  }
  
  /**
   * Renders the current page items
   */
  renderItems(): string {
    const items = this.getCurrentPageItems();
    const { startIndex } = this.getState();
    
    return items
      .map((item, index) => this.itemFormatter(item, startIndex + index))
      .join('\n');
  }
  
  /**
   * Renders pagination controls
   */
  renderControls(): string {
    const { currentPage, totalPages, hasPreviousPage, hasNextPage } = this.getState();
    
    const prevBtn = hasPreviousPage 
      ? chalk.hex(this.theme.primary)(`${safeSymbol('◀', '<')} Prev`) 
      : chalk.hex(this.theme.muted)(`${safeSymbol('◀', '<')} Prev`);
      
    const nextBtn = hasNextPage 
      ? chalk.hex(this.theme.primary)(`Next ${safeSymbol('▶', '>')}`)
      : chalk.hex(this.theme.muted)(`Next ${safeSymbol('▶', '>')}`);
      
    const pageInfo = chalk.hex(this.theme.info)(`Page ${currentPage} of ${totalPages}`);
    
    return `${prevBtn}  ${pageInfo}  ${nextBtn}`;
  }
} 