import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarStack from './SidebarStack';
import SidebarWidget from '../SidebarWidget/SidebarWidget';

const meta: Meta<typeof SidebarStack> = {
  title: 'Components/SidebarStack',
  component: SidebarStack,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div
        style={{
          width: 280,
          height: 520,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarStack>;

const rows = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    label: `${prefix} ${i + 1}`,
    onSelect: () => {},
  }));

const list = (label: string, count: number) => ({
  groups: [{ id: label, label, items: rows(label, count) }],
  isLoading: false,
  hasError: false,
  errorText: 'Failed to load',
  emptyText: 'Nothing yet',
});

export const Default: Story = {
  args: {
    children: [
      <SidebarWidget
        key="p"
        variant="history"
        title="Projects"
        list={list('Project', 6)}
        collapsible
      />,
      <SidebarWidget
        key="c"
        variant="history"
        title="Chats"
        list={list('Chat', 30)}
        collapsible
      />,
    ],
  },
};
