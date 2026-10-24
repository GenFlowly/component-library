import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import VerticalSplit from './VerticalSplit';

const meta: Meta<typeof VerticalSplit> = {
  title: 'Components/VerticalSplit',
  component: VerticalSplit,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ width: 280, height: 520, display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VerticalSplit>;

const paneContent = (title: string, rows: string[]) => (
  <div style={{ padding: '0.75rem', overflowY: 'auto' }}>
    <strong
      style={{
        fontSize: '0.65rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        opacity: 0.6,
      }}
    >
      {title}
    </strong>
    {rows.map(row => (
      <div key={row} style={{ padding: '0.4rem 0', fontSize: '0.85rem' }}>
        {row}
      </div>
    ))}
  </div>
);

export const Default: Story = {
  args: {
    storageKey: 'storybook_vertical_split',
    top: paneContent('Projects', ['Alpha', 'Beta', 'Gamma']),
    bottom: paneContent('History', [
      'Conversation one',
      'Conversation two',
      'Conversation three',
      'Conversation four',
      'Conversation five',
      'Conversation six',
    ]),
    separatorLabel: 'Resize panels',
  },
};

export const BottomOnly: Story = {
  args: {
    storageKey: 'storybook_vertical_split_single',
    top: null,
    bottom: paneContent('History', ['Conversation one', 'Conversation two']),
  },
};
