import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Tooltip from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'Helpful tooltip text',
    children: <button>Hover me</button>,
  },
  decorators: [
    Story => (
      <div
        style={{ padding: '6rem', display: 'flex', justifyContent: 'center' }}
      >
        <Story />
      </div>
    ),
  ],
};

export const AllPositions: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '3rem',
        padding: '8rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {(['top', 'bottom', 'left', 'right'] as const).map(position => (
        <Tooltip
          key={position}
          content={`Tooltip on the ${position}`}
          position={position}
        >
          <button>{position}</button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    content: 'This trigger stretches to the full width of its container',
    fullWidth: true,
    children: <button style={{ width: '100%' }}>Full-width trigger</button>,
  },
  decorators: [
    Story => (
      <div style={{ padding: '6rem 2rem', width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
