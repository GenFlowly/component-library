import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ToggleGroupButton, { ToggleOption } from './ToggleGroupButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof ToggleGroupButton> = {
  title: 'Components/ToggleGroup/ToggleGroupButton',
  component: ToggleGroupButton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToggleGroupButton>;

const options: ToggleOption[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'notes', label: 'Notes' },
  { id: 'files', label: 'Files' },
  { id: 'settings', label: 'Settings' },
];

type ToggleGroupButtonProps = React.ComponentProps<typeof ToggleGroupButton>;

const MultiSelectDemo = (args: ToggleGroupButtonProps) => {
  const [selected, setSelected] = React.useState<string[]>(['chat']);
  return (
    <ToggleGroupButton
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MultiSelect: Story = {
  render: args => <MultiSelectDemo {...args} />,
  args: {
    options,
    allowEmpty: true,
  },
};

const SingleSelectionDemo = (args: ToggleGroupButtonProps) => {
  const [selected, setSelected] = React.useState<string[]>(['notes']);
  return (
    <ToggleGroupButton
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const SingleSelection: Story = {
  render: args => <SingleSelectionDemo {...args} />,
  args: {
    options,
    singleSelection: true,
  },
};

const MaxTwoSelectionsDemo = (args: ToggleGroupButtonProps) => {
  const [selected, setSelected] = React.useState<string[]>(['chat', 'notes']);
  return (
    <ToggleGroupButton
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxTwoSelections: Story = {
  render: args => <MaxTwoSelectionsDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: true,
  },
};

const WithIconsDemo = (args: ToggleGroupButtonProps) => {
  const [selected, setSelected] = React.useState<string[]>(['me']);
  return (
    <ToggleGroupButton
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const WithIcons: Story = {
  render: args => <WithIconsDemo {...args} />,
  args: {
    options: [
      { id: 'me', label: 'Assigned to me', icon: ICONS.USER_CIRCLE },
      { id: 'copied', label: 'Copied', icon: ICONS.COPY },
      { id: 'all', label: 'All' },
    ],
    allowEmpty: true,
  },
};
