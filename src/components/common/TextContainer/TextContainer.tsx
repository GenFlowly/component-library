import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
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
  /** Rendered between the header and the markdown content (e.g. a thinking summary) */
  subheader?: React.ReactNode;
  /**
   * When set, selecting text in the rendered markdown shows a floating "Ask"
   * button that hands the selected plain text to this callback.
   */
  onAskSelection?: (selectedText: string) => void;
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
}: TextContainerProps) {
  const { t } = useTranslation();

  // Same fallback UX preserving structural padding layout
  const fallbackUI = (
    <article
      className={`${styles.article} ${className || ''}`}
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
      />
    </Suspense>
  );
}
