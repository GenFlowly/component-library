import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarWidget from './SidebarWidget';
import type { SidebarWidgetList } from './SidebarWidget';

const list = (onSelect = jest.fn()): SidebarWidgetList => ({
  groups: [
    {
      id: 'recent',
      label: 'Recents',
      items: [{ id: 'one', label: 'Trip ideas', onSelect, testId: 'row-one' }],
    },
  ],
  isLoading: false,
  hasError: false,
  errorText: 'Failed',
  emptyText: 'Empty',
  'data-testid': 'panel',
});

describe('SidebarWidget', () => {
  test('without a title it is a bare card with the given class and test id', () => {
    render(
      <SidebarWidget className="extra" data-testid="card">
        <span>Content</span>
      </SidebarWidget>
    );
    expect(screen.getByTestId('card')).toHaveClass('widget', 'extra');
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('with a title, renders a header with the icon and actions', () => {
    render(
      <SidebarWidget
        title="Models"
        icon="models.svg"
        actions={<button>Refresh</button>}
        bodyClassName="body-extra"
        data-testid="card"
      >
        <span>Body</span>
      </SidebarWidget>
    );
    expect(screen.getByRole('heading', { name: 'Models' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('Body').parentElement).toHaveClass(
      'body',
      'body-extra'
    );
    expect(screen.getByTestId('card').tagName).toBe('SECTION');
    // Not collapsible: the title is plain text, not a toggle
    expect(
      screen.queryByRole('button', { name: 'Models' })
    ).not.toBeInTheDocument();
  });

  test('history: a titled card listing rows on its material', () => {
    const onSelect = jest.fn();
    render(
      <SidebarWidget variant="history" title="Chats" list={list(onSelect)} />
    );
    expect(screen.getByRole('heading', { name: 'Chats' })).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toHaveClass('history');
    fireEvent.click(screen.getByTestId('row-one'));
    expect(onSelect).toHaveBeenCalled();
  });

  test('directory: the title is the list heading, on the sidebar background', () => {
    render(
      <SidebarWidget
        variant="directory"
        title="Projects"
        list={list()}
        data-testid="card"
      />
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByTestId('panel')).toHaveTextContent('Projects');
    expect(screen.getByTestId('panel')).not.toHaveClass('history');
    expect(screen.getByTestId('card')).toHaveClass('widget');
  });

  test('touch reaches the list', () => {
    render(<SidebarWidget variant="directory" touch list={list()} />);
    expect(screen.getByTestId('panel')).toHaveClass('touch');
  });

  test('menu: heading, search, navigation and footer', () => {
    const onNavigate = jest.fn();
    render(
      <SidebarWidget
        variant="menu"
        title="Settings"
        fill
        data-testid="card"
        search={<input aria-label="Search settings" />}
        footer={<button type="button">Log out</button>}
        menu={{
          items: [
            {
              key: 'developer',
              label: 'Developer',
              icon: 'doc.svg',
              path: '/settings/developer',
            },
          ],
          activePath: '/settings/profile',
          onNavigate,
          'aria-label': 'Settings',
        }}
      />
    );
    expect(screen.getByTestId('card')).toHaveClass('widget', 'menu', 'fill');
    expect(
      screen.getByRole('heading', { name: 'Settings' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Search settings' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Developer' }));
    expect(onNavigate).toHaveBeenCalledWith('/settings/developer');
  });

  test('a collapsible card collapses to its header from the title, and says so', () => {
    const onCollapsedChange = jest.fn();
    render(
      <SidebarWidget
        title="Projects"
        icon="folder.svg"
        collapsible
        collapseLabel="Collapse Projects"
        expandLabel="Expand Projects"
        onCollapsedChange={onCollapsedChange}
        actions={<button>New project</button>}
        toggleTestId="toggle"
        data-testid="card"
      >
        <span>Rows</span>
      </SidebarWidget>
    );

    const heading = screen.getByRole('heading', { name: 'Projects' });
    const toggle = within(heading).getByRole('button', { name: 'Projects' });
    expect(toggle).toBe(screen.getByTestId('toggle'));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const body = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(body).toContainElement(screen.getByText('Rows'));
    expect(body).toBeVisible();

    fireEvent.mouseEnter(toggle.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Collapse Projects');
    fireEvent.mouseLeave(toggle.parentElement!);

    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).not.toBeVisible();
    expect(screen.getByTestId('card')).toHaveClass('collapsed');
    // The header's own actions stay reachable while collapsed
    expect(screen.getByRole('button', { name: 'New project' })).toBeVisible();

    fireEvent.mouseEnter(toggle.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Expand Projects');
    fireEvent.mouseLeave(toggle.parentElement!);

    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(body).toBeVisible();
  });

  test('a controlled card follows its collapsed prop', () => {
    const onCollapsedChange = jest.fn();
    const { rerender } = render(
      <SidebarWidget
        title="Chats"
        collapsible
        collapsed
        onCollapsedChange={onCollapsedChange}
      >
        <span>Rows</span>
      </SidebarWidget>
    );
    const toggle = screen.getByRole('button', { name: 'Chats' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <SidebarWidget
        title="Chats"
        collapsible
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
      >
        <span>Rows</span>
      </SidebarWidget>
    );
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('defaultCollapsed starts an uncontrolled card collapsed', () => {
    render(
      <SidebarWidget title="Chats" collapsible defaultCollapsed>
        <span>Rows</span>
      </SidebarWidget>
    );
    expect(screen.getByRole('button', { name: 'Chats' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByText('Rows')).not.toBeVisible();
  });

  test('touch marks the card for touch hit areas', () => {
    render(
      <SidebarWidget title="Chats" touch data-testid="card">
        <span>Rows</span>
      </SidebarWidget>
    );
    expect(screen.getByTestId('card')).toHaveClass('touch');
  });
});
