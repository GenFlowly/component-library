import React, { useMemo, useState } from 'react';
import styles from './GraphEditor.module.scss';
import { NodeCatalogEntry, NodeTypeInfo } from './types';
import { TYPE_COLOR_CSS_VAR } from './nodeTypeInfo';

/**
 * dataTransfer MIME type of palette drags. The payload is a JSON-encoded
 * {@link PalettePreset} (a plain nodeType string is still accepted on drop
 * for backward compatibility).
 */
export const PALETTE_DRAG_MIME = 'application/x-graph-editor-node-type';

/**
 * The preset carried by a palette drag: a runtime behavior (nodeType) plus a
 * ready-made name/config. Both palette sections drag the same payload — a
 * "Node types" item is simply a bare preset built from the type's metadata.
 * The same nodeType may appear (and be dropped) any number of times.
 */
export interface PalettePreset {
  nodeType: string;
  label: string;
  defaultConfig: string;
}

/** Contract lists longer than this collapse behind a <details> toggle. */
const CONTRACT_COLLAPSE_THRESHOLD = 2;

function ContractList({
  attributes,
  toggleLabel,
}: {
  attributes: string[];
  toggleLabel: string;
}) {
  if (attributes.length === 0) return null;
  const list = (
    <ul className={styles.paletteAttrList}>
      {attributes.map(line => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
  if (attributes.length > CONTRACT_COLLAPSE_THRESHOLD) {
    return (
      <details className={styles.paletteAttrDetails}>
        <summary>{toggleLabel}</summary>
        {list}
      </details>
    );
  }
  return list;
}

interface NodePaletteProps {
  /** Runtime node types shown in the "Node types" section (already merged). */
  typeInfos: NodeTypeInfo[];
  /** Pre-made presets shown in the "Pre-made nodes" section. */
  catalog: NodeCatalogEntry[];
  typesTitle: string;
  presetsTitle: string;
  searchPlaceholder: string;
  emptyLabel: string;
  contractToggleLabel: string;
  footerNote: string;
  /** Accent color of a nodeType (merged info color or deterministic hue). */
  colorForType: (nodeType: string) => string;
}

function typeColorStyle(
  colorForType: (nodeType: string) => string,
  nodeType: string
): React.CSSProperties {
  return {
    [TYPE_COLOR_CSS_VAR]: colorForType(nodeType),
  } as React.CSSProperties;
}

function setDragPayload(e: React.DragEvent, preset: PalettePreset): void {
  e.dataTransfer.setData(PALETTE_DRAG_MIME, JSON.stringify(preset));
  e.dataTransfer.effectAllowed = 'move';
}

/**
 * Left sidebar of the editor, in two searchable sections: the runtime "Node
 * types" (bare nodes with the type's default config and contract hints) and
 * the "Pre-made nodes" catalog (ready-made presets). Entries of both sections
 * are HTML5 drag sources carrying a {@link PalettePreset}; dropping one on
 * the canvas creates a node named after the entry's label. A footer note with
 * the graph-level rules stays visible below the scrolling list.
 */
export default function NodePalette({
  typeInfos,
  catalog,
  typesTitle,
  presetsTitle,
  searchPlaceholder,
  emptyLabel,
  contractToggleLabel,
  footerNote,
  colorForType,
}: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const filteredTypes = useMemo(() => {
    // Legacy alias types resolve colors/labels for existing graphs but are
    // not offered for dropping — only real runtime primitives are.
    const visible = typeInfos.filter(info => !info.paletteHidden);
    if (!query) return visible;
    return visible.filter(
      info =>
        info.label.toLowerCase().includes(query) ||
        info.nodeType.toLowerCase().includes(query) ||
        (info.description ?? '').toLowerCase().includes(query) ||
        (info.requiredAttributes ?? []).some(line =>
          line.toLowerCase().includes(query)
        )
    );
  }, [typeInfos, query]);

  // A preset's contract: its own lines, else its underlying primitive's.
  const contractForEntry = useMemo(() => {
    const byType = new Map(typeInfos.map(info => [info.nodeType, info]));
    return (entry: NodeCatalogEntry): string[] =>
      entry.requiredAttributes ??
      byType.get(entry.nodeType)?.requiredAttributes ??
      [];
  }, [typeInfos]);

  const filteredCatalog = useMemo(() => {
    if (!query) return catalog;
    return catalog.filter(
      entry =>
        entry.label.toLowerCase().includes(query) ||
        entry.nodeType.toLowerCase().includes(query) ||
        (entry.description ?? '').toLowerCase().includes(query) ||
        contractForEntry(entry).some(line => line.toLowerCase().includes(query))
    );
  }, [catalog, query, contractForEntry]);

  return (
    <aside className={styles.palette} data-testid="graph-editor-palette">
      <input
        className={styles.paletteSearch}
        type="search"
        value={search}
        placeholder={searchPlaceholder}
        onChange={e => setSearch(e.target.value)}
        data-testid="graph-editor-palette-search"
      />
      <div className={styles.paletteScroll}>
        {filteredTypes.length === 0 && filteredCatalog.length === 0 && (
          <div className={styles.paletteEmpty}>{emptyLabel}</div>
        )}

        {filteredTypes.length > 0 && (
          <>
            <div className={styles.paletteTitle}>{typesTitle}</div>
            <div className={styles.paletteList}>
              {filteredTypes.map(info => (
                <div
                  key={info.nodeType}
                  className={styles.paletteItem}
                  style={typeColorStyle(colorForType, info.nodeType)}
                  draggable
                  onDragStart={e =>
                    setDragPayload(e, {
                      nodeType: info.nodeType,
                      label: info.label,
                      defaultConfig: info.defaultConfig ?? '{}',
                    })
                  }
                  data-testid={`graph-editor-palette-type-${info.nodeType}`}
                >
                  <span className={styles.paletteItemLabel}>{info.label}</span>
                  <span className={styles.paletteTypeCode}>
                    {info.nodeType}
                  </span>
                  {info.description && (
                    <span className={styles.paletteItemDescription}>
                      {info.description}
                    </span>
                  )}
                  <ContractList
                    attributes={info.requiredAttributes ?? []}
                    toggleLabel={contractToggleLabel}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {filteredCatalog.length > 0 && (
          <>
            <div className={styles.paletteTitle}>{presetsTitle}</div>
            <div className={styles.paletteList}>
              {filteredCatalog.map((entry, index) => (
                <div
                  key={`${entry.nodeType}-${entry.label}-${index}`}
                  className={styles.paletteItem}
                  style={typeColorStyle(colorForType, entry.nodeType)}
                  draggable
                  onDragStart={e =>
                    setDragPayload(e, {
                      nodeType: entry.nodeType,
                      label: entry.label,
                      defaultConfig: entry.defaultConfig,
                    })
                  }
                  data-testid={`graph-editor-palette-item-${entry.nodeType}`}
                >
                  <span className={styles.paletteItemLabel}>{entry.label}</span>
                  {entry.description && (
                    <span className={styles.paletteItemDescription}>
                      {entry.description}
                    </span>
                  )}
                  <ContractList
                    attributes={contractForEntry(entry)}
                    toggleLabel={contractToggleLabel}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div
        className={styles.paletteFooter}
        data-testid="graph-editor-palette-footer"
      >
        {footerNote}
      </div>
    </aside>
  );
}
