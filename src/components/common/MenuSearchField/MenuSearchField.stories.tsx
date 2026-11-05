import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MenuSearchField from './MenuSearchField';

const meta: Meta<typeof MenuSearchField> = {
  title: 'Components/MenuSearchField',
  component: MenuSearchField,
};

export default meta;

function ControlledField() {
  const [value, setValue] = useState('');
  return (
    <MenuSearchField
      value={value}
      onChange={setValue}
      placeholder="Search chats"
      clearLabel="Clear search"
    />
  );
}

export const Default: StoryObj<typeof MenuSearchField> = {
  render: () => <ControlledField />,
};
