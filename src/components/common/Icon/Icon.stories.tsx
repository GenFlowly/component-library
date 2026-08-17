import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Copy: Story = {
  args: {
    src: ICONS.COPY,
    alt: 'Copy',
  },
};

export const UserCircle: Story = {
  args: {
    src: ICONS.USER_CIRCLE,
    alt: 'User',
  },
};

export const Large: Story = {
  args: {
    src: ICONS.USER_CIRCLE,
    alt: 'User',
    size: 48,
  },
};

export const ColoredViaCurrentColor: Story = {
  args: {
    src: ICONS.COPY,
    alt: 'Copy',
    size: 32,
    style: { color: '#d9534f' },
  },
};
