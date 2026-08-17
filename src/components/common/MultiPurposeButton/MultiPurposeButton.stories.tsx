import type { Meta, StoryObj } from '@storybook/react';
import MultiPurposeButton from './MultiPurposeButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof MultiPurposeButton> = {
  title: 'Components/MultiPurposeButton',
  component: MultiPurposeButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MultiPurposeButton>;

export const Default: Story = {
  args: {
    label: 'Submit',
    onClick: () => {},
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Copy to clipboard',
    icon: ICONS.COPY,
    onClick: () => {},
  },
};

export const Disabled: Story = {
  args: {
    label: 'Submit',
    disabled: true,
    onClick: () => {},
  },
};
