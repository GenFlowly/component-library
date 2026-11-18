import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarWidget from './SidebarWidget';
import type { TreeMenuItem } from '../TreeMenu/TreeMenu';
import type { SidebarListGroup } from '../SidebarListPanel/SidebarListPanel';
import IconButton from '../IconButton/IconButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof SidebarWidget> = {
  title: 'Components/SidebarWidget',
  component: SidebarWidget,
  parameters: {
    docs: {
      description: {
        component: `The one card every sidebar widget sits in. The variant decides its body:

- \`custom\`: content of its own design (the dock's Models, Agent and Tokens cards).
- \`history\`: conversations in groups, with row actions, swipe trays and paging.
- \`directory\`: scopes or categories to pick from (Memory, Agents).
- \`menu\`: sections with icons that expand to pages (Settings), with optional search and footer slots.

\`touch\` sizes any variant for the full-screen phone menu. Row shapes and states come from one table, \`styles/sidebar-row.scss\`.`,
      },
    },
  },
};

export default meta;

export const Bare: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <SidebarWidget>
      <div style={{ padding: 16 }}>Card content</div>
    </SidebarWidget>
  ),
};

export const WithHeader: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <div style={{ width: 240 }}>
      <SidebarWidget
        title="Models"
        icon={ICONS.BRAIN}
        actions={
          <IconButton
            icon={ICONS.REFRESH_ICON}
            label="Refresh Models"
            size="sm"
          />
        }
      >
        <div style={{ padding: 10 }}>Card body</div>
      </SidebarWidget>
    </div>
  ),
};

function CollapsibleDemo() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ width: 240 }}>
      <SidebarWidget
        title="Saved notes"
        icon={ICONS.DOCUMENT}
        collapsible
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        collapseLabel="Collapse Saved notes"
        expandLabel="Expand Saved notes"
        actions={<IconButton icon={ICONS.SEARCH} label="Search notes" />}
      >
        <div style={{ padding: 10 }}>Note rows</div>
      </SidebarWidget>
    </div>
  );
}

export const Collapsible: StoryObj<typeof SidebarWidget> = {
  render: () => <CollapsibleDemo />,
};

const groups: SidebarListGroup[] = [
  {
    id: 'recent',
    label: 'Recents',
    items: ['Trip ideas', 'Budget review', 'Release notes'].map(label => ({
      id: label,
      label,
      details: 'Nov 17, 2026',
      onSelect: () => undefined,
    })),
  },
];

export const History: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <div style={{ width: 240, height: 320, display: 'flex' }}>
      <SidebarWidget
        variant="history"
        title="Chats"
        icon={ICONS.DOCUMENT}
        list={{
          groups,
          isLoading: false,
          hasError: false,
          errorText: 'Failed to load',
          emptyText: 'No conversations yet',
        }}
      />
    </div>
  ),
};

export const Directory: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <div style={{ width: 240 }}>
      <SidebarWidget
        variant="directory"
        title="Projects"
        list={{
          groups: [
            {
              id: 'projects',
              label: '',
              items: ['Japan Trip', 'Bugs'].map((label, i) => ({
                id: label,
                label,
                isActive: i === 0,
                onSelect: () => undefined,
              })),
            },
          ],
          isLoading: false,
          hasError: false,
          errorText: '',
          emptyText: '',
        }}
      />
    </div>
  ),
};

const menuItems: TreeMenuItem[] = [
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
    key: 'developer',
    label: 'Developer',
    icon: ICONS.DOCUMENT,
    path: '/settings/developer',
  },
];

function MenuDemo({ touch = false }: { touch?: boolean }) {
  const [path, setPath] = useState('/settings/profile/account');
  return (
    <div style={{ width: touch ? 360 : 260, height: 360, display: 'flex' }}>
      <SidebarWidget
        variant="menu"
        title="Settings"
        touch={touch}
        fill
        menu={{
          items: menuItems,
          activePath: path,
          onNavigate: setPath,
          'aria-label': 'Settings',
        }}
      />
    </div>
  );
}

export const Menu: StoryObj<typeof SidebarWidget> = {
  render: () => <MenuDemo />,
};

export const MenuTouch: StoryObj<typeof SidebarWidget> = {
  render: () => <MenuDemo touch />,
};
