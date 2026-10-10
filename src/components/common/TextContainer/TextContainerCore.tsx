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

/**
 * Rehype plugin that decorates GFM tables with the metadata the stacked
 * layout in TextContainer.module.scss needs: data-stack on the <table>
 * (when/if it should restack in narrow containers) and data-label on each
 * <td> (its column header, shown by CSS when the header row is hidden).
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
 * The wrapper is a safety net for pathological content a cell can't wrap
 * (an image, an unbreakable token): it contains the overflow as a local
 * scroll instead of letting the table paint over the neighboring column.
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
const REHYPE_PLUGINS = [rehypeTableMeta, rehypeKatex, rehypeHighlight];
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
}: TextContainerCoreProps) {
  const { t } = useTranslation();

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

      {isLoading ? loadingContent : <MarkdownContent content={content} />}
      {children}
    </article>
  );
}
