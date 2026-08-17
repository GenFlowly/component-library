import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InputTextWithHint } from './InputTextWithHint';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof InputTextWithHint> = {
  title: 'Components/InputTextWithHint',
  component: InputTextWithHint,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InputTextWithHint>;

type InputTextWithHintProps = React.ComponentProps<typeof InputTextWithHint>;

const DefaultDemo = (args: InputTextWithHintProps) => {
  const [value, setValue] = React.useState('');
  return (
    <InputTextWithHint
      {...args}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

export const Default: Story = {
  render: args => <DefaultDemo {...args} />,
  args: {
    hint: 'Name',
    placeholder: 'Enter your name',
  },
};

const WithIconDemo = (args: InputTextWithHintProps) => {
  const [value, setValue] = React.useState('');
  return (
    <InputTextWithHint
      {...args}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

export const WithIcon: Story = {
  render: args => <WithIconDemo {...args} />,
  args: {
    hint: 'User',
    icon: ICONS.USER_CIRCLE,
    placeholder: 'Enter a username',
  },
};

const PasswordDemo = (args: InputTextWithHintProps) => {
  const [value, setValue] = React.useState('hunter2');
  return (
    <InputTextWithHint
      {...args}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

export const Password: Story = {
  render: args => <PasswordDemo {...args} />,
  args: {
    hint: 'Password',
    type: 'password',
    placeholder: 'Enter a password',
  },
};

export const Disabled: Story = {
  args: {
    hint: 'Email',
    placeholder: 'name@example.com',
    value: 'workequipment@example.com',
    disabled: true,
  },
};
