import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Switch from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Components/Switch',
  component: Switch,
};

export default meta;

function Demo() {
  const [on, setOn] = useState(true);
  return (
    <label
      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 24 }}
    >
      <Switch checked={on} onChange={setOn} label="OpenAI" />
      OpenAI
    </label>
  );
}

export const Default: StoryObj<typeof Switch> = { render: () => <Demo /> };
