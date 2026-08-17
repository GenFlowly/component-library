import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ResizableSidebar from './ResizableSidebar';

const meta: Meta<typeof ResizableSidebar> = {
  title: 'Components/ResizableSidebar',
  component: ResizableSidebar,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div
        style={{
          display: 'flex',
          height: 420,
          border: '1px solid var(--color-border, #ccc)',
        }}
      >
        <Story />
        <div style={{ flex: 1, padding: '1rem', opacity: 0.6 }}>
          Main content area — drag the sidebar&apos;s right edge to resize.
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResizableSidebar>;

const navContent = (
  <nav
    style={{
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}
  >
    <strong>Navigation</strong>
    {['Dashboard', 'Conversations', 'Prompts', 'Settings', 'Billing'].map(
      label => (
        <a
          key={label}
          href={`#${label.toLowerCase()}`}
          onClick={e => e.preventDefault()}
        >
          {label}
        </a>
      )
    )}
  </nav>
);

export const Default: Story = {
  args: {
    storageKey: 'storybook.resizable-sidebar.default',
    children: navContent,
  },
};

export const CustomBounds: Story = {
  args: {
    storageKey: 'storybook.resizable-sidebar.custom-bounds',
    minWidth: 240,
    maxWidth: 360,
    children: (
      <div style={{ padding: '1rem' }}>
        <strong>Constrained panel</strong>
        <p>This sidebar can only be resized between 240px and 360px.</p>
      </div>
    ),
  },
};

export const WithLongContent: Story = {
  args: {
    storageKey: 'storybook.resizable-sidebar.long-content',
    children: (
      <div style={{ padding: '1rem', overflowY: 'auto', height: '100%' }}>
        <strong>Long content</strong>
        {Array.from({ length: 20 }).map((_, i) => (
          <p key={i}>Sidebar item {i + 1}</p>
        ))}
      </div>
    ),
  },
};
