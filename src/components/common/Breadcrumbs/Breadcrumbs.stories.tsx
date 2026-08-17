import type { Meta, StoryObj } from '@storybook/react';
import Breadcrumbs from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Menu', onClick: () => {} },
      { label: 'Settings', onClick: () => {} },
      { label: 'Profile' },
    ],
  },
};

export const SingleLevel: Story = {
  args: {
    items: [{ label: 'Home' }],
  },
};

export const AllClickable: Story = {
  args: {
    items: [
      { label: 'Workspace', onClick: () => {} },
      { label: 'Projects', onClick: () => {} },
      { label: 'Website redesign', onClick: () => {} },
    ],
  },
};

export const DeepTrail: Story = {
  args: {
    items: [
      { label: 'Home', onClick: () => {} },
      { label: 'Organization', onClick: () => {} },
      { label: 'Teams', onClick: () => {} },
      { label: 'Design', onClick: () => {} },
      { label: 'Members' },
    ],
  },
};
