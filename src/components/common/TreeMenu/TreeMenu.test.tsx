import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TreeMenu, { TreeMenuItem } from './TreeMenu';

const items: TreeMenuItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: 'user.svg',
    path: '/settings/profile',
    children: [
      { key: 'account', label: 'Account', path: '/settings/profile/account' },
      { key: 'privacy', label: 'Privacy', path: '/settings/profile/privacy' },
    ],
  },
  {
    key: 'byok',
    label: 'BYOK Settings',
    icon: 'models.svg',
    path: '/settings/byok',
    children: [
      {
        key: 'llm-keys',
        label: 'LLM API Keys',
        path: '/settings/byok/llm-keys',
      },
      {
        key: 'vector-db',
        label: 'Vector DB Connection',
        path: '/settings/byok/vector-db',
      },
    ],
  },
  {
    key: 'developer',
    label: 'Developer',
    icon: 'edit.svg',
    path: '/settings/developer',
  },
];

const setupMenu = (
  props: Partial<React.ComponentProps<typeof TreeMenu>> = {}
) => {
  const onNavigate = jest.fn();
  render(
    <TreeMenu
      items={items}
      activePath="/settings/byok/vector-db"
      onNavigate={onNavigate}
      aria-label="Settings"
      testIdPrefix="settings"
      noResultsLabel="No results"
      {...props}
    />
  );
  return onNavigate;
};

describe('TreeMenu', () => {
  test('expands the section holding the current page and marks the page', () => {
    setupMenu();
    expect(
      screen.getByRole('button', { name: 'BYOK Settings' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Profile' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(
      screen.getByRole('button', { name: 'Vector DB Connection' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('button', { name: 'Account' })
    ).not.toBeInTheDocument();
  });

  test('opening another section from the sidebar opens its first page', () => {
    const onNavigate = setupMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(onNavigate).toHaveBeenCalledWith('/settings/profile/account');
    expect(screen.getByRole('button', { name: 'Privacy' })).toBeInTheDocument();
  });

  test('in the phone menu opening a section only expands it', () => {
    const onNavigate = setupMenu({ variant: 'menu' });
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Account' })).toBeInTheDocument();
  });

  test('the current section can be collapsed', () => {
    setupMenu();
    fireEvent.click(screen.getByRole('button', { name: 'BYOK Settings' }));
    expect(
      screen.queryByRole('button', { name: 'LLM API Keys' })
    ).not.toBeInTheDocument();
  });

  test('search flattens matches, by page or section label, plus extra links', () => {
    const onNavigate = setupMenu({
      query: 'byok',
      extraSearchHits: [
        {
          key: 'support',
          label: 'Support',
          icon: 'chat.svg',
          path: '/support',
        },
      ],
    });
    expect(
      screen.getByTestId('settings-search-hit-byok-llm-keys')
    ).toHaveTextContent('LLM API Keys');
    expect(
      screen.getByTestId('settings-search-hit-byok-vector-db')
    ).toBeInTheDocument();
    expect(screen.queryByText('Support')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-search-hit-byok-llm-keys'));
    expect(onNavigate).toHaveBeenCalledWith('/settings/byok/llm-keys');
  });

  test('a search with no match says so', () => {
    setupMenu({ query: 'zzz' });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
