import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarListPanel, {
  SidebarListLoadMore,
  SidebarListGroup,
} from './SidebarListPanel';

const meta: Meta<typeof SidebarListPanel> = {
  title: 'Components/SidebarListPanel',
  component: SidebarListPanel,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ width: 280, height: 480, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarListPanel>;

const deleteIcon = (
  <span aria-hidden="true" style={{ fontSize: '0.9em' }}>
    &times;
  </span>
);

const groups: SidebarListGroup[] = [
  {
    id: 'today',
    label: 'Today',
    items: [
      {
        id: 'c1',
        label: 'Refactoring the auth middleware',
        details: '14:32',
        isActive: true,
        ariaCurrent: 'page',
        onSelect: () => console.log('select c1'),
        action: {
          icon: deleteIcon,
          label: 'Delete conversation',
          onClick: () => console.log('delete c1'),
        },
      },
      {
        id: 'c2',
        label: 'SQL query optimization tips',
        details: '09:10',
        onSelect: () => console.log('select c2'),
        action: {
          icon: deleteIcon,
          label: 'Delete conversation',
          onClick: () => console.log('delete c2'),
        },
      },
    ],
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    items: [
      {
        id: 'c3',
        label: 'Draft release notes for v2.4',
        details: '18:45',
        onSelect: () => console.log('select c3'),
      },
      {
        id: 'c4',
        label:
          'A very long conversation title that should truncate gracefully in the sidebar',
        details: '11:02',
        onSelect: () => console.log('select c4'),
      },
    ],
  },
  {
    id: 'last-week',
    label: 'Last week',
    items: [
      {
        id: 'c5',
        label: 'Kubernetes ingress debugging',
        details: 'Mon',
        onSelect: () => console.log('select c5'),
      },
      {
        id: 'c6',
        label: 'Marketing copy brainstorm',
        details: 'Sun',
        onSelect: () => console.log('select c6'),
      },
    ],
  },
];

export const Default: Story = {
  args: {
    title: 'History',
    groups,
    isLoading: false,
    hasError: false,
    errorText: 'Could not load conversations.',
    emptyText: 'No conversations yet.',
    listAriaLabel: 'Conversation history',
  },
};

export const WithLoadMore: Story = {
  args: {
    ...Default.args,
    footer: (
      <SidebarListLoadMore
        label="Load more"
        onClick={() => console.log('load more')}
      />
    ),
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    groups: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    ...Default.args,
    groups: [],
  },
};

export const ErrorState: Story = {
  args: {
    ...Default.args,
    groups: [],
    hasError: true,
  },
};
