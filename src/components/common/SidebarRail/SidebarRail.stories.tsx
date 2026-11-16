import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarRail from './SidebarRail';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof SidebarRail> = {
  title: 'Components/SidebarRail',
  component: SidebarRail,
};

export default meta;

export const LeftAndRight: StoryObj<typeof SidebarRail> = {
  render: () => (
    <div style={{ display: 'flex', gap: 200, height: 420, padding: 16 }}>
      <SidebarRail
        side="left"
        items={[
          { id: 'new', icon: ICONS.MENU, label: 'New Chat', onClick: () => {} },
          {
            id: 'search',
            icon: ICONS.SEARCH,
            label: 'Search chats',
            onClick: () => {},
          },
        ]}
        tabs={[
          { id: 'chats', label: 'Chats', onClick: () => {}, active: true },
          { id: 'projects', label: 'Projects', onClick: () => {} },
        ]}
        expandLabel="Expand Sidebar"
        onExpand={() => {}}
      />
      <SidebarRail
        side="right"
        items={[
          { id: 'copy', icon: ICONS.COPY, label: 'Models', onClick: () => {} },
          { id: 'brain', icon: ICONS.BRAIN, label: 'Agent', onClick: () => {} },
        ]}
        expandLabel="Expand Sidebar"
        onExpand={() => {}}
      />
    </div>
  ),
};
