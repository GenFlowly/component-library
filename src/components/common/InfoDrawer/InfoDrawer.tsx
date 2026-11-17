import React from 'react';
import SlideOverPanel from '../SlideOverPanel/SlideOverPanel';
import KnowledgeStrip, {
  KnowledgeItem,
} from '../KnowledgeStrip/KnowledgeStrip';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './InfoDrawer.module.scss';

export interface InfoDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Drawer title, e.g. "About this page". */
  title: string;
  /** The page it explains, shown under the title. */
  subtitle?: string;
  items: KnowledgeItem[];
  /** One line at the bottom, e.g. how to open it again. */
  hint?: string;
  closeLabel: string;
  'data-testid'?: string;
}

/**
 * The phone's home for a settings page's knowledge cards: a drawer that
 * slides in from the left, opened by the page header's info button or a
 * swipe in from the screen's right edge.
 */
export default function InfoDrawer({
  open,
  onClose,
  title,
  subtitle,
  items,
  hint,
  closeLabel,
  'data-testid': testId,
}: InfoDrawerProps): React.ReactElement | null {
  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      side="left"
      aria-label={title}
      data-testid={testId}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.circle}
          onClick={onClose}
          aria-label={closeLabel}
          data-testid={testId ? `${testId}-close` : undefined}
        >
          <Icon src={ICONS.CLOSE} size={20} />
        </button>
        <div className={styles.pill}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        <span className={styles.spacer} aria-hidden="true" />
      </div>
      <KnowledgeStrip items={items} layout="stack" aria-label={title} />
      {hint && <p className={styles.hint}>{hint}</p>}
    </SlideOverPanel>
  );
}
