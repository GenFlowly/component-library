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
  },
  render: args => (
    <Tooltip {...args}>
      <button>Hover me</button>
    </Tooltip>
  ),
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

export const Interactive: Story = {
  render: () => (
    <Tooltip
      interactive
      position="top"
      content={
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {['Prefers dark mode', 'Works in fintech'].map(fact => (
            <li
              key={fact}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <span>{fact}</span>
              <button
                aria-label={`Remove: ${fact}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e5484d',
                  cursor: 'pointer',
                }}
              >
                ✗
              </button>
            </li>
          ))}
        </ul>
      }
    >
      <span>2 facts added to memory</span>
    </Tooltip>
  ),
  decorators: [
    Story => (
      <div
        style={{ padding: '8rem', display: 'flex', justifyContent: 'center' }}
      >
        <Story />
      </div>
    ),
  ],
};

export const FullWidth: Story = {
  args: {
    content: 'This trigger stretches to the full width of its container',
    fullWidth: true,
  },
  render: args => (
    <Tooltip {...args}>
      <button style={{ width: '100%' }}>Full-width trigger</button>
    </Tooltip>
  ),
  decorators: [
    Story => (
      <div style={{ padding: '6rem 2rem', width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
