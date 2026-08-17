import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CheckboxButtonGroup from './CheckboxButtonGroup';
import { ToggleOption } from './ToggleGroupButton';

const meta: Meta<typeof CheckboxButtonGroup> = {
  title: 'Components/ToggleGroup/CheckboxButtonGroup',
  component: CheckboxButtonGroup,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CheckboxButtonGroup>;

const options: ToggleOption[] = [
  { id: 'red', label: 'Red' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'yellow', label: 'Yellow' },
];

type CheckboxButtonGroupProps = React.ComponentProps<
  typeof CheckboxButtonGroup
>;

const MaxTwoReplacesOldestDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['red']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxTwoReplacesOldest: Story = {
  render: args => <MaxTwoReplacesOldestDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: true,
  },
};

const MaxThreeDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['red', 'green']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxThree: Story = {
  render: args => <MaxThreeDemo {...args} />,
  args: {
    options,
    maxSelection: 3,
    allowEmpty: true,
  },
};

const NoEmptySelectionDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['blue']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const NoEmptySelection: Story = {
  render: args => <NoEmptySelectionDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: false,
  },
};
