import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ConversationSubBar from './ConversationSubBar';
import IconButton from '../IconButton/IconButton';
import { ICONS } from '../../../constants/icons';
import { OutlineItem } from '../Outline/outline.models';

const items: OutlineItem[] = [
  {
    id: 'b1',
    number: 1,
    prompt: 'What is the typical symptoms and how does a gas water heater fail',
    meta: '1 response · Anthropic · 10:30 PM',
  },
  {
    id: 'b2',
    number: 2,
    prompt: 'How often should I flush the tank?',
    meta: '2 responses · Anthropic, OpenAI · 10:34 PM',
  },
  {
    id: 'b6',
    number: 3,
    prompt: 'Draft a short message to my landlord with the findings',
    meta: '1 response · Anthropic · 11:06 PM',
  },
];

const meta: Meta<typeof ConversationSubBar> = {
  title: 'Components/ConversationSubBar',
  component: ConversationSubBar,
};

export default meta;

function Demo() {
  const [current, setCurrent] = useState('b6');
  return (
    <div style={{ width: 1100, height: 420 }}>
      <ConversationSubBar
        title="Water Heater Sediment Buildup Diagnosis"
        items={items}
        currentId={current}
        onSelectItem={setCurrent}
        actions={<IconButton icon={ICONS.COPY} label="Share" />}
      />
    </div>
  );
}

export const Default: StoryObj<typeof ConversationSubBar> = {
  render: () => <Demo />,
};

export const NewChat: StoryObj<typeof ConversationSubBar> = {
  render: () => (
    <div style={{ width: 1100 }}>
      <ConversationSubBar title="New Chat" items={[]} onSelectItem={() => {}} />
    </div>
  ),
};
