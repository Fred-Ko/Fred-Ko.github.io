const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function renderCommentMarkdown(source: string): string {
  const tokens: string[] = [];
  let value = escapeHtml(source.trim());

  value = value.replace(/```(?:[\w-]+)?\n([\s\S]*?)```/g, (_match, code: string) => {
    const token = `\u0000BLOCK${tokens.length}\u0000`;
    tokens.push(`<pre><code>${code.trimEnd()}</code></pre>`);
    return token;
  });

  value = value.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    const token = `\u0000INLINE${tokens.length}\u0000`;
    tokens.push(`<code>${code}</code>`);
    return token;
  });

  value = value
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="nofollow ugc noopener" target="_blank">$1</a>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const blocks = value.split(/\n{2,}/).map((block) => {
    if (block.startsWith('\u0000BLOCK')) return block;
    const lines = block.split('\n');
    if (lines.every((line) => /^[-*] /.test(line))) {
      return `<ul>${lines.map((line) => `<li>${line.slice(2)}</li>`).join('')}</ul>`;
    }
    if (lines.every((line) => /^&gt; ?/.test(line))) {
      return `<blockquote>${lines.map((line) => line.replace(/^&gt; ?/, '')).join('<br>')}</blockquote>`;
    }
    return `<p>${lines.join('<br>')}</p>`;
  });

  value = blocks.join('');
  return value.replace(/\u0000(?:BLOCK|INLINE)(\d+)\u0000/g, (_match, index: string) => tokens[Number(index)]);
}
