/**
 * Tests for Pagination Component
 */

import { Paginator, PaginationOptions } from '../../src/ui/pagination.js';
import { getTheme } from '../../src/ui/theme.js';

describe('Pagination Component', () => {
  // Create test data with 25 items
  const testItems = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);

  it('should create a paginator with default options', () => {
    const paginator = new Paginator(testItems);

    // Default page size should be 10
    expect(paginator.getState().totalPages).toBe(3);
    expect(paginator.getState().currentPage).toBe(1);
  });

  it('should paginate items correctly', () => {
    const paginator = new Paginator(testItems, { pageSize: 5 });

    // With page size 5, total pages should be 5
    expect(paginator.getState().totalPages).toBe(5);

    // First page should have items 1-5
    const firstPageItems = paginator.getCurrentPageItems();
    expect(firstPageItems).toHaveLength(5);
    expect(firstPageItems[0]).toBe('Item 1');
    expect(firstPageItems[4]).toBe('Item 5');

    // Navigation to next page
    paginator.nextPage();
    expect(paginator.getState().currentPage).toBe(2);

    // Second page should have items 6-10
    const secondPageItems = paginator.getCurrentPageItems();
    expect(secondPageItems).toHaveLength(5);
    expect(secondPageItems[0]).toBe('Item 6');
    expect(secondPageItems[4]).toBe('Item 10');
  });

  it('should handle navigation boundaries', () => {
    const paginator = new Paginator(testItems, { pageSize: 10 });

    // Should not be able to go before first page
    expect(paginator.getState().hasPreviousPage).toBe(false);
    expect(paginator.previousPage()).toBe(false);
    expect(paginator.getState().currentPage).toBe(1);

    // Navigate to last page
    paginator.goToPage(3);
    expect(paginator.getState().currentPage).toBe(3);
    expect(paginator.getState().hasNextPage).toBe(false);

    // Should not be able to go past last page
    expect(paginator.nextPage()).toBe(false);
    expect(paginator.getState().currentPage).toBe(3);

    // Going to an invalid page should return false
    expect(paginator.goToPage(0)).toBe(false);
    expect(paginator.goToPage(4)).toBe(false);
    expect(paginator.getState().currentPage).toBe(3);
  });

  it('should handle last page with fewer items', () => {
    const paginator = new Paginator(testItems, { pageSize: 10 });

    // Go to last page (items 21-25, only 5 items)
    paginator.goToPage(3);

    const lastPageItems = paginator.getCurrentPageItems();
    expect(lastPageItems).toHaveLength(5);
    expect(lastPageItems[0]).toBe('Item 21');
    expect(lastPageItems[4]).toBe('Item 25');
  });

  it('should handle empty or small collections', () => {
    // Empty collection
    const emptyPaginator = new Paginator([]);
    expect(emptyPaginator.getState().totalPages).toBe(1);
    expect(emptyPaginator.getCurrentPageItems()).toHaveLength(0);

    // Small collection (fewer than page size)
    const smallPaginator = new Paginator(['Item 1', 'Item 2'], { pageSize: 10 });
    expect(smallPaginator.getState().totalPages).toBe(1);
    expect(smallPaginator.getCurrentPageItems()).toHaveLength(2);
  });

  it('should render items using custom formatter', () => {
    const paginator = new Paginator(testItems, {
      pageSize: 5,
      itemFormatter: (item, index) => `${index + 1} - ${item.toUpperCase()}`,
    });

    const renderedItems = paginator.renderItems();
    expect(renderedItems).toContain('1 - ITEM 1');
    expect(renderedItems).toContain('5 - ITEM 5');
  });

  it('should render pagination controls', () => {
    const paginator = new Paginator(testItems, { pageSize: 5 });

    // First page controls
    let controls = paginator.renderControls();
    expect(controls).toContain('Page 1 of 5');

    // Move to middle page
    paginator.goToPage(3);
    controls = paginator.renderControls();
    expect(controls).toContain('Page 3 of 5');

    // Should include prev/next indicators
    expect(controls).toContain('Prev');
    expect(controls).toContain('Next');
  });
});
