import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarListPanel, {
  SidebarListGroup,
  SidebarListItem,
} from './SidebarListPanel';
import '@testing-library/jest-dom';

const baseProps = {
  title: 'History',
  isLoading: false,
  hasError: false,
  errorText: 'error',
  emptyText: 'empty',
};

describe('SidebarListPanel actions', () => {
  const makeGroups = (item: Partial<SidebarListItem>): SidebarListGroup[] => [
    {
      id: 'g1',
      label: 'Today',
      items: [
        {
          id: 'i1',
          label: 'Item one',
          onSelect: jest.fn(),
          ...item,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders legacy single action', () => {
    const groups = makeGroups({
      action: {
        icon: <span>x</span>,
        label: 'Delete',
        onClick: jest.fn(),
        testId: 'delete-btn',
      },
    });
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    expect(screen.getByTestId('delete-btn')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  test('renders multiple actions in order and fires their handlers', async () => {
    const onPin = jest.fn();
    const onDelete = jest.fn();
    const groups = makeGroups({
      actions: [
        {
          icon: <span>p</span>,
          label: 'Pin',
          onClick: onPin,
          revealOnHover: true,
          testId: 'pin-btn',
        },
        {
          icon: <span>x</span>,
          label: 'Delete',
          onClick: onDelete,
          testId: 'delete-btn',
        },
      ],
    });
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    const pin = screen.getByTestId('pin-btn');
    const del = screen.getByTestId('delete-btn');
    expect(pin.compareDocumentPosition(del)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );

    await userEvent.click(pin);
    expect(onPin).toHaveBeenCalledTimes(1);
    await userEvent.click(del);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('revealOnHover action gets the hoverReveal class, others do not', () => {
    const groups = makeGroups({
      actions: [
        {
          icon: <span>p</span>,
          label: 'Pin',
          onClick: jest.fn(),
          revealOnHover: true,
          testId: 'pin-btn',
        },
        {
          icon: <span>x</span>,
          label: 'Delete',
          onClick: jest.fn(),
          testId: 'delete-btn',
        },
      ],
    });
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    expect(screen.getByTestId('pin-btn').className).toContain('hoverReveal');
    expect(screen.getByTestId('delete-btn').className).not.toContain(
      'hoverReveal'
    );
  });

  test('actions takes precedence over legacy action', () => {
    const groups = makeGroups({
      action: {
        icon: <span>x</span>,
        label: 'Legacy',
        onClick: jest.fn(),
        testId: 'legacy-btn',
      },
      actions: [
        {
          icon: <span>p</span>,
          label: 'Pin',
          onClick: jest.fn(),
          testId: 'pin-btn',
        },
      ],
    });
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    expect(screen.getByTestId('pin-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-btn')).not.toBeInTheDocument();
  });

  test('renders no action buttons when neither action nor actions given', () => {
    const groups = makeGroups({});
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    expect(
      screen.queryByRole('button', { name: 'Pin' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Item one')).toBeInTheDocument();
  });
});

describe('SidebarListPanel group headers', () => {
  const group = (label: string): SidebarListGroup => ({
    id: 'g1',
    label,
    testId: 'group-header',
    items: [{ id: 'i1', label: 'Item one', onSelect: jest.fn() }],
  });

  test('a labeled group has a header row', () => {
    render(<SidebarListPanel {...baseProps} groups={[group('Today')]} />);
    expect(screen.getByTestId('group-header')).toHaveTextContent('Today');
  });

  test('an unlabeled group has no empty header row above its items', () => {
    render(<SidebarListPanel {...baseProps} groups={[group('')]} />);
    expect(screen.queryByTestId('group-header')).not.toBeInTheDocument();
    expect(screen.getByText('Item one')).toBeInTheDocument();
  });
});

describe('SidebarListPanel nested groups', () => {
  const item = (id: string, label: string): SidebarListItem => ({
    id,
    label,
    onSelect: jest.fn(),
  });

  const projectGroups = (
    overrides: Partial<SidebarListGroup> = {}
  ): SidebarListGroup[] => [
    {
      id: 'projects',
      label: 'Projects',
      groups: [
        {
          id: 'p1',
          label: 'Project One',
          collapsible: true,
          icon: <span data-testid="folder-icon">f</span>,
          testId: 'project-row',
          groups: [
            {
              id: 'p1-pinned',
              label: 'Pinned',
              items: [item('a', 'Pinned conv')],
            },
            {
              id: 'p1-recent',
              label: 'Recent',
              items: [item('b', 'Recent conv')],
            },
          ],
          ...overrides,
        },
      ],
    },
    { id: 'pinned', label: 'Pinned', items: [item('c', 'Global pinned conv')] },
  ];

  test('renders nested subsections and items when expanded by default', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={projectGroups({ defaultExpanded: true })}
      />
    );

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Project One')).toBeInTheDocument();
    expect(screen.getByText('Pinned conv')).toBeInTheDocument();
    expect(screen.getByText('Recent conv')).toBeInTheDocument();
    expect(screen.getByText('Global pinned conv')).toBeInTheDocument();
    expect(screen.getByTestId('project-row')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  test('collapsible group starts collapsed and toggles on click', async () => {
    const onToggle = jest.fn();
    render(
      <SidebarListPanel {...baseProps} groups={projectGroups({ onToggle })} />
    );

    const row = screen.getByTestId('project-row');
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('folder-icon')).toBeInTheDocument();
    expect(screen.queryByText('Pinned conv')).not.toBeInTheDocument();

    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Pinned conv')).toBeInTheDocument();
    expect(onToggle).toHaveBeenLastCalledWith(true);

    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Pinned conv')).not.toBeInTheDocument();
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  test('expanding a collapsible group scrolls its header into view; re-collapsing does not', async () => {
    render(<SidebarListPanel {...baseProps} groups={projectGroups()} />);

    const row = screen.getByTestId('project-row');
    const scrollIntoView = row.scrollIntoView as jest.Mock;
    expect(scrollIntoView).not.toHaveBeenCalled();

    await userEvent.click(row);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    await userEvent.click(row);
    // Collapsing doesn't need the scroll-to-top treatment — there's nothing
    // newly revealed below the header to bring into view
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  test('a group that mounts already expanded (defaultExpanded) does not scroll on mount', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={projectGroups({ defaultExpanded: true })}
      />
    );

    const row = screen.getByTestId('project-row');
    expect(row.scrollIntoView).not.toHaveBeenCalled();
  });

  test('top-level section headings are sticky; nested subsection headings are not', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'projects',
            label: 'Projects',
            testId: 'top-heading',
            groups: [
              {
                id: 'p1',
                label: 'Project One',
                collapsible: true,
                defaultExpanded: true,
                groups: [
                  {
                    id: 'p1-pinned',
                    label: 'Pinned',
                    items: [item('a', 'Pinned conv')],
                    testId: 'nested-heading',
                  },
                ],
              },
            ],
          },
        ]}
        fixedGroups={[
          {
            id: 'fx',
            label: 'Fixed',
            items: [item('f', 'Fixed conv')],
            testId: 'fixed-heading',
          },
        ]}
      />
    );

    expect(screen.getByTestId('top-heading').className).toContain(
      'stickyHeader'
    );
    expect(screen.getByTestId('fixed-heading').className).toContain(
      'stickyHeader'
    );
    expect(screen.getByTestId('nested-heading').className).not.toContain(
      'stickyHeader'
    );
  });

  test('onEndReached fires when the end sentinel intersects, and cleans up', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const observe = jest.fn();
    const disconnect = jest.fn();
    const RealIO = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = jest.fn();
    } as unknown as typeof IntersectionObserver;

    const onEndReached = jest.fn();
    try {
      const { unmount } = render(
        <SidebarListPanel
          {...baseProps}
          groups={[{ id: 'g', label: 'Recents', items: [item('a', 'One')] }]}
          onEndReached={onEndReached}
          testIds={{ endSentinel: 'end-sentinel' }}
        />
      );

      expect(screen.getByTestId('end-sentinel')).toBeInTheDocument();
      expect(observe).toHaveBeenCalled();

      act(() => {
        callbacks[callbacks.length - 1](
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });
      expect(onEndReached).toHaveBeenCalledTimes(1);

      act(() => {
        callbacks[callbacks.length - 1](
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });
      expect(onEndReached).toHaveBeenCalledTimes(1);

      unmount();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      window.IntersectionObserver = RealIO;
    }
  });

  test('a hugging list pages off the column it scrolls in', () => {
    const roots: (Element | Document | null | undefined)[] = [];
    const callbacks: IntersectionObserverCallback[] = [];
    const RealIO = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(
        cb: IntersectionObserverCallback,
        opts?: IntersectionObserverInit
      ) {
        callbacks.push(cb);
        roots.push(opts?.root);
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;

    const onEndReached = jest.fn();
    try {
      render(
        <div data-testid="column" style={{ overflowY: 'auto' }}>
          <SidebarListPanel
            hug
            groups={[
              {
                id: 'g',
                label: 'Recents',
                items: [{ id: 'a', label: 'A', onSelect: jest.fn() }],
              },
            ]}
            isLoading={false}
            hasError={false}
            errorText="err"
            emptyText="empty"
            onEndReached={onEndReached}
            testIds={{ list: 'list' }}
          />
        </div>
      );
      expect(screen.getByTestId('list')).not.toHaveClass('scrollArea');
      expect(roots[roots.length - 1]).toBe(screen.getByTestId('column'));
      act(() => {
        callbacks[callbacks.length - 1](
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });
      expect(onEndReached).toHaveBeenCalledTimes(1);
    } finally {
      window.IntersectionObserver = RealIO;
    }
  });

  test('without onEndReached no sentinel renders', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[{ id: 'g', label: 'Recents', items: [item('a', 'One')] }]}
        testIds={{ endSentinel: 'end-sentinel' }}
      />
    );
    expect(screen.queryByTestId('end-sentinel')).not.toBeInTheDocument();
  });

  test('fixed groups render outside the scrollable list, before it', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        fixedGroups={[
          { id: 'pinned', label: 'Pinned', items: [item('p1', 'Pinned conv')] },
        ]}
        groups={[
          { id: 'recent', label: 'Recent', items: [item('r1', 'Recent conv')] },
        ]}
        testIds={{ list: 'scroll-list' }}
      />
    );

    const list = screen.getByTestId('scroll-list');
    expect(within(list).queryByText('Pinned conv')).not.toBeInTheDocument();
    expect(within(list).getByText('Recent conv')).toBeInTheDocument();
    const pinned = screen.getByText('Pinned conv');
    expect(
      pinned.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  test('fixed groups alone count as content, not the empty state', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[]}
        fixedGroups={[
          { id: 'pinned', label: 'Pinned', items: [item('p1', 'Pinned conv')] },
        ]}
        testIds={{ empty: 'empty-state' }}
      />
    );

    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    expect(screen.getByText('Pinned conv')).toBeInTheDocument();
  });

  test('collapsible group with no content renders no chevron and does not toggle', async () => {
    const onToggle = jest.fn();
    render(
      <SidebarListPanel
        {...baseProps}
        groups={projectGroups({ groups: [], onToggle })}
      />
    );

    const row = screen.getByTestId('project-row');
    expect(row.querySelector('svg')).toBeNull();
    expect(row).not.toHaveAttribute('aria-expanded');

    await userEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
    expect(row).not.toHaveAttribute('aria-expanded');
  });

  test('collapsible row actions render as siblings and do not toggle expansion', async () => {
    const onNewConversation = jest.fn();
    render(
      <SidebarListPanel
        {...baseProps}
        groups={projectGroups({
          actions: [
            {
              icon: <span>m</span>,
              label: 'New conversation',
              onClick: onNewConversation,
              revealOnHover: true,
              testId: 'project-new-conv-btn',
            },
          ],
        })}
      />
    );

    const row = screen.getByTestId('project-row');
    const btn = screen.getByTestId('project-new-conv-btn');
    expect(btn).toHaveAttribute('aria-label', 'New conversation');
    expect(btn).not.toHaveAttribute('title');
    expect(btn.className).toContain('hoverReveal');
    fireEvent.mouseEnter(btn.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('New conversation');
    fireEvent.mouseLeave(btn.parentElement!);

    await userEvent.click(btn);
    expect(onNewConversation).toHaveBeenCalledTimes(1);
    // The action lives beside the header button, not inside it — clicking
    // it must not expand the row
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Pinned conv')).not.toBeInTheDocument();

    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
  });

  test('a collapsible row counts as content, not the empty state', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'projects',
            label: 'Projects',
            groups: [{ id: 'p1', label: 'Empty project', collapsible: true }],
          },
        ]}
      />
    );

    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.getByText('Empty project')).toBeInTheDocument();
  });

  test('collapsible top-level section keeps the uppercase sticky-header look and toggles on click', async () => {
    const onToggle = jest.fn();
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'recent',
            label: 'Recents',
            collapsible: true,
            defaultExpanded: true,
            onToggle,
            testId: 'recents-heading',
            items: [item('r1', 'Recent conv')],
          },
        ]}
      />
    );

    const header = screen.getByTestId('recents-heading');
    // Sticky positioning lives on the wrapping row (so an overlaid action
    // button stays pinned alongside the label), not the header button itself
    expect(header.parentElement?.className).toContain('stickyHeader');
    expect(header.className).toContain('groupHeader');
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Recent conv')).toBeInTheDocument();

    await userEvent.click(header);
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Recent conv')).not.toBeInTheDocument();

    await userEvent.click(header);
    expect(onToggle).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Recent conv')).toBeInTheDocument();
  });

  test('collapsible top-level section header actions render as siblings and do not toggle expansion', async () => {
    const onNew = jest.fn();
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'projects',
            label: 'Projects',
            collapsible: true,
            defaultExpanded: true,
            testId: 'projects-heading',
            actions: [
              {
                icon: <span>+</span>,
                label: 'New project',
                onClick: onNew,
                testId: 'new-project-btn',
              },
            ],
            items: [item('p1', 'A project')],
          },
        ]}
      />
    );

    const header = screen.getByTestId('projects-heading');
    const btn = screen.getByTestId('new-project-btn');
    await userEvent.click(btn);
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  test('static group header renders its action buttons', async () => {
    const onNew = jest.fn();
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'projects',
            label: 'Projects',
            actions: [
              {
                icon: <span>+</span>,
                label: 'New project',
                onClick: onNew,
                testId: 'new-project-btn',
              },
            ],
            groups: [{ id: 'p1', label: 'Project One', collapsible: true }],
          },
        ]}
      />
    );

    const btn = screen.getByTestId('new-project-btn');
    expect(btn).toHaveAttribute('aria-label', 'New project');
    fireEvent.mouseEnter(btn.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('New project');
    fireEvent.mouseLeave(btn.parentElement!);
    await userEvent.click(btn);
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  test('a group with only header actions still counts as content', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[
          {
            id: 'projects',
            label: 'Projects',
            actions: [
              {
                icon: <span>+</span>,
                label: 'New project',
                onClick: jest.fn(),
              },
            ],
          },
        ]}
      />
    );

    expect(screen.queryByText('empty')).not.toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByLabelText('New project')).toBeInTheDocument();
  });

  test('groups holding only empty item lists still show the empty state', () => {
    render(
      <SidebarListPanel
        {...baseProps}
        groups={[{ id: 'g1', label: 'Today', items: [] }]}
      />
    );

    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});

describe('SidebarListPanel nested item children', () => {
  test('renders child items nested under their parent, recursively, and fires their handlers', async () => {
    const onSelectChild = jest.fn();
    const groups: SidebarListGroup[] = [
      {
        id: 'recent',
        label: 'Recents',
        items: [
          {
            id: 'parent',
            label: 'Parent conversation',
            onSelect: jest.fn(),
            testId: 'row-parent',
            children: [
              {
                id: 'fork',
                label: 'Forked Parent conversation',
                onSelect: onSelectChild,
                testId: 'row-fork',
                children: [
                  {
                    id: 'fork2',
                    label: 'Forked Forked Parent conversation',
                    onSelect: jest.fn(),
                    testId: 'row-fork2',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    // Child renders inside the parent's list item; grandchild inside the child's
    const fork = screen.getByTestId('row-fork');
    const parentLi = screen.getByTestId('row-parent').closest('li')!;
    expect(parentLi.contains(fork)).toBe(true);
    const forkLi = fork.closest('li')!;
    expect(forkLi.contains(screen.getByTestId('row-fork2'))).toBe(true);

    await userEvent.click(fork);
    expect(onSelectChild).toHaveBeenCalled();
  });

  test('child rows keep their own trailing actions', async () => {
    const onArchive = jest.fn();
    const groups: SidebarListGroup[] = [
      {
        id: 'recent',
        label: 'Recents',
        items: [
          {
            id: 'parent',
            label: 'Parent',
            onSelect: jest.fn(),
            children: [
              {
                id: 'fork',
                label: 'Forked Parent',
                onSelect: jest.fn(),
                actions: [
                  {
                    icon: <span>a</span>,
                    label: 'Archive',
                    onClick: onArchive,
                    testId: 'fork-archive',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];
    render(<SidebarListPanel {...baseProps} groups={groups} />);

    await userEvent.click(screen.getByTestId('fork-archive'));
    expect(onArchive).toHaveBeenCalled();
  });
});

describe('SidebarListPanel menu variant', () => {
  const originalMatchMedia = window.matchMedia;
  const originalPointerEvent = window.PointerEvent;

  // jsdom has no PointerEvent, so fireEvent would drop clientX and clientY
  beforeAll(() => {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  });

  afterAll(() => {
    window.PointerEvent = originalPointerEvent;
  });

  const useTouchDevice = (isTouch: boolean) => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: isTouch });
  };

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const archive = jest.fn();
  const select = jest.fn();

  const renderMenuPanel = () =>
    render(
      <SidebarListPanel
        {...baseProps}
        title={undefined}
        touch
        groups={[
          {
            id: 'g1',
            label: 'Recents',
            items: ['one', 'two'].map(id => ({
              id,
              label: `Item ${id}`,
              onSelect: select,
              testId: `row-${id}`,
              actions: [
                {
                  icon: <span />,
                  label: `Archive ${id}`,
                  onClick: archive,
                  tone: 'muted' as const,
                  testId: `archive-${id}`,
                },
              ],
            })),
          },
        ]}
      />
    );

  const swipe = (row: HTMLElement, fromX: number, toX: number, toY = 0) => {
    const init = { bubbles: true, clientY: 100 };
    fireEvent.pointerDown(row, { ...init, clientX: fromX });
    fireEvent.pointerMove(row, { ...init, clientX: toX, clientY: 100 + toY });
    fireEvent.pointerUp(row, { ...init, clientX: toX });
    fireEvent.click(row);
  };

  const trayWidth = (id: string, side: 'leading' | 'trailing') =>
    (
      screen
        .getByTestId(`row-${id}`)
        .closest('[class*="swipeRow"]')!
        .querySelector(`[data-swipe-tray="${side}"]`) as HTMLElement
    ).style.width;

  beforeEach(() => {
    archive.mockClear();
    select.mockClear();
  });

  it('keeps inline buttons on a device with hover', () => {
    useTouchDevice(false);
    renderMenuPanel();
    const row = screen.getByTestId('row-one');
    expect(row.closest('[class*="swipeRow"]')).toBeNull();
    expect(screen.getByTestId('archive-one')).toBeInTheDocument();
  });

  it('opens a row on a left swipe without selecting it', () => {
    useTouchDevice(true);
    renderMenuPanel();
    expect(trayWidth('one', 'trailing')).toBe('0px');
    swipe(screen.getByTestId('row-one'), 200, 120);
    expect(trayWidth('one', 'trailing')).toBe('56px');
    expect(select).not.toHaveBeenCalled();
  });

  it('stays closed when the swipe is too short, mostly vertical, or toward a side without actions', () => {
    useTouchDevice(true);
    renderMenuPanel();
    swipe(screen.getByTestId('row-one'), 200, 185);
    expect(trayWidth('one', 'trailing')).toBe('0px');
    swipe(screen.getByTestId('row-two'), 200, 150, 90);
    expect(trayWidth('two', 'trailing')).toBe('0px');
    // No leading actions: a right swipe has nothing to show
    swipe(screen.getByTestId('row-two'), 120, 220);
    expect(trayWidth('two', 'trailing')).toBe('0px');
  });

  it('keeps one row open at a time and closes on an outside press', () => {
    useTouchDevice(true);
    renderMenuPanel();
    swipe(screen.getByTestId('row-one'), 200, 120);
    swipe(screen.getByTestId('row-two'), 200, 120);
    expect(trayWidth('one', 'trailing')).toBe('0px');
    expect(trayWidth('two', 'trailing')).toBe('56px');

    fireEvent.pointerDown(document.body);
    expect(trayWidth('two', 'trailing')).toBe('0px');
  });

  it('closes an open row on tap instead of selecting it', () => {
    useTouchDevice(true);
    renderMenuPanel();
    const row = screen.getByTestId('row-one');
    swipe(row, 200, 120);
    fireEvent.pointerDown(row, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(row, { clientX: 100, clientY: 100 });
    fireEvent.click(row);
    expect(select).not.toHaveBeenCalled();
    expect(trayWidth('one', 'trailing')).toBe('0px');

    fireEvent.click(row);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('runs a tray action and closes, and reaches it by keyboard focus', () => {
    useTouchDevice(true);
    renderMenuPanel();
    const action = screen.getByTestId('archive-one');
    fireEvent.focus(action);
    expect(trayWidth('one', 'trailing')).toBe('56px');

    fireEvent.click(action);
    expect(archive).toHaveBeenCalledTimes(1);
    expect(trayWidth('one', 'trailing')).toBe('0px');
  });

  describe('menu actions', () => {
    const move = jest.fn();
    const pin = jest.fn();
    const remove = jest.fn();
    const rename = jest.fn();
    const newChat = jest.fn();

    const menuActions = (id: string) => [
      {
        icon: <span />,
        label: 'Move to project',
        onClick: move,
        testId: `move-${id}`,
      },
      {
        icon: <span />,
        label: 'Pin',
        onClick: pin,
        tone: 'primary' as const,
        swipe: 'leading' as const,
        testId: `pin-${id}`,
      },
      {
        icon: <span />,
        label: 'Delete',
        onClick: remove,
        tone: 'muted' as const,
        testId: `delete-${id}`,
      },
    ];

    const renderChats = (props: Record<string, unknown> = {}) =>
      render(
        <SidebarListPanel
          {...baseProps}
          title={undefined}
          variant="history"
          touch
          moreActionsLabel="More actions"
          data-testid="panel"
          groups={[
            {
              id: 'wrapper',
              label: '',
              groups: [
                {
                  id: 'project-p1',
                  label: 'Startup',
                  collapsible: true,
                  testId: 'project-p1',
                  actions: [
                    {
                      icon: <span />,
                      label: 'New conversation',
                      onClick: newChat,
                      testId: 'new-chat-p1',
                    },
                  ],
                  menuActions: [
                    {
                      icon: <span />,
                      label: 'Rename project',
                      onClick: rename,
                      testId: 'rename-p1',
                    },
                    {
                      icon: <span />,
                      label: 'Delete project',
                      onClick: remove,
                      tone: 'muted' as const,
                      testId: 'delete-p1',
                    },
                  ],
                  items: [{ id: 'inner', label: 'Inside', onSelect: select }],
                },
              ],
            },
            {
              id: 'recents',
              label: 'Recents',
              items: ['one', 'two'].map(id => ({
                id,
                label: `Chat ${id}`,
                onSelect: select,
                testId: `row-${id}`,
                menuActions: menuActions(id),
              })),
            },
          ]}
          {...props}
        />
      );

    beforeEach(() => {
      [move, pin, remove, rename, newChat].forEach(fn => fn.mockClear());
    });

    it('puts them behind one More actions button on a device with hover', () => {
      useTouchDevice(false);
      renderChats();
      expect(screen.getByTestId('panel')).toHaveClass('history', 'touch');
      expect(screen.queryByTestId('move-one')).not.toBeInTheDocument();

      const more = screen.getByTestId('row-one-more');
      expect(more).toHaveAccessibleName('More actions');
      expect(more).toHaveClass('actionBtn', 'moreBtn', 'hoverReveal');
      fireEvent.click(more);
      expect(screen.getByTestId('row-one-menu')).toBeInTheDocument();
      expect(
        screen.getAllByRole('menuitem').map(item => item.textContent)
      ).toEqual(['Move to project', 'Pin', 'Delete']);

      fireEvent.click(screen.getByTestId('pin-one'));
      expect(pin).toHaveBeenCalledTimes(1);
      expect(select).not.toHaveBeenCalled();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('a collapsible row keeps its inline buttons and adds the More actions button; neither toggles it', () => {
      useTouchDevice(false);
      renderChats();
      const row = screen.getByTestId('project-p1');
      fireEvent.click(screen.getByTestId('new-chat-p1'));
      expect(newChat).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByTestId('project-p1-more'));
      fireEvent.click(screen.getByTestId('rename-p1'));
      expect(rename).toHaveBeenCalledTimes(1);
      expect(row).toHaveAttribute('aria-expanded', 'false');
      expect(row.closest('[class*="collapsibleHeaderRow"]')).toHaveClass(
        'hasActions',
        'multiAction'
      );
    });

    it('the label of the More actions button can be set', () => {
      useTouchDevice(false);
      renderChats({ moreActionsLabel: 'Row actions' });
      expect(screen.getByTestId('row-two-more')).toHaveAccessibleName(
        'Row actions'
      );
    });

    it('on touch rows they move into the trays: Pin swipes right, the rest swipe left', () => {
      useTouchDevice(true);
      renderChats();
      expect(screen.queryByTestId('row-one-more')).not.toBeInTheDocument();

      swipe(screen.getByTestId('row-one'), 120, 220);
      expect(trayWidth('one', 'leading')).toBe('56px');
      expect(trayWidth('one', 'trailing')).toBe('0px');
      fireEvent.click(screen.getByTestId('pin-one'));
      expect(pin).toHaveBeenCalledTimes(1);
      expect(trayWidth('one', 'leading')).toBe('0px');

      swipe(screen.getByTestId('row-one'), 220, 60);
      expect(trayWidth('one', 'trailing')).toBe('112px');
      expect(trayWidth('one', 'leading')).toBe('0px');
      fireEvent.click(screen.getByTestId('delete-one'));
      expect(remove).toHaveBeenCalledTimes(1);
      expect(select).not.toHaveBeenCalled();
    });

    it('a right swipe that starts at the screen edge is left to the edge swipe', () => {
      useTouchDevice(true);
      renderChats();
      swipe(screen.getByTestId('row-two'), 10, 140);
      expect(trayWidth('two', 'leading')).toBe('0px');
    });

    it('an open row swipes straight across to the other tray', () => {
      useTouchDevice(true);
      renderChats();
      swipe(screen.getByTestId('row-two'), 120, 220);
      expect(trayWidth('two', 'leading')).toBe('56px');
      swipe(screen.getByTestId('row-two'), 220, 40);
      expect(trayWidth('two', 'trailing')).toBe('112px');
      expect(trayWidth('two', 'leading')).toBe('0px');
    });

    it('a touch project row keeps its plus inline and swipes left for its menu actions', () => {
      useTouchDevice(true);
      renderChats();
      const plus = screen.getByTestId('new-chat-p1');
      expect(plus.closest('[class*="swipeContent"]')).not.toBeNull();
      const header = screen.getByTestId('project-p1');
      const tray = header
        .closest('[class*="swipeRow"]')!
        .querySelector('[data-swipe-tray="trailing"]') as HTMLElement;
      expect(tray.style.width).toBe('0px');

      swipe(header, 220, 100);
      expect(tray.style.width).toBe('112px');
      expect(header).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(screen.getByTestId('rename-p1'));
      expect(rename).toHaveBeenCalledTimes(1);

      fireEvent.click(plus);
      expect(newChat).toHaveBeenCalledTimes(1);
    });
  });

  it('renders an icon and extra content in a static header', () => {
    useTouchDevice(false);
    render(
      <SidebarListPanel
        {...baseProps}
        title={undefined}
        touch
        groups={[
          {
            id: 'g1',
            label: 'Agents',
            icon: <span data-testid="header-icon" />,
            headerContent: <button>All agents</button>,
            items: [{ id: 'a', label: 'Agent', onSelect: jest.fn() }],
          },
        ]}
      />
    );
    expect(screen.getByTestId('header-icon')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'All agents' })
    ).toBeInTheDocument();
  });
});
