import type { Meta, StoryObj } from '@storybook/react';
import CopyToClipboard from './CopyToClipboard';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof CopyToClipboard> = {
  title: 'Components/CopyToClipboard',
  component: CopyToClipboard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CopyToClipboard>;

export const Default: Story = {
  args: {
    content: 'Text that gets copied to the clipboard',
  },
};

export const IconButton: Story = {
  args: {
    content: 'npm install my-component-library',
    icon: ICONS.COPY,
    variant: 'secondary',
  },
};

export const CustomLabels: Story = {
  args: {
    content: 'sk-proj-1234567890abcdef',
    label: 'Copy API key',
    successMessage: 'Key copied!',
    successDuration: 1500,
    size: 'md',
  },
};

export const Disabled: Story = {
  args: {
    content: '',
    label: 'Nothing to copy',
  },
};
