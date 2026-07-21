import { describe, expect, it } from 'vitest';
import { renderCommentMarkdown } from '../src/services/markdown';

describe('renderCommentMarkdown', () => {
  it('renders a small safe markdown subset', () => {
    expect(renderCommentMarkdown('**굵게**와 `코드`')).toBe(
      '<p><strong>굵게</strong>와 <code>코드</code></p>'
    );
  });

  it('escapes raw HTML and rejects non-http links', () => {
    const html = renderCommentMarkdown('<script>alert(1)</script> [x](javascript:alert(1))');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('href=');
  });
});
