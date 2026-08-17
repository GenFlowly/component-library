import type { Meta, StoryObj } from '@storybook/react';
import PillButton from './PillButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof PillButton> = {
  title: 'Components/PillButton',
  component: PillButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PillButton>;

export const Primary: Story = {
  args: {
    label: 'Save changes',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Cancel',
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    label: 'Delete conversation',
    variant: 'danger',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Copy link',
    icon: ICONS.COPY,
    variant: 'primary',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Save changes',
    variant: 'primary',
    disabled: true,
  },
};
