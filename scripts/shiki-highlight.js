import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { load } from 'cheerio';
import {
  bundledLanguages,
  bundledLanguagesAlias,
  createHighlighter
} from 'shiki';

const THEMES = {
  light: 'material-theme-lighter',
  dark: 'vitesse-dark'
};
const PLAIN_TEXT_LANGUAGES = new Set(['text', 'txt', 'plaintext', 'plain']);
const LANGUAGE_ALIASES = {
  console: 'bash',
  shell: 'bash',
  terminal: 'bash'
};

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    })
  );

  return files.flat();
}

function languageFrom(block) {
  const languageClass = (block.attr('class') ?? '')
    .split(/\s+/)
    .find((className) => className.startsWith('language-'));

  return languageClass?.slice('language-'.length) || 'text';
}

function resolveLanguage(language) {
  const normalized = LANGUAGE_ALIASES[language] ?? language;

  if (PLAIN_TEXT_LANGUAGES.has(normalized)) {
    return 'text';
  }

  if (normalized in bundledLanguages || normalized in bundledLanguagesAlias) {
    return normalized;
  }

  return 'text';
}

function sourceFrom(block) {
  const withLineNumbers = block.find('.rouge-code pre').first();
  const code = withLineNumbers.length
    ? withLineNumbers.text()
    : block.find('.highlight code').first().text();

  return code.endsWith('\n') ? code.slice(0, -1) : code;
}

async function transformFile(filePath, highlighter) {
  const source = await readFile(filePath, 'utf8');
  const $ = load(source, { decodeEntities: false });
  let changed = false;

  $('div.highlighter-rouge').each((_, element) => {
    const block = $(element);
    const language = languageFrom(block);
    const rougeHighlight = block.find('.highlight').first();

    // Mermaid is rendered in the browser by the existing diagram pipeline.
    if (language === 'mermaid' || !rougeHighlight.length) {
      return;
    }

    const highlighted = highlighter.codeToHtml(sourceFrom(block), {
      lang: resolveLanguage(language),
      themes: THEMES,
      defaultColor: 'light'
    });
    const snippet = load(highlighted, { decodeEntities: false }, false);
    const shiki = snippet('pre');

    shiki.addClass('fredko-shiki');
    shiki.attr('data-language', language);
    shiki.find('code > .line').each((lineIndex, line) => {
      snippet(line).attr('data-line', String(lineIndex + 1));
    });

    rougeHighlight.replaceWith(snippet.html());
    changed = true;
  });

  if (changed) {
    await writeFile(filePath, $.html(), 'utf8');
  }

  return changed;
}

async function main() {
  const destination = path.resolve(process.argv[2] ?? '_site');
  const files = await findHtmlFiles(destination);
  const highlighter = await createHighlighter({
    themes: Object.values(THEMES),
    langs: [
      'bash',
      'graphql',
      'javascript',
      'json',
      'kotlin',
      'ruby',
      'toml',
      'typescript',
      'yaml'
    ]
  });

  try {
    const results = await Promise.all(
      files.map((filePath) => transformFile(filePath, highlighter))
    );
    const changedFiles = results.filter(Boolean).length;

    process.stdout.write(
      `Shiki highlighted ${changedFiles} HTML file${changedFiles === 1 ? '' : 's'}.\n`
    );
  } finally {
    highlighter.dispose();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
