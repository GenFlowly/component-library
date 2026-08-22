import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import InstructionEditor from './InstructionEditor';

const meta: Meta<typeof InstructionEditor> = {
  title: 'Pages/InstructionEditor',
  component: InstructionEditor,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InstructionEditor>;

const SAMPLE_INSTRUCTION =
  'You are a marketing copy editor. Rewrite the text you are given so it is ' +
  'concise, active-voice and free of jargon, while keeping the original tone.';

function ControlledEditor(
  props: Partial<React.ComponentProps<typeof InstructionEditor>>
) {
  const [name, setName] = useState(props.name ?? 'Marketing copy editor');
  const [text, setText] = useState(props.instructionText ?? SAMPLE_INSTRUCTION);
  return (
    <InstructionEditor
      onSave={() => {}}
      {...props}
      name={name}
      onNameChange={setName}
      instructionText={text}
      onInstructionTextChange={setText}
    />
  );
}

export const EditAsOwner: Story = {
  render: () => (
    <ControlledEditor
      canShare
      canDelete
      onShare={() => {}}
      onDelete={() => {}}
      onBack={() => {}}
    />
  ),
};

export const CreateNew: Story = {
  render: () => (
    <ControlledEditor isNew name="" instructionText="" onBack={() => {}} />
  ),
};

export const ReadOnly: Story = {
  render: () => <ControlledEditor readOnly onBack={() => {}} />,
};

export const Saving: Story = {
  render: () => (
    <ControlledEditor
      isLoading
      canShare
      canDelete
      onShare={() => {}}
      onDelete={() => {}}
      onBack={() => {}}
    />
  ),
};

export const WithVersionHistory: Story = {
  render: () => (
    <ControlledEditor
      canShare
      canDelete
      onShare={() => {}}
      onDelete={() => {}}
      onBack={() => {}}
      versions={[
        { version: 3, details: 'Marketing copy editor' },
        { version: 2, details: 'Marketing copy editor' },
        { version: 1, details: 'Copy editor' },
      ]}
      selectedVersion={3}
      onSelectVersion={() => {}}
    />
  ),
};

export const VersionsLoading: Story = {
  render: () => (
    <ControlledEditor versions={[]} versionsLoading onBack={() => {}} />
  ),
};

export const CustomLabels: Story = {
  render: () => (
    <ControlledEditor
      isNew
      labels={{
        createTitle: 'New public instruction',
        save: 'Save as public instruction',
        namePlaceholder: 'e.g. Support tone-of-voice',
      }}
    />
  ),
};
