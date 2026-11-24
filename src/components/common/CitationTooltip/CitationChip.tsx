import React from 'react';
import styles from './CitationTooltip.module.scss';

export interface CitationChipProps {
  /** What the chip shows: a source's number, or "+N" for the sources it stands in for. */
  label: string;
  /**
   * The citation markers the chip replaces, e.g. "[16]". Selecting or copying
   * the text keeps them, though the chip shows only its label.
   */
  markers: string;
  /** The page the chip opens when its tooltip isn't in the way (no script, a new-tab click). */
  href: string;
  /** What a screen reader announces, e.g. "Source 16: Form 4 …". */
  'aria-label': string;
  'data-testid'?: string;
}

/** A citation in running text: a small numbered chip after the claim it backs. */
export default function CitationChip({
  label,
  markers,
  href,
  'aria-label': ariaLabel,
  'data-testid': testId = 'citation-chip',
}: CitationChipProps) {
  return (
    <a
      className={styles.chip}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      data-label={label}
      data-testid={testId}
    >
      <span className={styles.markers}>{markers}</span>
    </a>
  );
}
