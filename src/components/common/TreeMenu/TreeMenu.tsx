import React, { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './TreeMenu.module.scss';

export interface TreeMenuLeaf {
  key: string;
  label: string;
  path: string;
}

export interface TreeMenuItem {
  key: string;
  label: string;
  /** Icon asset URL. */
  icon: string;
  /** The section's own route; a section with children is "active" for any path under it. */
  path: string;
  /** Present → a section that expands to its pages instead of being a page itself. */
  children?: TreeMenuLeaf[];
}

/** A flat search result: a page, or a link outside the tree (e.g. Support). */
export interface TreeMenuSearchHit {
  key: string;
  label: string;
  icon: string;
  path: string;
}

export interface TreeMenuProps {
  items: TreeMenuItem[];
  /** The current route, e.g. "/settings/byok/llm-keys". */
  activePath: string;
  onNavigate: (path: string) => void;
  /**
   * Filters the tree into a flat list of matching pages. A page matches by
   * its own label or its section's.
   */
  query?: string;
  /** Links outside the tree that the search can also find. */
  extraSearchHits?: TreeMenuSearchHit[];
  /** Shown when the query matches nothing. */
  noResultsLabel?: string;
  /**
   * The phone's full-screen menu: finger-sized rows, and opening a section
   * only expands it.
   */
  touch?: boolean;
  'aria-label': string;
  /** Prefix for test ids: `${prefix}-search-hit-${key}`. @default 'tree-menu' */
  testIdPrefix?: string;
}

const isUnder = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);

/**
 * Grouped navigation for settings-style pages: sections with an icon that
 * expand to their pages, the section holding the current page expanded and
 * marked, and a search that flattens the tree into matching pages.
 */
export default function TreeMenu({
  items,
  activePath,
  onNavigate,
  query = '',
  extraSearchHits = [],
  noResultsLabel,
  touch = false,
  'aria-label': ariaLabel,
  testIdPrefix = 'tree-menu',
}: TreeMenuProps): React.ReactElement {
  const [expandedOverride, setExpandedOverride] = useState<
    Record<string, boolean>
  >({});
  const iconSize = touch ? 18 : 16;

  const inSection = (item: TreeMenuItem) => isUnder(activePath, item.path);
  const isExpanded = (item: TreeMenuItem) =>
    !!item.children && (expandedOverride[item.key] ?? inSection(item));

  const toggleSection = (item: TreeMenuItem) => {
    if (!item.children) return;
    const opening = !isExpanded(item);
    setExpandedOverride(prev => ({ ...prev, [item.key]: opening }));
    // From the sidebar, opening another section also opens its first page.
    if (opening && !touch && !inSection(item)) {
      onNavigate(item.children[0].path);
    }
  };

  const needle = query.trim().toLowerCase();
  const matches = (label: string) => label.toLowerCase().includes(needle);

  const navClass = `${styles.nav} ${touch ? styles.touch : ''}`;

  if (needle) {
    const hits: TreeMenuSearchHit[] = [
      ...items.flatMap(item =>
        item.children
          ? item.children
              .filter(child => matches(child.label) || matches(item.label))
              .map(child => ({
                key: `${item.key}-${child.key}`,
                label: child.label,
                icon: item.icon,
                path: child.path,
              }))
          : matches(item.label)
            ? [
                {
                  key: item.key,
                  label: item.label,
                  icon: item.icon,
                  path: item.path,
                },
              ]
            : []
      ),
      ...extraSearchHits.filter(hit => matches(hit.label)),
    ];
    if (hits.length === 0) {
      return <p className={styles.empty}>{noResultsLabel}</p>;
    }
    return (
      <nav className={navClass} aria-label={ariaLabel}>
        {hits.map(hit => (
          <button
            key={hit.key}
            type="button"
            className={styles.item}
            onClick={() => onNavigate(hit.path)}
            data-testid={`${testIdPrefix}-search-hit-${hit.key}`}
          >
            <Icon src={hit.icon} size={iconSize} className={styles.icon} />
            <span className={styles.label}>{hit.label}</span>
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className={navClass} aria-label={ariaLabel}>
      {items.map(item =>
        item.children ? (
          <div key={item.key} className={styles.group}>
            <button
              type="button"
              className={`${styles.item} ${inSection(item) ? styles.sectionActive : ''}`}
              onClick={() => toggleSection(item)}
              aria-expanded={isExpanded(item)}
              data-testid={`${testIdPrefix}-section-${item.key}`}
            >
              <Icon src={item.icon} size={iconSize} className={styles.icon} />
              <span className={styles.label}>{item.label}</span>
              <Icon
                src={ICONS.ALT_ARROW_RIGHT}
                size={14}
                className={`${styles.chevron} ${isExpanded(item) ? styles.chevronOpen : ''}`}
              />
            </button>
            {isExpanded(item) && (
              <div className={styles.children}>
                {item.children.map(child => {
                  const active =
                    inSection(item) && isUnder(activePath, child.path);
                  return (
                    <button
                      key={child.key}
                      type="button"
                      className={`${styles.child} ${active ? styles.active : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onNavigate(child.path)}
                      data-testid={`${testIdPrefix}-page-${item.key}-${child.key}`}
                    >
                      <span className={styles.label}>{child.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <button
            key={item.key}
            type="button"
            className={`${styles.item} ${isUnder(activePath, item.path) ? styles.active : ''}`}
            aria-current={isUnder(activePath, item.path) ? 'page' : undefined}
            onClick={() => onNavigate(item.path)}
            data-testid={`${testIdPrefix}-page-${item.key}`}
          >
            <Icon src={item.icon} size={iconSize} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </button>
        )
      )}
    </nav>
  );
}
