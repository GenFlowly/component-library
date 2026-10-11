import React, { ReactNode, useState } from 'react';
import ScrollArea from '../ScrollArea/ScrollArea';
import styles from './SidebarListPanel.module.scss';

// Exposed for consumers that render custom item content and want to reuse the
// panel's detail/timestamp styling (same pattern as pageHeaderStyles).
export { styles as sidebarListPanelStyles };

export interface SidebarListItemAction {
  icon: ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  // Hidden until the row is hovered or focused (always shown on touch devices)
  revealOnHover?: boolean;
  testId?: string;
}

export interface SidebarListItem {
  id: string;
  // Row label; non-string nodes lose the hover-title fallback
  label: ReactNode;
  // Extra content for the item's second line (timestamps, badges, ...)
  details?: ReactNode;
  isActive?: boolean;
  // aria-current value applied when the item is active ('page' for nav lists)
  ariaCurrent?: 'page' | 'true';
  onSelect: () => void;
  // Optional trailing button (archive, delete, ...) shown at the row's right edge.
  // Deprecated: use `actions` instead; ignored when `actions` is set.
  action?: SidebarListItemAction;
  // Trailing buttons shown at the row's right edge, in order
  actions?: SidebarListItemAction[];
  testId?: string;
}

export interface SidebarListGroup {
  id: string;
  label: string;
  items?: SidebarListItem[];
  // Nested subsections rendered after this group's items; recursive, so a
  // section can hold collapsible entries that hold their own subsections
  groups?: SidebarListGroup[];
  // Render the header as an expand/collapse row (chevron + optional icon)
  // instead of a static section label
  collapsible?: boolean;
  // Initial expanded state for collapsible groups; expansion is uncontrolled
  defaultExpanded?: boolean;
  // Leading node on collapsible headers (e.g. a folder icon for a project)
  icon?: ReactNode;
  onToggle?: (expanded: boolean) => void;
  testId?: string;
}

export interface SidebarListPanelProps {
  // Panel header above the list; omit when the groups' own headers are enough
  title?: string;
  groups: SidebarListGroup[];
  isLoading: boolean;
  hasError: boolean;
  errorText: string;
  emptyText: string;
  listAriaLabel?: string;
  // Rendered below the list (e.g. a "Load more" pagination button)
  footer?: ReactNode;
  'data-testid'?: string;
  testIds?: {
    list?: string;
    loading?: string;
    error?: string;
    empty?: string;
  };
}

// Styled pagination button for the panel's footer slot
export function SidebarListLoadMore({
  label,
  onClick,
  disabled,
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      className={styles.loadMore}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function ItemRow({ item }: { item: SidebarListItem }) {
  const itemActions = item.actions ?? (item.action ? [item.action] : []);
  return (
    <li
      className={`${styles.itemRow} ${itemActions.length > 1 ? styles.multiAction : ''}`}
    >
      <button
        className={`${styles.item} ${item.isActive ? styles.active : ''}`}
        onClick={item.onSelect}
        title={typeof item.label === 'string' ? item.label : undefined}
        aria-current={item.isActive ? (item.ariaCurrent ?? 'true') : undefined}
        data-testid={item.testId}
      >
        <div className={styles.itemContent}>
          <div className={styles.itemHeader}>
            <span className={styles.itemLabel}>{item.label}</span>
          </div>
          {item.details != null && (
            <div className={styles.itemDetails}>{item.details}</div>
          )}
        </div>
      </button>
      {itemActions.length > 0 && (
        <div className={styles.actionsWrap}>
          {itemActions.map((action, index) => (
            <button
              key={index}
              className={`${styles.actionBtn} ${action.revealOnHover ? styles.hoverReveal : ''}`}
              onClick={action.onClick}
              title={action.label}
              aria-label={action.label}
              data-testid={action.testId}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ''}`}
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

function GroupSection({ group }: { group: SidebarListGroup }) {
  const [expanded, setExpanded] = useState(group.defaultExpanded ?? false);

  const items = group.items ?? [];
  const content = (
    <>
      {items.length > 0 && (
        <ul className={styles.groupList}>
          {items.map(item => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
      {(group.groups ?? []).map(sub => (
        <GroupSection key={sub.id} group={sub} />
      ))}
    </>
  );

  if (!group.collapsible) {
    return (
      <div className={styles.group}>
        <div className={styles.groupHeader} data-testid={group.testId}>
          {group.label}
        </div>
        {content}
      </div>
    );
  }

  const contentId = `sidebar-list-group-${group.id}`;
  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    group.onToggle?.(next);
  };

  return (
    <div className={styles.group}>
      <button
        className={styles.collapsibleHeader}
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-controls={expanded ? contentId : undefined}
        title={group.label}
        data-testid={group.testId}
      >
        <Chevron expanded={expanded} />
        {group.icon != null && (
          <span className={styles.groupIcon}>{group.icon}</span>
        )}
        <span className={styles.collapsibleLabel}>{group.label}</span>
      </button>
      {expanded && (
        <div id={contentId} className={styles.groupChildren}>
          {content}
        </div>
      )}
    </div>
  );
}

// A group renders something when it has items, is a collapsible row (content
// in itself, even while collapsed and empty), or nests a group that does
function hasContent(groups: SidebarListGroup[]): boolean {
  return groups.some(
    group =>
      (group.items?.length ?? 0) > 0 ||
      group.collapsible === true ||
      (group.groups != null && hasContent(group.groups))
  );
}

/**
 * Shared sidebar list UI: header, skeleton/error/empty states and a grouped,
 * scrollable list of selectable items. Groups nest via `groups` (e.g. a
 * Projects section holding collapsible projects with their own subsections).
 * Data fetching and item semantics stay with the caller (conversation
 * history, saved notes, ...).
 */
export default function SidebarListPanel({
  title,
  groups,
  isLoading,
  hasError,
  errorText,
  emptyText,
  listAriaLabel,
  footer,
  'data-testid': testId,
  testIds,
}: SidebarListPanelProps) {
  const isEmpty = !hasContent(groups);

  return (
    <div className={styles.container} data-testid={testId}>
      {title && <div className={styles.header}>{title}</div>}

      {isLoading && isEmpty ? (
        <div className={styles.skeleton} data-testid={testIds?.loading}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={styles.skeletonItem}
              style={{ width: `${70 + (i % 3) * 10}%` }}
            />
          ))}
        </div>
      ) : hasError && isEmpty ? (
        // A failed background refresh keeps showing the stale list;
        // the error state is only for having nothing at all to show
        <div className={styles.emptyState} data-testid={testIds?.error}>
          {errorText}
        </div>
      ) : isEmpty ? (
        <div className={styles.emptyState} data-testid={testIds?.empty}>
          {emptyText}
        </div>
      ) : (
        <ScrollArea
          className={styles.list}
          aria-label={listAriaLabel}
          data-testid={testIds?.list}
        >
          {groups.map(group => (
            <GroupSection key={group.id} group={group} />
          ))}
        </ScrollArea>
      )}

      {footer}
    </div>
  );
}
