import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ScrollArea from './ScrollArea';

const meta: Meta<typeof ScrollArea> = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: () => (
    <ScrollArea style={{ height: 240, width: 280, border: '1px solid #ddd' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{ padding: '0.4rem 0.75rem' }}>
          Row {i + 1} — scroll me: the scrollbar only shows while scrolling
        </div>
      ))}
    </ScrollArea>
  ),
};
