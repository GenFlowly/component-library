import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarCard from './SidebarCard';
import IconButton from '../IconButton/IconButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof SidebarCard> = {
  title: 'Components/SidebarCard',
  component: SidebarCard,
};

export default meta;

export const Default: StoryObj<typeof SidebarCard> = {
  render: () => (
    <SidebarCard>
      <div style={{ padding: 16 }}>Card content</div>
    </SidebarCard>
  ),
};

export const WithHeader: StoryObj<typeof SidebarCard> = {
  render: () => (
    <div style={{ width: 240 }}>
      <SidebarCard
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
      </SidebarCard>
    </div>
  ),
};
