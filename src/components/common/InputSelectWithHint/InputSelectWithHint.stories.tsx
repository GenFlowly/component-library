import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InputSelectWithHint, SelectOption } from './InputSelectWithHint';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof InputSelectWithHint> = {
  title: 'Components/InputSelectWithHint',
  component: InputSelectWithHint,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InputSelectWithHint>;

const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
];

type InputSelectWithHintProps = React.ComponentProps<
  typeof InputSelectWithHint
>;

const DefaultDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: args => <DefaultDemo {...args} />,
  args: {
    hint: 'Language',
    options: languageOptions,
  },
};

const WithIconDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('en');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const WithIcon: Story = {
  render: args => <WithIconDemo {...args} />,
  args: {
    hint: 'Assignee',
    icon: ICONS.USER_CIRCLE,
    options: [
      { label: 'Ada Lovelace', value: 'ada' },
      { label: 'Grace Hopper', value: 'grace' },
      { label: 'Alan Turing', value: 'alan', disabled: true },
    ],
    placeholder: 'Pick a person',
  },
};

const WithCtaOptionDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

// Kept out of `args`: contains a ctaAction callback, which is not serializable.
const projectOptions: SelectOption[] = [
  { label: 'Website redesign', value: 'website' },
  { label: 'Mobile app', value: 'mobile' },
  {
    label: '+ Create new project…',
    value: '__create',
    isCta: true,
    ctaAction: () => alert('Create project clicked'),
  },
];

export const WithCtaOption: Story = {
  render: args => <WithCtaOptionDemo {...args} options={projectOptions} />,
  args: {
    hint: 'Project',
  },
};

const IconOnlyHintOnMobileDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('de');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const IconOnlyHintOnMobile: Story = {
  render: args => <IconOnlyHintOnMobileDemo {...args} />,
  args: {
    hint: 'Language',
    icon: ICONS.USER_CIRCLE,
    iconOnlyHintOnMobile: true,
    options: languageOptions,
  },
};
