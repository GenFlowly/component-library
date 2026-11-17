import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './SlideOverPanel.module.scss';

export interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  /** The edge it slides in from. @default 'left' */
  side?: 'left' | 'right';
  /** Accessible name of the dialog. */
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * A panel that slides in over the page from one edge, with the page dimmed
 * behind it. Tapping the dimmed page or pressing Escape closes it.
 */
export default function SlideOverPanel({
  open,
  onClose,
  side = 'left',
  'aria-label': ariaLabel,
  children,
  className = '',
  'data-testid': testId,
}: SlideOverPanelProps): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`${styles.overlay} ${styles[side]}`} data-testid={testId}>
      <div
        className={styles.scrim}
        onClick={onClose}
        aria-hidden="true"
        data-testid={testId ? `${testId}-scrim` : undefined}
      />
      <div
        className={`${styles.panel} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
