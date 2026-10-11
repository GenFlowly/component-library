import React from 'react';
import { render, screen } from '@testing-library/react';
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
