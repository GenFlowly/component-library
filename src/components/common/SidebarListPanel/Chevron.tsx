import React from 'react';
import styles from './Chevron.module.scss';

/** The disclosure chevron of sidebar rows and cards: points right, turns down when expanded. */
export default function Chevron({
  expanded,
  className = '',
}: {
  expanded: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <span
      className={`${styles.chevron} ${expanded ? styles.expanded : ''} ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4l4 4-4 4" />
      </svg>
    </span>
  );
}
