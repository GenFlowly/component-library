import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import RadioButtonGroup from './RadioButtonGroup';
import { ToggleOption } from './ToggleGroupButton';

const meta: Meta<typeof RadioButtonGroup> = {
  title: 'Components/ToggleGroup/RadioButtonGroup',
  component: RadioButtonGroup,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioButtonGroup>;

const options: ToggleOption[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

type RadioButtonGroupProps = React.ComponentProps<typeof RadioButtonGroup>;

const DefaultDemo = (args: RadioButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['weekly']);
  return (
    <RadioButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const Default: Story = {
  render: args => <DefaultDemo {...args} />,
  args: {
    options,
  },
};

const AllowEmptyDemo = (args: RadioButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <RadioButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const AllowEmpty: Story = {
  render: args => <AllowEmptyDemo {...args} />,
  args: {
    options,
    allowEmpty: true,
  },
};
