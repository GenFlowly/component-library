import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PageHeader from './PageHeader';
import PillButton from '../PillButton/PillButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: 'Conversations',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Team settings',
  },
  render: args => (
    <PageHeader
      {...args}
      actions={
        <>
          <PillButton
            label="Invite member"
            icon={ICONS.USER_CIRCLE}
            variant="primary"
          />
          <PillButton label="Export" icon={ICONS.COPY} variant="secondary" />
        </>
      }
    />
  ),
};

export const LongTitle: Story = {
  args: {
    title:
      'A very long page title that should truncate gracefully when it runs out of horizontal space in the header',
  },
  render: args => (
    <PageHeader
      {...args}
      actions={<PillButton label="Edit" variant="secondary" />}
    />
  ),
};
