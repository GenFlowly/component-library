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
    isLoading: false,
    hasError: false,
    errorText: 'Could not load conversations.',
    emptyText: 'No conversations yet.',
    listAriaLabel: 'Conversation history',
  },
  // `groups` contains callbacks and icon nodes, so it stays out of `args`.
  render: args => <SidebarListPanel {...args} groups={groups} />,
};

const pinIcon = (
  <span aria-hidden="true" style={{ fontSize: '0.9em' }}>
    📌
  </span>
);

// Pin is revealOnHover (hidden until the row is hovered/focused); delete stays visible
export const WithHoverRevealAction: Story = {
  args: {
    ...Default.args,
  },
  render: args => (
    <SidebarListPanel
      {...args}
      groups={groups.map(group => ({
        ...group,
        items: group.items.map(item => ({
          ...item,
          action: undefined,
          actions: [
            {
              icon: pinIcon,
              label: 'Pin conversation',
              onClick: () => console.log(`pin ${item.id}`),
              revealOnHover: true,
            },
            {
              icon: deleteIcon,
              label: 'Delete conversation',
              onClick: () => console.log(`delete ${item.id}`),
            },
          ],
        })),
      }))}
    />
  ),
};

export const WithLoadMore: Story = {
  args: {
    ...Default.args,
  },
  render: args => (
    <SidebarListPanel
      {...args}
      groups={groups}
      footer={
        <SidebarListLoadMore
          label="Load more"
          onClick={() => console.log('load more')}
        />
      }
    />
  ),
};

const folderIcon = (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M1.5 3.5h4l1.5 2h7.5v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" />
  </svg>
);

const folderPlusIcon = (
  <svg
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    aria-hidden="true"
  >
    <path d="M1.5 3.5h4l1.5 2h7.5v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9z" />
    <path d="M8 7.5v4M6 9.5h4" />
  </svg>
);

const conv = (id: string, label: string, details: string) => ({
  id,
  label,
  details,
  onSelect: () => console.log(`select ${id}`),
});

const projectSubsections = (
  projectId: string,
  projectName: string
): SidebarListGroup[] => [
  {
    id: `${projectId}-pinned`,
    label: 'Pinned',
    items: [
      conv(`${projectId}-p1`, `${projectName} pinned conversation 1`, '14:32'),
      conv(`${projectId}-p2`, `${projectName} pinned conversation 2`, 'Tue'),
    ],
  },
  {
    id: `${projectId}-recent`,
    label: 'Recent',
    items: [
      conv(`${projectId}-c3`, `${projectName} conversation 3`, '09:10'),
      conv(`${projectId}-c4`, `${projectName} conversation 4`, 'Mon'),
    ],
  },
];

// The conversation-history layout: a Projects section of collapsible
// project rows (each with Pinned/Recent subsections), then global
// Pinned and Recents sections
export const ProjectsPinnedRecents: Story = {
  args: {
    ...Default.args,
    title: undefined,
  },
  render: args => (
    <SidebarListPanel
      {...args}
      groups={[
        {
          id: 'projects',
          label: 'Projects',
          actions: [
            {
              icon: folderPlusIcon,
              label: 'New project',
              onClick: () => console.log('new project'),
            },
          ],
          groups: [
            {
              id: 'proj-1',
              label: 'Project Alpha',
              collapsible: true,
              defaultExpanded: true,
              icon: folderIcon,
              groups: projectSubsections('proj-1', 'Alpha'),
            },
            {
              id: 'proj-2',
              label: 'Project Beta with a very long name that truncates',
              collapsible: true,
              icon: folderIcon,
              groups: projectSubsections('proj-2', 'Beta'),
            },
          ],
        },
        {
          id: 'pinned',
          label: 'Pinned',
          items: [
            conv('pin-1', 'Pinned conversation 1', 'Yesterday'),
            conv('pin-2', 'Pinned conversation 2', 'Fri'),
          ],
        },
        {
          id: 'recents',
          label: 'Recents',
          items: [
            conv('rec-1', 'Conversation 3', '16:20'),
            conv('rec-2', 'Conversation 4', 'Thu'),
          ],
        },
      ]}
    />
  ),
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
