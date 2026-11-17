import type { Meta, StoryObj } from '@storybook/react';
import StatusPill from './StatusPill';

const meta: Meta<typeof StatusPill> = {
  title: 'Components/Settings/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A small rounded status label for settings page titles and card headers.

### Kinds

- \`ok\`: green, for something set up and working ("Key set", "Connected").
- \`neutral\` and \`unset\`: the muted outline, for a fact ("Priority 2") or something not set up yet ("Not set").
- \`warn\`: red, for something that needs attention ("Can't be used").
- \`locked\`: filled grey, for a choice that can't be changed ("Locked").

### Usage

\`\`\`tsx
<StatusPill kind="ok">Key set</StatusPill>
\`\`\``,
      },
    },
  },
  args: { children: 'Key set', kind: 'ok' },
};
export default meta;

type Story = StoryObj<typeof StatusPill>;

export const Ok: Story = {};
export const Neutral: Story = {
  args: { kind: 'neutral', children: 'Priority 2' },
};
export const Unset: Story = { args: { kind: 'unset', children: 'Not set' } };
export const Warn: Story = {
  args: { kind: 'warn', children: "Can't be used" },
};
export const Locked: Story = { args: { kind: 'locked', children: 'Locked' } };
