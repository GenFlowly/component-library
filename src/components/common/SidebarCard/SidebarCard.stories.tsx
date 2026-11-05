import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarCard from './SidebarCard';

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
