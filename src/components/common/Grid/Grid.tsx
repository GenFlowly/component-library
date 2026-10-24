import React, { HTMLAttributes } from 'react';
import styles from './Grid.module.scss';

/** Columns of the 12-slot grid an item may span. */
export type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Gap between grid cells.
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Bootstrap-style 12-column grid. The twelve slots divide the grid's OWN
 * width — the content area left over beside sidebars — not the viewport, via
 * CSS container queries. Place [GridCol] children to control how many slots
 * each cell spans at each container width.
 *
 * The standard card layout across the apps is
 * `<GridCol span={12} md={6} lg={4}>`: one card per row on narrow
 * containers, two from 640px, three from 1024px.
 */
export function Grid({
  gap = 'md',
  className = '',
  children,
  'data-testid': testId,
  ...props
}: GridProps): React.ReactElement {
  const gapClass =
    gap === 'sm' ? styles.gapSm : gap === 'lg' ? styles.gapLg : styles.gapMd;
  return (
    <div
      className={`${styles.grid} ${gapClass} ${className}`}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  );
}

export interface GridColProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Slots (of 12) this cell spans on narrow containers and up.
   * @default 12
   */
  span?: GridSpan;
  /** Slots from a 640px-wide container; omit to keep [span]. */
  md?: GridSpan;
  /** Slots from a 1024px-wide container; omit to keep the md/base span. */
  lg?: GridSpan;
  children: React.ReactNode;
  'data-testid'?: string;
}

/** A cell of [Grid]; spans are container-width responsive, mobile-first. */
export function GridCol({
  span = 12,
  md,
  lg,
  className = '',
  children,
  'data-testid': testId,
  ...props
}: GridColProps): React.ReactElement {
  const classes = [
    styles.col,
    styles[`col-${span}`],
    md !== undefined ? styles[`col-md-${md}`] : '',
    lg !== undefined ? styles[`col-lg-${lg}`] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} data-testid={testId} {...props}>
      {children}
    </div>
  );
}
