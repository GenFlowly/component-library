import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CollapseStrip from './CollapseStrip';

const meta: Meta<typeof CollapseStrip> = {
  title: 'Components/CollapseStrip',
  component: CollapseStrip,
};

export default meta;

export const BothDirections: StoryObj<typeof CollapseStrip> = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, padding: 24, width: 520 }}>
      <div style={{ width: 240 }}>
        <CollapseStrip
          direction="left"
          label="Collapse Sidebar"
          onClick={() => {}}
        />
      </div>
      <div style={{ width: 240 }}>
        <CollapseStrip
          direction="right"
          label="Collapse Sidebar"
          onClick={() => {}}
        />
      </div>
    </div>
  ),
};
