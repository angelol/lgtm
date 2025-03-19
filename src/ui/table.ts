/**
 * Table Display Component
 * Provides functionality for displaying tabular data in the terminal
 */

import chalk from 'chalk';
import { ColorTheme, TerminalDimensions } from './types.js';
import { getTerminalSize } from './utils.js';
import { getTheme } from './theme.js';

/**
 * Column definition for tabular display
 */
export interface Column {
  /** The key to access data from the row object */
  key: string;
  /** The header text for the column */
  header: string;
  /** The width of the column in characters */
  width: number;
  /** The minimum width of the column in characters */
  minWidth?: number;
  /** The maximum width of the column in characters */
  maxWidth?: number;
  /** How to align the content in the column */
  align?: 'left' | 'center' | 'right';
  /** Optional formatter function for cell content */
  format?: (value: any) => string;
  /** Whether the column can be auto-resized */
  resizable?: boolean;
  /** Whether the column can be hidden when space is constrained */
  hideable?: boolean;
  /** Priority for column (higher = more important, kept visible longer) */
  priority?: number;
  /** Custom style for the column */
  style?: {
    header?: keyof ColorTheme;
    cell?: keyof ColorTheme;
  };
}

/**
 * Table display options
 */
export interface TableDisplayOptions {
  /** Color theme to use */
  theme?: ColorTheme;
  /** Character for horizontal borders */
  horizontalChar?: string;
  /** Character for vertical borders */
  verticalChar?: string;
  /** Character for corner borders */
  cornerChar?: string;
  /** Whether to show borders */
  showBorders?: boolean;
  /** Padding for cells */
  padding?: number;
  /** Whether to zebra-stripe rows */
  zebraStripe?: boolean;
  /** Whether to truncate content that exceeds column width */
  truncate?: boolean;
  /** Character to indicate truncated content */
  truncateChar?: string;
  /** Header style */
  headerStyle?: {
    bold?: boolean;
    color?: keyof ColorTheme;
  };
}

/**
 * Table display component for rendering tabular data
 */
export class TableDisplay {
  private theme: ColorTheme;
  private horizontalChar: string;
  private verticalChar: string;
  private cornerChar: string;
  private showBorders: boolean;
  private padding: number;
  private zebraStripe: boolean;
  private truncate: boolean;
  private truncateChar: string;
  private headerStyle: {
    bold: boolean;
    color: keyof ColorTheme;
  };

  /**
   * Creates a new table display component
   */
  constructor(options: TableDisplayOptions = {}) {
    this.theme = options.theme || getTheme();
    this.horizontalChar = options.horizontalChar || '─';
    this.verticalChar = options.verticalChar || '│';
    this.cornerChar = options.cornerChar || '+';
    this.showBorders = options.showBorders !== undefined ? options.showBorders : false;
    this.padding = options.padding !== undefined ? options.padding : 1;
    this.zebraStripe = options.zebraStripe !== undefined ? options.zebraStripe : false;
    this.truncate = options.truncate !== undefined ? options.truncate : true;
    this.truncateChar = options.truncateChar || '...';
    this.headerStyle = {
      bold: options.headerStyle?.bold !== undefined ? options.headerStyle.bold : true,
      color: options.headerStyle?.color || 'primary'
    };
  }

  /**
   * Renders column headers
   */
  public renderHeaders(columns: Column[]): string {
    const headerRow: string[] = [];
    
    for (const column of columns) {
      const header = this.formatHeader(column.header, column);
      headerRow.push(header);
    }
    
    return this.joinCells(headerRow);
  }

  /**
   * Renders a single row of data
   */
  public renderRow(data: Record<string, any>, columns: Column[], rowIndex = 0): string {
    const cells: string[] = [];
    
    for (const column of columns) {
      const value = data[column.key];
      const formattedValue = this.formatCell(value, column, rowIndex);
      cells.push(formattedValue);
    }
    
    return this.joinCells(cells);
  }

  /**
   * Renders a complete table with headers and data rows
   */
  public render(data: Record<string, any>[], columns: Column[]): string {
    const terminalSize = getTerminalSize();
    const adjustedColumns = this.adjustColumnsToTerminalWidth(columns, terminalSize);
    
    // Generate headers
    const headers = this.renderHeaders(adjustedColumns);
    
    // Generate separator
    const separator = this.showBorders ? this.renderSeparator(adjustedColumns) : '';
    
    // Generate data rows
    let rowsOutput: string;
    if (data.length === 0) {
      rowsOutput = this.renderEmptyMessage(adjustedColumns);
    } else {
      rowsOutput = data
        .map((row, index) => this.renderRow(row, adjustedColumns, index))
        .join('\n');
    }
    
    // Assemble the complete table
    if (this.showBorders) {
      return `${separator}\n${headers}\n${separator}\n${rowsOutput}\n${separator}`;
    } else {
      return `${headers}\n${rowsOutput}`;
    }
  }

  /**
   * Formats a header cell
   */
  private formatHeader(text: string, column: Column): string {
    let formattedText = String(text);
    const availableWidth = column.width - (this.padding * 2);
    
    // Truncate if needed
    if (this.truncate && formattedText.length > availableWidth) {
      formattedText = formattedText.substring(0, availableWidth - this.truncateChar.length) + this.truncateChar;
    }
    
    // Apply padding
    formattedText = ' '.repeat(this.padding) + formattedText + ' '.repeat(this.padding);
    
    // Apply alignment
    formattedText = this.alignText(formattedText, column.width, column.align || 'left');
    
    // Apply styling
    const headerColor = column.style?.header || this.headerStyle.color;
    if (this.headerStyle.bold) {
      formattedText = chalk.bold.hex(this.theme[headerColor])(formattedText);
    } else {
      formattedText = chalk.hex(this.theme[headerColor])(formattedText);
    }
    
    return formattedText;
  }

  /**
   * Formats a data cell
   */
  private formatCell(value: any, column: Column, rowIndex = 0): string {
    // Apply custom formatter if provided
    let formattedValue = column.format ? column.format(value) : String(value ?? '');
    const availableWidth = column.width - (this.padding * 2);
    
    // Truncate if needed
    if (this.truncate && formattedValue.length > availableWidth) {
      formattedValue = formattedValue.substring(0, availableWidth - this.truncateChar.length) + this.truncateChar;
    }
    
    // Apply padding
    formattedValue = ' '.repeat(this.padding) + formattedValue + ' '.repeat(this.padding);
    
    // Apply alignment
    formattedValue = this.alignText(formattedValue, column.width, column.align || 'left');
    
    // Apply zebra striping if enabled
    if (this.zebraStripe && rowIndex % 2 === 1) {
      formattedValue = chalk.hex(this.theme.subtle)(formattedValue);
    }
    
    // Apply custom cell styling if provided
    if (column.style?.cell) {
      formattedValue = chalk.hex(this.theme[column.style.cell])(formattedValue);
    }
    
    return formattedValue;
  }

  /**
   * Aligns text within a fixed width
   */
  private alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
    if (text.length >= width) {
      return text;
    }
    
    const padding = width - text.length;
    
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPadding = Math.floor(padding / 2);
        const rightPadding = padding - leftPadding;
        return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
      case 'left':
      default:
        return text + ' '.repeat(padding);
    }
  }

  /**
   * Joins cells into a row
   */
  private joinCells(cells: string[]): string {
    if (this.showBorders) {
      return `${this.verticalChar}${cells.join(this.verticalChar)}${this.verticalChar}`;
    } else {
      return cells.join('');
    }
  }

  /**
   * Renders a separator line
   */
  private renderSeparator(columns: Column[]): string {
    const separators = columns.map(column => this.horizontalChar.repeat(column.width));
    
    if (this.showBorders) {
      return `${this.cornerChar}${separators.join(this.cornerChar)}${this.cornerChar}`;
    } else {
      return separators.join('');
    }
  }

  /**
   * Renders a message for empty data
   */
  private renderEmptyMessage(columns: Column[]): string {
    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0) +
      (this.showBorders ? columns.length + 1 : 0);
    
    const message = 'No data to display';
    const paddingLeft = Math.floor((totalWidth - message.length) / 2);
    const paddingRight = totalWidth - message.length - paddingLeft;
    
    let formattedMessage = ' '.repeat(paddingLeft) + message + ' '.repeat(paddingRight);
    formattedMessage = chalk.hex(this.theme.muted)(formattedMessage);
    
    if (this.showBorders) {
      return `${this.verticalChar}${formattedMessage}${this.verticalChar}`;
    } else {
      return formattedMessage;
    }
  }

  /**
   * Adjusts column widths to fit terminal width
   */
  private adjustColumnsToTerminalWidth(columns: Column[], terminalSize: TerminalDimensions): Column[] {
    // Calculate total width needed and available width
    const totalBorderWidth = this.showBorders ? columns.length + 1 : 0;
    const totalColumnsWidth = columns.reduce((sum, column) => sum + column.width, 0);
    const availableWidth = terminalSize.width - totalBorderWidth;
    
    // If columns fit, return as is
    if (totalColumnsWidth <= availableWidth) {
      return [...columns];
    }
    
    // Need to adjust columns to fit available width
    const adjustedColumns: Column[] = [];
    
    // Sort columns by priority (if specified) or by removability and size
    const sortedColumns = [...columns].sort((a, b) => {
      // First consider priority if both have it defined
      if (a.priority !== undefined && b.priority !== undefined) {
        return b.priority - a.priority; // Higher priority first
      }
      
      // Then consider if columns are marked as hideable
      if (a.hideable && !b.hideable) return 1;
      if (!a.hideable && b.hideable) return -1;
      
      // Then consider if columns are marked as resizable
      if (a.resizable && !b.resizable) return -1;
      if (!a.resizable && b.resizable) return 1;
      
      // Otherwise, sort by width (larger columns have more space to give up)
      return b.width - a.width;
    });
    
    // First approach: hide columns if hideable
    let currentWidth = totalColumnsWidth;
    const columnsToInclude = sortedColumns.filter(column => {
      if (currentWidth <= availableWidth) {
        return true; // Already fits, include all remaining columns
      }
      
      if (column.hideable) {
        currentWidth -= column.width;
        return false; // Hide this column
      }
      
      return true; // Keep this column
    });
    
    // If still doesn't fit, resize columns proportionally
    if (currentWidth > availableWidth) {
      const resizableColumns = columnsToInclude.filter(column => column.resizable !== false);
      const nonResizableColumns = columnsToInclude.filter(column => column.resizable === false);
      
      // Calculate width used by non-resizable columns
      const nonResizableWidth = nonResizableColumns.reduce(
        (sum, column) => sum + column.width, 0
      );
      
      // Calculate available width for resizable columns
      const resizableAvailableWidth = availableWidth - nonResizableWidth;
      
      // Calculate total width of resizable columns
      const totalResizableWidth = resizableColumns.reduce(
        (sum, column) => sum + column.width, 0
      );
      
      // Calculate scale factor
      const scaleFactor = resizableAvailableWidth / totalResizableWidth;
      
      // Adjust resizable columns proportionally
      for (const column of columnsToInclude) {
        const adjustedColumn = { ...column };
        
        if (column.resizable !== false) {
          // Calculate new width based on scale factor
          let newWidth = Math.floor(column.width * scaleFactor);
          
          // Respect minWidth if specified
          if (column.minWidth !== undefined && newWidth < column.minWidth) {
            newWidth = column.minWidth;
          }
          
          adjustedColumn.width = newWidth;
        }
        
        adjustedColumns.push(adjustedColumn);
      }
    } else {
      // All fits after hiding columns
      adjustedColumns.push(...columnsToInclude);
    }
    
    return adjustedColumns;
  }
} 