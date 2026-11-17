import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ActionMenu from './ActionMenu';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof ActionMenu> = {
  title: 'Components/ActionMenu',
  component: ActionMenu,
};

export default meta;

export const Default: StoryObj<typeof ActionMenu> = {
  render: () => (
    <div style={{ padding: 40 }}>
      <ActionMenu
        label="More actions"
        items={[
          {
            icon: <Icon src={ICONS.DOCUMENT} size={14} />,
            label: 'Move to project',
            onClick: () => {},
          },
          {
            icon: <Icon src={ICONS.COPY} size={14} />,
            label: 'Pin',
            onClick: () => {},
          },
          {
            icon: <Icon src={ICONS.CLOSE} size={14} />,
            label: 'Delete',
            onClick: () => {},
          },
        ]}
      />
    </div>
  ),
};
