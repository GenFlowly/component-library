import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TreeMenu, { TreeMenuItem } from './TreeMenu';
import { ICONS } from '../../../constants/icons';

const items: TreeMenuItem[] = [
  {
    key: 'profile',
    label: 'Profile',
    icon: ICONS.USER_CIRCLE,
    path: '/settings/profile',
    children: [
      { key: 'account', label: 'Account', path: '/settings/profile/account' },
      { key: 'privacy', label: 'Privacy', path: '/settings/profile/privacy' },
    ],
  },
  {
    key: 'usage',
    label: 'Cost and Usage',
    icon: ICONS.TOTAL_TOKENS,
    path: '/settings/usage',
    children: [
      { key: 'llm', label: 'LLM Models', path: '/settings/usage/llm' },
      {
        key: 'embedding',
        label: 'Embedding Models',
        path: '/settings/usage/embedding',
      },
    ],
  },
  {
    key: 'developer',
    label: 'Developer',
    icon: ICONS.DOCUMENT,
    path: '/settings/developer',
  },
];

const meta: Meta<typeof TreeMenu> = {
  title: 'Components/Settings/TreeMenu',
  component: TreeMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A grouped menu: sections with pages, plus single-page sections. The section holding \`activePath\` starts open and its page is marked \`aria-current\`.

- \`variant="sidebar"\`: opening a section goes to its first page (desktop).
- \`variant="menu"\`: sections open in place, for the phone menu.
- \`query\` turns it into a flat list of matching pages (a section's name matches all its pages); \`extraSearchHits\` adds entries that live outside the tree, such as Support.`,
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof TreeMenu>;

const Demo = ({
  variant,
  query,
}: {
  variant: 'sidebar' | 'menu';
  query?: string;
}) => {
  const [path, setPath] = useState('/settings/profile/account');
  return (
    <div style={{ width: variant === 'menu' ? 360 : 240 }}>
      <TreeMenu
        items={items}
        activePath={path}
        onNavigate={setPath}
        variant={variant}
        query={query}
        noResultsLabel="No results"
        aria-label="Settings"
      />
    </div>
  );
};

export const Sidebar: Story = { render: () => <Demo variant="sidebar" /> };
export const PhoneMenu: Story = { render: () => <Demo variant="menu" /> };
export const Searching: Story = {
  render: () => <Demo variant="sidebar" query="usage" />,
};
