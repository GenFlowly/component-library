import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MobileMenu from './MobileMenu';

const meta: Meta<typeof MobileMenu> = {
  title: 'Components/MobileMenu',
  component: MobileMenu,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export default meta;
type Story = StoryObj<typeof MobileMenu>;

export const WithContext: Story = {
  args: {
    title: 'History',
    onOpenAppMenu: () => {},
    onClose: () => {},
    children: (
      <ul style={{ margin: 0, padding: '1rem', listStyle: 'none' }}>
        <li>Trip planning</li>
        <li>Weekly report draft</li>
        <li>Recipe ideas</li>
      </ul>
    ),
  },
};
