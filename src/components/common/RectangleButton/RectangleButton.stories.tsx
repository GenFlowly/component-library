import type { Meta, StoryObj } from '@storybook/react';
import RectangleButton from './RectangleButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof RectangleButton> = {
  title: 'Components/Buttons/RectangleButton',
  component: RectangleButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RectangleButton>;

export const Default: Story = {
  args: {
    label: 'Submit',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Copy to clipboard',
    icon: ICONS.COPY,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Submit',
    disabled: true,
  },
};
