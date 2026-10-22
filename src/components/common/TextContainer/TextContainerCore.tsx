import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown, { type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import CopyToClipboard from '../../common/CopyToClipboard/CopyToClipboard';
import SelectionAskButton from './SelectionAskButton';
import styles from './TextContainer.module.scss';
import { ICONS } from '../../../constants/icons';

/**
 * Utility to recursively extract text from markdown AST nodes
 */
export const extractText = (nodes: any[]): string => {
  return nodes
    .map((node: any) => {
      if (node.value) return node.value;
      if (node.children) return extractText(node.children);
      return '';
    })
    .join('');
};

/**
 * Custom <pre> block with copy-to-clipboard button for code snippets
 */
export const PreBlock = ({ node, children, ...props }: any) => {
  const { t } = useTranslation();
  const codeString = node?.children
    ? extractText(node.children).replace(/\n$/, '')
    : '';

  return (
    // min/max width keep the code block shrinkable (its own overflow-x takes
    // over) even when a consumer mounts TextContainer in a row-flex parent
    <div style={{ position: 'relative', maxWidth: '100%', minWidth: 0 }}>
      <div
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          zIndex: 10,
        }}
      >
        <CopyToClipboard
          content={codeString}
          label={t('common.textContainer.copyCode')}
          icon={ICONS.COPY}
          successMessage="✓"
          successDuration={2000}
          size="sm"
          variant="secondary"
        />
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
};

/**
 * Links in rendered markdown always open in a new tab — content links must
 * never navigate the app away. Styling (primary text color + underline)
 * comes from the .article rules in TextContainer.module.scss.
 */
export const MarkdownLink = ({ node, children, ...props }: any) => (
  <a {...props} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

const isElement = (node: any, tagName?: string): boolean =>
  node?.type === 'element' && (!tagName || node.tagName === tagName);

const elementChildren = (node: any, tagName: string): any[] =>
  (node?.children || []).filter((child: any) => isElement(child, tagName));

// Column-count buckets for the stacked-table container queries: tables the
// model emits with many columns can't fit a narrow card even with wrapping
// cells, so they restack earlier (at a wider container) than modest ones.
// 1–2 column tables never stack — cell wrapping alone keeps them legible.
const STACK_EARLY_MIN_COLS = 5;
const STACK_LATE_MIN_COLS = 3;

// Table cells count whole words toward their column's min width (see the
// cell rule in TextContainer.module.scss), so a run without spaces that is
// too long to sit whole on a phone has to be marked to wrap anywhere, like
// code and links do. Identifier-like runs (_ . / : @ digits, camelCase)
// qualify sooner than ordinary words, which only do when absurdly long.
const TOKEN_MIN_CHARS = 16;
const WORD_TOKEN_MIN_CHARS = 22;
// Letters (and marks) with inner hyphens/apostrophes, edged by punctuation
const PLAIN_WORD =
  /^[^\p{L}\p{N}]*[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*[^\p{L}\p{N}]*$/u;
const CAMEL_CASE = /\p{Ll}\p{Lu}/u;
const HAS_LETTER = /\p{L}/u;
// Scripts the line breaker already breaks inside (between ideographs or
// syllables, or at dictionary words): a sentence in them has no spaces but
// is never one unbreakable run
const SELF_BREAKING =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]+/u;

export function isLongToken(run: string): boolean {
  if (/\s/.test(run)) return false;
  const length = Array.from(run).length;
  if (length < TOKEN_MIN_CHARS) return false;
  // Judge only what sits between such scripts, e.g. an identifier written
  // without spaces inside a Chinese sentence
  if (SELF_BREAKING.test(run)) {
    return run.split(SELF_BREAKING).some(isLongToken);
  }
  if (length >= WORD_TOKEN_MIN_CHARS) return true;
  // Numbers ("$210,352,000,000") read worse split than whole, until they
  // are long enough to overflow
  if (!HAS_LETTER.test(run)) return false;
  return !PLAIN_WORD.test(run) || CAMEL_CASE.test(run);
}

// Code, links and images wrap anywhere on their own, so they end a run.
// Inline math is a <code> until rehype-katex renders it after this plugin.
const TOKEN_SKIP_TAGS = new Set(['code', 'a', 'pre', 'kbd', 'samp', 'img']);

// A cell's text leaves in order, with null where a skipped element ends the
// run. Raw nodes count as text: without rehype-raw, react-markdown renders
// literal HTML such as "Mon<br>Tue" as text.
function textLeaves(node: any, out: any[] = []): any[] {
  for (const child of node.children || []) {
    if (child.type === 'text' || child.type === 'raw') {
      out.push(child);
    } else if (child.type === 'element') {
      if (TOKEN_SKIP_TAGS.has(child.tagName)) out.push(null);
      else textLeaves(child, out);
    }
  }
  return out;
}

function tokenSpan(value: string) {
  // A soft break after each slash, so a run like Frontend/Backend breaks
  // between its parts before it breaks inside one
  const children: any[] = [];
  (value.match(/[^/]*\/+|[^/]+$/g) || [value]).forEach((part, i) => {
    if (i) {
      children.push({
        type: 'element',
        tagName: 'wbr',
        properties: {},
        children: [],
      });
    }
    children.push({ type: 'text', value: part });
  });
  return {
    type: 'element',
    tagName: 'span',
    properties: { dataToken: true },
    children,
  };
}

/**
 * Wraps each long run in a cell's text in <span data-token> (see
 * isLongToken). A run continues across inline formatting, the way the
 * browser lays it out: when PostgreSQL/MySQL has each name in bold, every
 * piece of the run is wrapped. Copying the table still yields the text.
 */
export function markLongTokens(cell: any) {
  type Piece = { leaf: number; text: string; space: boolean; token?: boolean };
  const leaves = textLeaves(cell);
  // Each leaf split into whitespace and non-whitespace pieces; a skipped
  // element counts as whitespace
  const leafPieces: Piece[][] = leaves.map((leaf, i) =>
    leaf
      ? leaf.value
          .split(/(\s+)/)
          .filter(Boolean)
          .map((text: string) => ({ leaf: i, text, space: /^\s/.test(text) }))
      : [{ leaf: -1, text: '', space: true }]
  );
  const pieces = leafPieces.flat();

  let marked = false;
  for (let start = 0; start < pieces.length;) {
    let end = start;
    while (end < pieces.length && !pieces[end].space) end++;
    const run = pieces.slice(start, end);
    if (run.length && isLongToken(run.map(p => p.text).join(''))) {
      run.forEach(p => (p.token = true));
      marked = true;
    }
    start = end + 1;
  }
  if (!marked) return;

  const replacements = new Map<any, any[]>();
  leaves.forEach((leaf, i) => {
    const own = leafPieces[i];
    if (!leaf || !own.some(p => p.token)) return;
    const out: any[] = [];
    let plain = '';
    for (const piece of own) {
      if (!piece.token) {
        plain += piece.text;
        continue;
      }
      if (plain) out.push({ type: 'text', value: plain });
      plain = '';
      out.push(tokenSpan(piece.text));
    }
    if (plain) out.push({ type: 'text', value: plain });
    replacements.set(leaf, out);
  });

  const replace = (node: any) => {
    node.children = node.children.flatMap((child: any) => {
      if (replacements.has(child)) return replacements.get(child);
      if (child.type === 'element' && !TOKEN_SKIP_TAGS.has(child.tagName)) {
        replace(child);
      }
      return [child];
    });
  };
  replace(cell);
}

/**
 * Rehype plugin that decorates GFM tables with the metadata the layout in
 * TextContainer.module.scss needs: data-stack on the <table> (when/if it
 * should restack in narrow containers), data-label on each <td> (its column
 * header, shown by CSS when the header row is hidden), and data-token spans
 * around long unbreakable runs in cells.
 * Pure decoration — the DOM stays a semantic table in both presentations.
 */
export function rehypeTableMeta() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (isElement(node, 'table')) decorateTable(node);
      (node.children || []).forEach(walk);
    };
    walk(tree);
  };
}

export function decorateTable(table: any) {
  const [thead] = elementChildren(table, 'thead');
  const [headerRow] = elementChildren(thead, 'tr');
  const labels = elementChildren(headerRow, 'th').map(th =>
    extractText(th.children || []).trim()
  );

  for (const section of [thead, ...elementChildren(table, 'tbody')]) {
    for (const row of elementChildren(section, 'tr')) {
      for (const cell of row.children || []) {
        if (isElement(cell, 'th') || isElement(cell, 'td')) {
          markLongTokens(cell);
        }
      }
    }
  }

  if (labels.length < STACK_LATE_MIN_COLS) return;

  table.properties = {
    ...table.properties,
    dataStack: labels.length >= STACK_EARLY_MIN_COLS ? 'early' : 'late',
  };
  for (const tbody of elementChildren(table, 'tbody')) {
    for (const row of elementChildren(tbody, 'tr')) {
      elementChildren(row, 'td').forEach((td, i) => {
        if (labels[i]) {
          td.properties = { ...td.properties, dataLabel: labels[i] };
        }
      });
    }
  }
}

/**
 * Tables never scroll by design — cells wrap, and in narrow containers the
 * container queries in TextContainer.module.scss restack rows into cards.
 * The wrapper is a safety net for content a cell can't wrap (an image, or
 * long words kept whole that don't fit side by side on a narrow phone): it
 * contains the overflow as a local scroll instead of letting the table
 * paint over the neighboring column.
 */
export const MarkdownTable = ({ node, children, ...props }: any) => (
  <div className={styles.tableScroll}>
    <table {...props}>{children}</table>
  </div>
);

// Stable plugin/component identities so ReactMarkdown props don't change
// between renders with the same content.
// Single-dollar math must stay OFF: two currency amounts in one paragraph
// ("raised $50M … around $1.5M") would otherwise pair up as one inline-math
// span and KaTeX would typeset the prose between them (spaces dropped,
// ** rendered as ∗∗). Inline math uses the $$…$$ form instead, which
// normalizeMathDelimiters emits for \(...\).
export const REMARK_PLUGINS: Options['remarkPlugins'] = [
  remarkGfm,
  [remarkMath, { singleDollarTextMath: false }],
];
export const REHYPE_PLUGINS = [rehypeTableMeta, rehypeKatex, rehypeHighlight];
const MARKDOWN_COMPONENTS = {
  pre: PreBlock,
  a: MarkdownLink,
  table: MarkdownTable,
};

/**
 * LLMs emit TeX-style math delimiters — \[...\] for display math and
 * \(...\) for inline — but remark-math only parses the dollar forms, so
 * without this the raw TeX shows up as literal text. Both convert to the
 * double-dollar form (block $$ fences for display, $$…$$ for inline)
 * because single-dollar parsing is disabled in REMARK_PLUGINS — currency
 * amounts would trigger it. Convert everywhere EXCEPT inside code fences
 * and inline code spans, which must stay byte-for-byte intact.
 */
export function normalizeMathDelimiters(markdown: string): string {
  return markdown
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map(segment => {
      if (segment.startsWith('`')) return segment;
      return segment
        .replace(
          /\\\[([\s\S]+?)\\\]/g,
          (_m, expr) => `\n$$\n${expr.trim()}\n$$\n`
        )
        .replace(/\\\((.+?)\\\)/g, (_m, expr) => `$$${expr.trim()}$$`);
    })
    .join('');
}

// Markdown parsing + syntax highlighting is by far the most expensive part
// of rendering a response; memoized so parent re-renders (context updates,
// sibling typing) skip the re-parse when the text itself hasn't changed.
const MarkdownContent = React.memo(function MarkdownContent({
  content,
}: {
  content: string;
}) {
  return (
    // The wrapper is the @container root the table/stacking rules measure
    // against, so markdown adapts to the card's width (2-column layout,
    // mobile), not the viewport's
    <div className={styles.markdownBody}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
});

export interface TextContainerCoreProps {
  title?: React.ReactNode;
  content: string;
  showCopyButton?: boolean;
  className?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  'data-testid'?: string;
  loadingContent?: React.ReactNode;
  /** Rendered between the header and the markdown content (e.g. a thinking summary) */
  subheader?: React.ReactNode;
  /**
   * When set, selecting text in the rendered markdown shows a floating "Ask"
   * button that hands the selected plain text to this callback.
   */
  onAskSelection?: (selectedText: string) => void;
}

export default function TextContainerCore({
  title,
  content,
  showCopyButton = true,
  className,
  isLoading = false,
  children,
  'data-testid': testId,
  loadingContent,
  subheader,
  onAskSelection,
}: TextContainerCoreProps) {
  const { t } = useTranslation();
  const selectionScopeRef = React.useRef<HTMLDivElement>(null);

  const headerContent = typeof title === 'string' ? <h2>{title}</h2> : title;

  return (
    <article
      className={`${styles.article} ${className || ''}`}
      data-testid={testId}
    >
      {(headerContent || showCopyButton) && (
        <header
          className={styles.header}
          data-testid={testId ? `${testId}-header` : undefined}
        >
          <div className={styles.headerContent}>
            {headerContent}
            {showCopyButton && (
              <div className={styles.copyButtonPositioner}>
                <CopyToClipboard
                  content={content}
                  label={t('common.textContainer.copyResponse')}
                  icon={ICONS.COPY}
                  successMessage="✓"
                  successDuration={2000}
                  size="sm"
                  variant="secondary"
                  data-testid={testId ? `${testId}-copy-button` : undefined}
                />
              </div>
            )}
          </div>
        </header>
      )}

      {subheader}

      {isLoading ? (
        loadingContent
      ) : (
        <div className={styles.selectionScope} ref={selectionScopeRef}>
          <MarkdownContent content={content} />
          {onAskSelection && (
            <SelectionAskButton
              scopeRef={selectionScopeRef}
              onAsk={onAskSelection}
            />
          )}
        </div>
      )}
      {children}
    </article>
  );
}
