import { describe, expect, it } from '@jest/globals';
import { renderMarkdown, MarkdownOptions } from '../../src/ui/markdown.js';

describe('Markdown Renderer', () => {
  it('should render plain text unchanged', () => {
    const text = 'This is plain text';
    const result = renderMarkdown(text);
    expect(result).toContain('This is plain text');
  });

  it('should render basic markdown formatting', () => {
    const markdown = '**Bold** and *italic* text';
    const result = renderMarkdown(markdown);
    // Since we can't test the exact terminal output with colors,
    // we'll test that the content is present
    expect(result).toContain('Bold');
    expect(result).toContain('italic');
  });

  it('should render headings', () => {
    const markdown = '# Heading 1\n## Heading 2';
    const result = renderMarkdown(markdown);
    expect(result).toContain('Heading 1');
    expect(result).toContain('Heading 2');
  });

  it('should render code blocks', () => {
    const markdown = '```javascript\nconst x = 10;\n```';
    const result = renderMarkdown(markdown);
    expect(result).toContain('const x = 10;');
  });

  it('should render lists', () => {
    const markdown = '- Item 1\n- Item 2\n  - Nested item';
    const result = renderMarkdown(markdown);
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
    expect(result).toContain('Nested item');
  });

  it('should handle links', () => {
    const markdown = '[GitHub](https://github.com)';
    const result = renderMarkdown(markdown);
    expect(result).toContain('GitHub');
    expect(result).toContain('https://github.com');
  });

  it.skip('should accept custom options', () => {
    const markdown = '# Test';
    const options: MarkdownOptions = {
      width: 40,
      codeOptions: {
        highlight: true
      }
    };
    
    const defaultResult = renderMarkdown(markdown);
    const customResult = renderMarkdown(markdown, options);
    
    // Different options should result in different output
    expect(customResult).not.toEqual(defaultResult);
  });

  it('should handle undefined or empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
  });
}); 