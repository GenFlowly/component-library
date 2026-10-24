import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import Chip from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Common/Chip',
  component: Chip,
  parameters: {
    docs: {
      description: {
        component:
          'Small rounded tag chip (the model-name look). Static by default; pass `onClick` for the ' +
          'CTA variant — a pressable chip with hover and `selected` states for filter rows.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Chip>;

/** Static tag, e.g. the model a response was generated with. */
export const StaticTag: Story = {
  args: { label: 'claude-fable-5' },
};

/** CTA filter row: exactly one chip selected at a time. */
export const CtaFilterRow: Story = {
  render: () => {
    const [choice, setChoice] = useState('all');
    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Chip
          label="All agents"
          onClick={() => setChoice('all')}
          selected={choice === 'all'}
        />
        <Chip
          label="Created by me"
          onClick={() => setChoice('mine')}
          selected={choice === 'mine'}
        />
        <Chip label="Disabled" onClick={() => undefined} disabled />
      </div>
    );
  },
};
