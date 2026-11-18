import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import InfoDrawer from './InfoDrawer';
import SlideOverPanel from '../SlideOverPanel/SlideOverPanel';
import PillButton from '../PillButton/PillButton';

const meta: Meta<typeof InfoDrawer> = {
  title: 'Components/Settings/InfoDrawer',
  component: InfoDrawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The phone's "About this page" drawer: a full-screen **SlideOverPanel** from the right with a close button, a title pill naming the page, the page's knowledge cards stacked, and a hint on how to reopen it. It opens from the ⓘ button or a swipe in from the right edge; the close button, Escape and a swipe back to the right close it.

**SlideOverPanel** is the bare panel underneath: \`side\` left or right, \`fullWidth\` to cover the screen, a scrim, Escape or a swipe toward its edge to close, and no slide animation when the viewer prefers reduced motion.`,
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof InfoDrawer>;

function DrawerDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <PillButton label="Open" onClick={() => setOpen(true)} />
      <InfoDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="About this page"
        subtitle="LLM API Keys"
        closeLabel="Close"
        hint="Tap the i button, or swipe in from the right edge of the screen, to open this anytime."
        items={[
          {
            title: 'Which key is used when',
            text: 'Each reply uses the key of the AI you picked.',
          },
          {
            title: 'What priority means',
            text: 'Priority 1 is your main provider.',
          },
        ]}
      />
    </>
  );
}

export const Drawer: Story = { render: () => <DrawerDemo /> };

function BarePanelDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <PillButton label="Open" onClick={() => setOpen(true)} />
      <SlideOverPanel
        open={open}
        onClose={() => setOpen(false)}
        side="right"
        aria-label="Panel"
      >
        <p style={{ padding: 16 }}>Any content.</p>
      </SlideOverPanel>
    </>
  );
}

export const BarePanelFromTheRight: Story = { render: () => <BarePanelDemo /> };
