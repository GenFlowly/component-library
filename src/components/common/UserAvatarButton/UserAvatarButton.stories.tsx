import type { Meta, StoryObj } from '@storybook/react';
import { UserAvatarButton } from './UserAvatarButton';

const meta: Meta<typeof UserAvatarButton> = {
  title: 'Components/UserAvatarButton',
  component: UserAvatarButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UserAvatarButton>;

export const Default: Story = {
  args: {
    displayName: 'Jane Doe',
    onClick: () => console.log('avatar clicked'),
  },
};

export const WithPicture: Story = {
  args: {
    displayName: 'Jane Doe',
    displayPicture: 'https://i.pravatar.cc/80?img=5',
    onClick: () => console.log('avatar clicked'),
  },
};

export const Disabled: Story = {
  args: {
    displayName: 'Jane Doe',
    disabled: true,
  },
};
