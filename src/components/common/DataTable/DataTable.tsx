import React from 'react';
import styles from './DataTable.module.scss';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Right-aligned, tabular figures. */
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** One cell per column, e.g. an "All keys" totals row. */
  footer?: React.ReactNode[];
  /** Read out by screen readers; not shown. */
  caption?: string;
  /** Shown in place of rows when there are none. */
  emptyText?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

/**
 * A plain data table for settings pages (usage breakdowns, API keys). Too
 * wide for a phone, it scrolls sideways inside its own box instead of the
 * page.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  footer,
  caption,
  emptyText,
  className = '',
  'data-testid': testId,
}: DataTableProps<T>): React.ReactElement {
  const cellClass = (column: DataTableColumn<T>) =>
    column.numeric ? styles.numeric : undefined;
  return (
    <div className={`${styles.scroll} ${className}`} data-testid={testId}>
      <table className={styles.table}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.key} scope="col" className={cellClass(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyText != null ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map(row => (
              <tr key={rowKey(row)}>
                {columns.map(column => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              {footer.map((cell, index) => (
                <td
                  key={columns[index]?.key ?? index}
                  className={cellClass(columns[index])}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
