import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarListPanel, { SidebarListGroup } from './SidebarListPanel';
import '@testing-library/jest-dom';

describe('SidebarListPanel actions', () => {
  const baseProps = {
    title: 'History',
    isLoading: false,
    hasError: false,
    errorText: 'error',
    emptyText: 'empty',
  };

  const makeGroups = (
    item: Partial<SidebarListGroup['items'][number]>
  ): SidebarListGroup[] => [
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
