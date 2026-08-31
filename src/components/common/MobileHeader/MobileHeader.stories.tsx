import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MobileHeader from './MobileHeader';

const meta: Meta<typeof MobileHeader> = {
  title: 'Components/MobileHeader',
  component: MobileHeader,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;
type Story = StoryObj<typeof MobileHeader>;

export const Default: Story = {
  args: {
    title: 'New Chat',
    onMenuClick: () => {},
  },
};

export const WithSubtitleAndActions: Story = {
  args: {
    title: 'Trip planning',
    subtitle: '🧭 Travel Guide',
    onSubtitleClick: () => {},
    onMenuClick: () => {},
    menuItems: [
      { label: 'New Chat', onClick: () => {} },
      { label: 'Share', onClick: () => {}, disabled: true },
      { label: 'AI Config', onClick: () => {} },
    ],
  },
};

export const LongTitle: Story = {
  args: {
    title:
      'A very long conversation title that should truncate gracefully inside the center pill',
    subtitle: 'An equally long instruction persona name that also truncates',
    onSubtitleClick: () => {},
    onMenuClick: () => {},
    menuItems: [{ label: 'New Chat', onClick: () => {} }],
  },
};
