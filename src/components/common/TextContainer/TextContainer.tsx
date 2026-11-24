import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import type { Options } from 'react-markdown';
import styles from './TextContainer.module.scss';

const TextContainerCore = lazy(() => import('./TextContainerCore'));
export { extractText, PreBlock, MarkdownLink } from './TextContainerCore';

export interface TextContainerProps {
  title?: React.ReactNode;
  content: string;
  showCopyButton?: boolean;
  /** The copy button's label and tooltip; "Copy Response" when not set. */
  copyLabel?: string;
  className?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  'data-testid'?: string;
  loadingContent?: React.ReactNode;
  /** Rendered between the header and the markdown content (e.g. the agent activity panel) */
  subheader?: React.ReactNode;
  /**
   * When set, selecting text in the rendered markdown shows a floating "Ask"
   * button that hands the selected plain text to this callback.
   */
  onAskSelection?: (selectedText: string) => void;
  /**
   * 'turn': a conversation turn as the V3 boards draw it on desktop, with one
   * header row (identity left, a plain copy icon right) and the
   * conversation's type sizes. Below isNarrow it looks like the default card.
   */
  variant?: 'card' | 'turn';
  /** Renderers for markdown elements, over the defaults (e.g. a custom `a`). */
  markdownComponents?: Options['components'];
  /** Rehype plugins that run before the default ones (tables, math, code). */
  markdownRehypePlugins?: Options['rehypePlugins'];
}

export default function TextContainer({
  title,
  content,
  showCopyButton = true,
  copyLabel,
  className,
  isLoading = false,
  children,
  'data-testid': testId,
  loadingContent,
  subheader,
  onAskSelection,
  variant = 'card',
  markdownComponents,
  markdownRehypePlugins,
}: TextContainerProps) {
  const { t } = useTranslation();

  // Same fallback UX preserving structural padding layout
  const fallbackUI = (
    <article
      className={`${styles.article} ${variant === 'turn' ? styles.turn : ''} ${className || ''}`}
      data-testid={testId}
    >
      <div
        style={{
          color: 'var(--color-text-tertiary)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {t('common.textContainer.loadingContentRenderer')}
      </div>
    </article>
  );

  return (
    <Suspense fallback={fallbackUI}>
      <TextContainerCore
        title={title}
        content={content}
        showCopyButton={showCopyButton}
        copyLabel={copyLabel}
        className={className}
        isLoading={isLoading}
        children={children}
        data-testid={testId}
        loadingContent={loadingContent}
        subheader={subheader}
        onAskSelection={onAskSelection}
        variant={variant}
        markdownComponents={markdownComponents}
        markdownRehypePlugins={markdownRehypePlugins}
      />
    </Suspense>
  );
}
