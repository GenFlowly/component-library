import React, { CSSProperties, HTMLAttributes } from 'react';
import styles from './DesktopOptimalReadingWidthContainer.module.scss';

export interface DesktopOptimalReadingWidthContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The widest the content may grow on desktop, as any CSS length.
   * @default 'var(--reading-width-optimal)' (70ch)
   */
  maxWidth?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * The base of every reading column: caps its content at a width the eye reads
 * comfortably (45-75 characters a line) and centers it on desktop. Tablets
 * and phones keep the full width, which is already within that measure.
 * Specific columns (e.g. ChatReadingWidthContainer) build on it with their own
 * maxWidth.
 */
export default function DesktopOptimalReadingWidthContainer({
  maxWidth,
  className = '',
  style,
  children,
  'data-testid': testId,
  ...props
}: DesktopOptimalReadingWidthContainerProps): React.ReactElement {
  const widthStyle = maxWidth
    ? ({ '--reading-max-width': maxWidth } as CSSProperties)
    : undefined;
  return (
    <div
      className={`${styles.container} ${className}`}
      style={{ ...widthStyle, ...style }}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  );
}
