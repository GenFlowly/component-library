import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import IconButton from './IconButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof IconButton> = {
  title: 'Components/IconButton',
  component: IconButton,
};

export default meta;

export const Sizes: StoryObj<typeof IconButton> = {
  render: () => (
    <div
      style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 24 }}
    >
      <IconButton icon={ICONS.COPY} label="Copy to clipboard" size="sm" />
      <IconButton icon={ICONS.COPY} label="Copy to clipboard" />
      <IconButton icon={ICONS.ATTACHMENT} label="Add attachments" />
    </div>
  ),
};

export const StatesAndRotation: StoryObj<typeof IconButton> = {
  render: () => (
    <div
      style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 24 }}
    >
      <IconButton
        icon={ICONS.ALT_ARROW_RIGHT}
        label="Previous turn"
        iconRotation={270}
      />
      <IconButton
        icon={ICONS.ALT_ARROW_RIGHT}
        label="Next turn"
        iconRotation={90}
      />
      <IconButton icon={ICONS.MENU} label="Active" active />
      <IconButton icon={ICONS.MENU} label="Disabled" disabled />
    </div>
  ),
};
