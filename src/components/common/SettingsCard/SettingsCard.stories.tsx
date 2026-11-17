import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';
import ToggleRow from '../ToggleRow/ToggleRow';
import StatusPill from '../StatusPill/StatusPill';
import PillButton from '../PillButton/PillButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof SettingsCard> = {
  title: 'Components/Settings/SettingsCard',
  component: SettingsCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The card every settings page is built from: the floating sidebar material, a header with title, status pills and an optional hint, and a padded body.

### Anatomy

- \`title\` names the card (it labels the \`<section>\`). Leave it out for a headerless card, such as a date range panel, and pass \`aria-label\`.
- \`pills\` sit after the title; \`hint\` is a short muted note at the end of the header.
- \`danger\` turns the border red for cards whose action can't be undone.
- \`flush\` drops the body padding for tables.
- The card is a size container, so **SettingsRow** stacks its action under the text below 480 px.

### Rows

- **SettingsRow**: label, optional description, and an action on the right.
- **ToggleRow**: a SettingsRow whose action is a Switch.`,
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SettingsCard>;

function WithRowsDemo() {
  const [learn, setLearn] = useState(true);
  const [use, setUse] = useState(false);
  return (
    <div style={{ maxWidth: 640 }}>
      <SettingsCard
        title="Learned facts"
        icon={ICONS.BRAIN}
        pills={<StatusPill kind="ok">Learning on</StatusPill>}
      >
        <ToggleRow
          label="Learn from my chats"
          checked={learn}
          onChange={setLearn}
        />
        <ToggleRow
          label="Use learned facts in replies"
          checked={use}
          onChange={setUse}
        />
        <SettingsRow
          label="Everything the assistant has learned is listed on the Memory page."
          action={<a href="#memory">Open Memory</a>}
        />
      </SettingsCard>
    </div>
  );
}

export const WithRows: Story = { render: () => <WithRowsDemo /> };

export const DangerWithHint: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <SettingsCard title="Account" danger hint="Can't be undone">
        <SettingsRow
          label="Delete account"
          description="Deletes everything from our servers, forever."
          action={<PillButton label="Delete account" variant="danger" />}
        />
      </SettingsCard>
    </div>
  ),
};

export const Headerless: Story = {
  render: () => (
    <div style={{ maxWidth: 640 }}>
      <SettingsCard aria-label="Date range">
        <span>Body only, named for screen readers.</span>
      </SettingsCard>
    </div>
  ),
};

export const Narrow: Story = {
  render: () => (
    <div style={{ width: 360 }}>
      <SettingsCard title="Indexed chats">
        <SettingsRow
          label="Delete indexed chats"
          description="Clears the search data for your chats."
          action={
            <PillButton
              label="Delete indexed chats"
              variant="danger"
              size="lg"
            />
          }
        />
      </SettingsCard>
    </div>
  ),
};
