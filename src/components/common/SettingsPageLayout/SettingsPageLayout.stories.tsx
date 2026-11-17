import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SettingsPageLayout from './SettingsPageLayout';
import SettingsCard from '../SettingsCard/SettingsCard';
import SettingsRow from '../SettingsCard/SettingsRow';
import StatusPill from '../StatusPill/StatusPill';

const strings = {
  aboutTitle: 'About this page',
  breadcrumbLabel: 'Breadcrumb',
  closeLabel: 'Close',
  drawerHint:
    'Tap the i button, or swipe in from the right edge of the screen, to open this anytime.',
};

const meta: Meta<typeof SettingsPageLayout> = {
  title: 'Components/Settings/SettingsPageLayout',
  component: SettingsPageLayout,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The frame of every settings page. On desktop: breadcrumb (section › page, or the page alone), the title with its status pills, the **KnowledgeStrip**, then the cards, at most 880 px wide. With \`narrow\` it renders only the cards; the knowledge moves into an **InfoDrawer** that \`infoOpen\` shows, and the app's mobile header carries the title.`,
      },
    },
  },
  args: {
    title: 'Vector DB Connection',
    section: 'BYOK Settings',
    status: <StatusPill kind="ok">Connected</StatusPill>,
    knowledge: [
      {
        title: 'What it stores',
        text: 'Your saved chats, kept in your own database.',
      },
      { title: 'If you change it', text: 'Your old database keeps its data.' },
    ],
    strings,
    children: (
      <SettingsCard
        title="Milvus Cloud"
        pills={<StatusPill kind="ok">Connected</StatusPill>}
      >
        <SettingsRow label="Token" description="Saved · hidden" />
      </SettingsCard>
    ),
  },
};
export default meta;

type Story = StoryObj<typeof SettingsPageLayout>;

export const Desktop: Story = {};
export const WithoutSection: Story = {
  args: { title: 'Developer', section: undefined },
};
export const PhoneWithDrawerOpen: Story = {
  args: { narrow: true, infoOpen: true },
  decorators: [
    Story => (
      <div style={{ width: 390 }}>
        <Story />
      </div>
    ),
  ],
};
