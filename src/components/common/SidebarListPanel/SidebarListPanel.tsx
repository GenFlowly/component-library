import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ScrollArea from '../ScrollArea/ScrollArea';
import Tooltip from '../Tooltip/Tooltip';
import ActionMenu from '../ActionMenu/ActionMenu';
import Chevron from './Chevron';
import SwipeableRow, { SwipeRowsContext } from './SwipeableRow';
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
  // Fill of the action in a swipe tray; ignored on inline buttons
  tone?: 'neutral' | 'primary' | 'muted';
  // Which swipe tray holds this action on a touch row: 'trailing' (swipe
  // left, the default) or 'leading' (swipe right). Read for menuActions only.
  swipe?: 'leading' | 'trailing';
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
  // Actions behind the row's More actions button. On touch rows of the menu
  // variant they move into the swipe trays instead (see `swipe`).
  menuActions?: SidebarListItemAction[];
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
  // Leading node on the header (e.g. a folder icon for a project)
  icon?: ReactNode;
  // Extra controls at the right of a static header (e.g. filter chips)
  headerContent?: ReactNode;
  onToggle?: (expanded: boolean) => void;
  // Icon buttons at the right edge of the group header (e.g. "new project",
  // "new conversation"). On a static section header they sit inline beside
  // the label; on a collapsible row they overlay the row's right edge as
  // sibling buttons (clicking one never toggles expansion), honoring
  // revealOnHover like item actions.
  actions?: SidebarListItemAction[];
  // A collapsible row's actions behind its More actions button, or in its
  // swipe trays on touch rows of the menu variant
  menuActions?: SidebarListItemAction[];
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
  // 'history': the list shows its card's material. 'directory': it paints
  // the sidebar background over it.
  variant?: 'history' | 'directory';
  // The full-screen mobile menu: touch sizing at every width it shows at,
  // and on touch devices item actions move into a swipe tray.
  touch?: boolean;
  // Accessible name and tooltip of the button that opens a row's menuActions
  moreActionsLabel?: string;
  // Infinite scroll: called when the end of the scrolling list comes within
  // ~120px of view — including right after a load that still doesn't fill
  // the viewport. Pass it only while another page can actually be fetched
  // (gate on your hasMore/isLoading/error); the panel does not debounce.
  onEndReached?: () => void;
  // Rendered below the list (e.g. a "Load more" pagination button)
  footer?: ReactNode;
  // The list grows to its full height and scrolls with the column it sits in
  // (a SidebarStack) instead of inside itself; onEndReached then watches how
  // close that column's view is to the end of the list
  hug?: boolean;
  'data-testid'?: string;
  testIds?: {
    list?: string;
    loading?: string;
    error?: string;
    empty?: string;
    endSentinel?: string;
  };
}

const MoreActionsLabelContext = createContext('More actions');

// The nearest ancestor that scrolls: what a hugging list's rows scroll in
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
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

function ActionButton({
  action,
  className,
}: {
  action: SidebarListItemAction;
  className: string;
}) {
  return (
    <Tooltip content={action.label} position="bottom">
      <button
        type="button"
        className={`${className} ${action.revealOnHover ? styles.hoverReveal : ''}`}
        onClick={action.onClick}
        aria-label={action.label}
        data-testid={action.testId}
      >
        {action.icon}
      </button>
    </Tooltip>
  );
}

// Inline buttons, then the More actions button when the row has a menu
function RowActions({
  inline,
  menu,
  testId,
}: {
  inline: SidebarListItemAction[];
  menu: SidebarListItemAction[];
  testId?: string;
}) {
  const moreActionsLabel = useContext(MoreActionsLabelContext);
  if (inline.length === 0 && menu.length === 0) return null;
  return (
    <div className={styles.actionsWrap}>
      {inline.map((action, index) => (
        <ActionButton
          key={index}
          action={action}
          className={styles.actionBtn}
        />
      ))}
      {menu.length > 0 && (
        <ActionMenu
          label={moreActionsLabel}
          items={menu.map(action => ({
            icon: action.icon,
            label: action.label,
            onClick: action.onClick,
            testId: action.testId,
          }))}
          className={`${styles.actionBtn} ${styles.moreBtn} ${styles.hoverReveal}`}
          data-testid={testId ? `${testId}-more` : undefined}
          menuTestId={testId ? `${testId}-menu` : undefined}
        />
      )}
    </div>
  );
}

// On a touch row, menu actions split into the two trays by their side, and
// inline actions join the trailing tray (they have nowhere to sit otherwise)
function swipeTrays(
  inline: SidebarListItemAction[],
  menu: SidebarListItemAction[]
) {
  return {
    leading: menu.filter(action => action.swipe === 'leading'),
    trailing: [
      ...inline,
      ...menu.filter(action => (action.swipe ?? 'trailing') === 'trailing'),
    ],
  };
}

function rowActionsClass(count: number): string {
  if (count === 0) return styles.noActions;
  return count > 1 ? styles.multiAction : '';
}

function ItemRow({ item }: { item: SidebarListItem }) {
  const { swipeRows } = useContext(SwipeRowsContext);
  const inline = item.actions ?? (item.action ? [item.action] : []);
  const menu = item.menuActions ?? [];
  const children = item.children ?? [];
  const trays = swipeRows ? swipeTrays(inline, menu) : null;
  const swipeable =
    trays != null && trays.leading.length + trays.trailing.length > 0;
  const buttonCount = swipeable ? 0 : inline.length + (menu.length > 0 ? 1 : 0);
  const rowButton = (
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
  );
  return (
    // The row itself is a div inside the li so hover-reveal and the action
    // overlay stay scoped to this row, not the nested children below it
    <li className={styles.itemLi}>
      <div className={`${styles.itemRow} ${rowActionsClass(buttonCount)}`}>
        {swipeable ? (
          <SwipeableRow
            rowId={item.id}
            leadingActions={trays.leading}
            trailingActions={trays.trailing}
          >
            {rowButton}
          </SwipeableRow>
        ) : (
          <>
            {rowButton}
            <RowActions inline={inline} menu={menu} testId={item.testId} />
          </>
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
  const { swipeRows } = useContext(SwipeRowsContext);
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
        {(group.label || headerActions.length > 0) && (
          <div
            className={`${styles.groupHeader} ${isTopLevel ? styles.stickyHeader : ''}`}
            data-testid={group.testId}
          >
            {group.icon != null && (
              <span className={styles.groupIcon}>{group.icon}</span>
            )}
            <span className={styles.groupHeaderLabel}>{group.label}</span>
            {group.headerContent}
            {headerActions.length > 0 && (
              <span className={styles.groupHeaderActions}>
                {headerActions.map((action, index) => (
                  <ActionButton
                    key={index}
                    action={action}
                    className={styles.groupHeaderBtn}
                  />
                ))}
              </span>
            )}
          </div>
        )}
        {content}
      </div>
    );
  }

  const contentId = `sidebar-list-group-${group.id}`;
  const inline = group.actions ?? [];
  const menu = group.menuActions ?? [];
  const trays = swipeRows ? swipeTrays([], menu) : null;
  const swipeable =
    trays != null && trays.leading.length + trays.trailing.length > 0;
  const buttonCount = inline.length + (!swipeable && menu.length > 0 ? 1 : 0);
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

  const header = (
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
  );

  return (
    <div className={styles.group}>
      <div
        className={`${styles.collapsibleHeaderRow} ${isTopLevel ? styles.stickyHeader : ''} ${buttonCount > 0 ? styles.hasActions : ''} ${buttonCount > 1 ? styles.multiAction : ''}`}
      >
        {swipeable ? (
          <SwipeableRow
            rowId={group.id}
            leadingActions={trays.leading}
            trailingActions={trays.trailing}
          >
            <div className={styles.collapsibleHeaderInner}>
              {header}
              <RowActions inline={inline} menu={[]} testId={group.testId} />
            </div>
          </SwipeableRow>
        ) : (
          <>
            {header}
            <RowActions inline={inline} menu={menu} testId={group.testId} />
          </>
        )}
      </div>
      {hasChildren && expanded && (
        <div
          id={contentId}
          className={isTopLevel ? styles.topLevelContent : styles.groupChildren}
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
  variant = 'directory',
  touch = false,
  moreActionsLabel = 'More actions',
  onEndReached,
  footer,
  hug = false,
  'data-testid': testId,
  testIds,
}: SidebarListPanelProps) {
  const [isTouchDevice] = useState(
    () => window.matchMedia?.('(hover: none)').matches ?? false
  );
  const swipeRows = touch && isTouchDevice;
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const swipeContext = useMemo(
    () => ({ swipeRows, openRowId, setOpenRowId }),
    [swipeRows, openRowId]
  );
  const fixed = fixedGroups ?? [];
  const isEmpty = !hasContent(groups) && !hasContent(fixed);

  const listRef = useRef<HTMLElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onEndReached || isEmpty) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const list = listRef.current;
    const target = endSentinelRef.current;
    if (!list || !target) return;
    const rootEl = hug ? scrollParent(list) : list;
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
  }, [onEndReached, isEmpty, groups, hug]);

  // Scrolling closes an open swipe tray; a hugging list scrolls with its column
  useEffect(() => {
    if (!hug || !openRowId || !listRef.current) return;
    const scroller = scrollParent(listRef.current);
    if (!scroller) return;
    const close = () => setOpenRowId(null);
    scroller.addEventListener('scroll', close, { passive: true });
    return () => scroller.removeEventListener('scroll', close);
  }, [hug, openRowId]);

  const listContent = (
    <>
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
    </>
  );

  return (
    <div
      className={`${styles.container} ${touch ? styles.touch : ''} ${variant === 'history' ? styles.history : ''} ${hug ? styles.hug : ''}`}
      data-testid={testId}
    >
      <MoreActionsLabelContext.Provider value={moreActionsLabel}>
        <SwipeRowsContext.Provider value={swipeContext}>
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
              {hug ? (
                <div
                  ref={el => {
                    listRef.current = el;
                  }}
                  className={styles.list}
                  aria-label={listAriaLabel}
                  data-testid={testIds?.list}
                >
                  {listContent}
                </div>
              ) : (
                <ScrollArea
                  ref={listRef}
                  className={styles.list}
                  aria-label={listAriaLabel}
                  data-testid={testIds?.list}
                  onScroll={openRowId ? () => setOpenRowId(null) : undefined}
                >
                  {listContent}
                </ScrollArea>
              )}
            </>
          )}

          {footer}
        </SwipeRowsContext.Provider>
      </MoreActionsLabelContext.Provider>
    </div>
  );
}
