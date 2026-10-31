import React, { ReactNode, useEffect, useRef, useState } from 'react';
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
  // Child items (e.g. conversations forked off this one), rendered indented
  // under the row behind a connecting tree guide; recursive
  children?: SidebarListItem[];
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
  // Icon buttons at the right edge of the group header (e.g. "new project",
  // "new conversation"). On a static section header they sit inline beside
  // the label; on a collapsible row they overlay the row's right edge as
  // sibling buttons (clicking one never toggles expansion), honoring
  // revealOnHover like item actions.
  actions?: SidebarListItemAction[];
  testId?: string;
}

export interface SidebarListPanelProps {
  // Panel header above the list; omit when the groups' own headers are enough
  title?: string;
  groups: SidebarListGroup[];
  // Groups rendered in a non-scrolling block above the list (e.g. a Pinned
  // section that stays put while the list scrolls). The block hugs its
  // content with no height cap, so the scrolling list gets what remains.
  fixedGroups?: SidebarListGroup[];
  isLoading: boolean;
  hasError: boolean;
  errorText: string;
  emptyText: string;
  listAriaLabel?: string;
  // Infinite scroll: called when the end of the scrolling list comes within
  // ~120px of view — including right after a load that still doesn't fill
  // the viewport. Pass it only while another page can actually be fetched
  // (gate on your hasMore/isLoading/error); the panel does not debounce.
  onEndReached?: () => void;
  // Rendered below the list (e.g. a "Load more" pagination button)
  footer?: ReactNode;
  'data-testid'?: string;
  testIds?: {
    list?: string;
    loading?: string;
    error?: string;
    empty?: string;
    endSentinel?: string;
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
  const children = item.children ?? [];
  return (
    // The row itself is a div inside the li so hover-reveal and the action
    // overlay stay scoped to this row, not the nested children below it
    <li className={styles.itemLi}>
      <div
        className={`${styles.itemRow} ${itemActions.length > 1 ? styles.multiAction : ''}`}
      >
        <button
          className={`${styles.item} ${item.isActive ? styles.active : ''}`}
          onClick={item.onSelect}
          title={typeof item.label === 'string' ? item.label : undefined}
          aria-current={
            item.isActive ? (item.ariaCurrent ?? 'true') : undefined
          }
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
      </div>
      {children.length > 0 && (
        <ul className={styles.itemChildren}>
          {children.map(child => (
            <ItemRow key={child.id} item={child} />
          ))}
        </ul>
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

function GroupSection({
  group,
  // Top-level section headings (Projects, Pinned, Recents) stick to the top
  // of the scroll area; nested subsection headings stay in flow — a stuck
  // nested heading would overlap its parent's stuck heading
  isTopLevel = false,
}: {
  group: SidebarListGroup;
  isTopLevel?: boolean;
}) {
  const [expanded, setExpanded] = useState(group.defaultExpanded ?? false);
  const headerRef = useRef<HTMLButtonElement>(null);
  // Tracks the PREVIOUS render's expanded value so the scroll-into-view
  // effect below can tell "just expanded by the user" apart from "mounted
  // already expanded" (defaultExpanded) — only the former should scroll
  const wasExpandedRef = useRef(expanded);

  useEffect(() => {
    if (expanded && !wasExpandedRef.current) {
      // A freshly expanded group (e.g. a project folder) can land anywhere
      // in the scroll area — including entirely below the fold, with none
      // of its newly revealed content visible. Scrolling its header to the
      // top guarantees the content right under it is what's in view.
      headerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    wasExpandedRef.current = expanded;
  }, [expanded]);

  const items = group.items ?? [];
  // A collapsible row with no items and no subsections (e.g. a project with
  // no conversations yet) has nothing to expand: it keeps its icon, label and
  // actions but drops the chevron and toggle behavior
  const hasChildren = items.length > 0 || (group.groups?.length ?? 0) > 0;
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
    const headerActions = group.actions ?? [];
    return (
      <div className={styles.group}>
        <div
          className={`${styles.groupHeader} ${isTopLevel ? styles.stickyHeader : ''}`}
          data-testid={group.testId}
        >
          <span className={styles.groupHeaderLabel}>{group.label}</span>
          {headerActions.length > 0 && (
            <span className={styles.groupHeaderActions}>
              {headerActions.map((action, index) => (
                <button
                  key={index}
                  className={styles.groupHeaderBtn}
                  onClick={action.onClick}
                  title={action.label}
                  aria-label={action.label}
                  data-testid={action.testId}
                >
                  {action.icon}
                </button>
              ))}
            </span>
          )}
        </div>
        {content}
      </div>
    );
  }

  const contentId = `sidebar-list-group-${group.id}`;
  const headerActions = group.actions ?? [];
  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    group.onToggle?.(next);
  };

  // Top-level sections (Projects, Pinned, Recents) keep their uppercase
  // sticky-header look even once collapsible; nested rows (e.g. a project
  // entry) keep the item-like row look they've always had
  const headerClassName = isTopLevel
    ? `${styles.groupHeader} ${styles.groupHeaderToggle}`
    : styles.collapsibleHeader;
  const labelClassName = isTopLevel
    ? styles.groupHeaderLabel
    : styles.collapsibleLabel;

  return (
    <div className={styles.group}>
      <div
        className={`${styles.collapsibleHeaderRow} ${isTopLevel ? styles.stickyHeader : ''} ${headerActions.length > 0 ? styles.hasActions : ''} ${headerActions.length > 1 ? styles.multiAction : ''}`}
      >
        <button
          ref={headerRef}
          className={headerClassName}
          onClick={hasChildren ? handleToggle : undefined}
          aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={hasChildren && expanded ? contentId : undefined}
          title={group.label}
          data-testid={group.testId}
        >
          {hasChildren ? (
            <Chevron expanded={expanded} />
          ) : (
            // Same footprint as the chevron so the row's icon and label stay
            // aligned with expandable siblings
            <span className={styles.chevronSpacer} aria-hidden="true" />
          )}
          {group.icon != null && (
            <span className={styles.groupIcon}>{group.icon}</span>
          )}
          <span className={labelClassName}>{group.label}</span>
        </button>
        {headerActions.length > 0 && (
          <div className={styles.actionsWrap}>
            {headerActions.map((action, index) => (
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
      </div>
      {hasChildren && expanded && (
        <div
          id={contentId}
          className={isTopLevel ? undefined : styles.groupChildren}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// A group renders something when it has items, is a collapsible row (content
// in itself, even while collapsed and empty), carries header actions (which
// must stay reachable even when the group holds nothing yet), or nests a
// group that does
function hasContent(groups: SidebarListGroup[]): boolean {
  return groups.some(
    group =>
      (group.items?.length ?? 0) > 0 ||
      group.collapsible === true ||
      (group.actions?.length ?? 0) > 0 ||
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
  fixedGroups,
  isLoading,
  hasError,
  errorText,
  emptyText,
  listAriaLabel,
  onEndReached,
  footer,
  'data-testid': testId,
  testIds,
}: SidebarListPanelProps) {
  const fixed = fixedGroups ?? [];
  const isEmpty = !hasContent(groups) && !hasContent(fixed);

  const listRef = useRef<HTMLElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onEndReached || isEmpty) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const rootEl = listRef.current;
    const target = endSentinelRef.current;
    if (!rootEl || !target) return;
    // Recreated whenever groups change: observe() always reports the initial
    // intersection, so a list that still doesn't fill the viewport after a
    // load immediately requests the next page
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) onEndReached();
      },
      { root: rootEl, rootMargin: '120px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [onEndReached, isEmpty, groups]);

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
        <>
          {hasContent(fixed) && (
            <div className={styles.fixedSection}>
              {fixed.map(group => (
                <GroupSection key={group.id} group={group} isTopLevel />
              ))}
            </div>
          )}
          <ScrollArea
            ref={listRef}
            className={styles.list}
            aria-label={listAriaLabel}
            data-testid={testIds?.list}
          >
            {groups.map(group => (
              <GroupSection key={group.id} group={group} isTopLevel />
            ))}
            {onEndReached != null && (
              <div
                ref={endSentinelRef}
                className={styles.endSentinel}
                aria-hidden="true"
                data-testid={testIds?.endSentinel}
              />
            )}
          </ScrollArea>
        </>
      )}

      {footer}
    </div>
  );
}
