import React from 'react';
import styles from './KnowledgeStrip.module.scss';

export interface KnowledgeItem {
  /** Short heading, e.g. "What priority means". */
  title: string;
  /** One or two plain sentences. */
  text: React.ReactNode;
}

export interface KnowledgeStripProps {
  items: KnowledgeItem[];
  /**
   * 'row': side by side under a page title (desktop). 'stack': one under
   * another, for the phone's info drawer.
   * @default 'row'
   */
  layout?: 'row' | 'stack';
  /** Accessible name for the list, e.g. "About this page". */
  'aria-label'?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * The short explanations at the top of a settings page: what the page is
 * for and what its choices mean. Settings pages carry no other helper text.
 */
export default function KnowledgeStrip({
  items,
  layout = 'row',
  'aria-label': ariaLabel,
  className = '',
  'data-testid': testId,
}: KnowledgeStripProps): React.ReactElement | null {
  if (items.length === 0) return null;
  return (
    <dl
      className={`${styles.strip} ${styles[layout]} ${className}`}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {items.map(item => (
        <div key={item.title} className={styles.item}>
          <dt className={styles.title}>{item.title}</dt>
          <dd className={styles.text}>{item.text}</dd>
        </div>
      ))}
    </dl>
  );
}
