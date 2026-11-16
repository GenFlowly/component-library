import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarRail from './SidebarRail';

describe('SidebarRail', () => {
  const setup = (side: 'left' | 'right' = 'left') => {
    const onNewChat = jest.fn();
    const onChats = jest.fn();
    const onExpand = jest.fn();
    render(
      <SidebarRail
        side={side}
        aria-label="Chats and projects"
        items={[
          {
            id: 'new',
            icon: 'compose.svg',
            label: 'New Chat',
            onClick: onNewChat,
            testId: 'rail-new',
          },
        ]}
        tabs={[
          {
            id: 'chats',
            label: 'Chats',
            onClick: onChats,
            active: true,
            testId: 'rail-chats',
          },
          { id: 'projects', label: 'Projects', onClick: jest.fn() },
        ]}
        expandLabel="Expand Sidebar"
        onExpand={onExpand}
        expandTestId="rail-expand"
        data-testid="rail"
      />
    );
    return { onNewChat, onChats, onExpand };
  };

  test('renders the items, tabs and expand chevron with their names', () => {
    setup();
    expect(
      screen.getByRole('complementary', { name: 'Chats and projects' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New Chat' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chats' })).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(
      screen.getByRole('button', { name: 'Projects' })
    ).not.toHaveAttribute('aria-current');
    expect(
      screen.getByRole('button', { name: 'Expand Sidebar' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  test('routes clicks to the matching callbacks', () => {
    const { onNewChat, onChats, onExpand } = setup();
    fireEvent.click(screen.getByTestId('rail-new'));
    fireEvent.click(screen.getByTestId('rail-chats'));
    fireEvent.click(screen.getByTestId('rail-expand'));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onChats).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  test('works without tabs, as the right-hand strip', () => {
    render(
      <SidebarRail
        side="right"
        items={[
          {
            id: 'models',
            icon: 'models.svg',
            label: 'Models',
            onClick: jest.fn(),
          },
        ]}
        expandLabel="Expand Sidebar"
        onExpand={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Models' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
