import React, { useMemo, useState } from 'react';
import styles from './GraphEditor.module.scss';
import { NodeCatalogEntry } from './types';

/** dataTransfer MIME type carrying the dragged catalog nodeType. */
export const PALETTE_DRAG_MIME = 'application/x-graph-editor-node-type';

interface NodePaletteProps {
  catalog: NodeCatalogEntry[];
  title: string;
  searchPlaceholder: string;
  emptyLabel: string;
}

/**
 * Left sidebar listing the node catalog. Entries are HTML5 drag sources;
 * dropping one on the canvas creates a node of that type.
 */
export default function NodePalette({
  catalog,
  title,
  searchPlaceholder,
  emptyLabel,
}: NodePaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter(
      entry =>
        entry.label.toLowerCase().includes(query) ||
        entry.nodeType.toLowerCase().includes(query) ||
        (entry.description ?? '').toLowerCase().includes(query)
    );
  }, [catalog, search]);

  return (
    <aside className={styles.palette} data-testid="graph-editor-palette">
      <div className={styles.paletteTitle}>{title}</div>
      <input
        className={styles.paletteSearch}
        type="search"
        value={search}
        placeholder={searchPlaceholder}
        onChange={e => setSearch(e.target.value)}
        data-testid="graph-editor-palette-search"
      />
      <div className={styles.paletteList}>
        {filtered.length === 0 && (
          <div className={styles.paletteEmpty}>{emptyLabel}</div>
        )}
        {filtered.map(entry => (
          <div
            key={entry.nodeType}
            className={styles.paletteItem}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData(PALETTE_DRAG_MIME, entry.nodeType);
              e.dataTransfer.effectAllowed = 'move';
            }}
            data-testid={`graph-editor-palette-item-${entry.nodeType}`}
          >
            <span className={styles.paletteItemLabel}>{entry.label}</span>
            {entry.description && (
              <span className={styles.paletteItemDescription}>
                {entry.description}
              </span>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
