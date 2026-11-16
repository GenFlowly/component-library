import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import OutlineMenu from './OutlineMenu';
import OutlineSheet from './OutlineSheet';
import { OutlineItem } from './outline.models';

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
    id: 'b3',
    number: 3,
    prompt: 'Draft a short message to my landlord',
    isGenerating: true,
  },
];

const meta: Meta<typeof OutlineMenu> = {
  title: 'Components/Outline',
  component: OutlineMenu,
};

export default meta;

export const Menu: StoryObj<typeof OutlineMenu> = {
  render: () => (
    <div style={{ padding: 24 }}>
      <OutlineMenu
        items={items}
        currentId="b2"
        onSelect={() => {}}
        onClose={() => {}}
      />
    </div>
  ),
};

function SheetDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open outline</button>
      <OutlineSheet
        isOpen={open}
        items={items}
        currentId="b3"
        onSelect={() => {}}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export const Sheet: StoryObj<typeof OutlineMenu> = {
  render: () => <SheetDemo />,
};
