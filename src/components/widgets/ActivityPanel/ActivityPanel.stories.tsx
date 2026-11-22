import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ActivityPanel from './ActivityPanel';
import { ActivityEvent } from './activity.models';
import completed from './fixtures/completed_six_searches.json';
import live from './fixtures/live_mid_turn.json';
import denied from './fixtures/denied_searches.json';
import errorTurn from './fixtures/error_turn.json';
import subagent from './fixtures/subagent_call.json';
import memoryOnly from './fixtures/memory_only.json';
import stopped from './fixtures/stopped_turn.json';

/** The completed log as a non-author receives it: the proxy strips these keys. */
function redacted(events: unknown[]): ActivityEvent[] {
  return JSON.parse(JSON.stringify(events)).map(
    (e: Record<string, unknown>) => {
      delete e.developer;
      if (e.type === 'step.end' && e.kind === 'memory') delete e.memories;
      return e as unknown as ActivityEvent;
    }
  );
}

/** A response card around the panel, in the card's own colours. */
function Card({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        maxWidth: width,
        boxSizing: 'border-box',
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--color-border)',
        background: 'var(--color-response-container-background)',
        containerType: 'inline-size',
      }}
    >
      {children}
    </div>
  );
}

const meta: Meta<typeof ActivityPanel> = {
  title: 'Widgets/ActivityPanel',
  component: ActivityPanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The agent activity panel inside a response card (design 6, "Story + Evidence"). ' +
          "It takes the turn's activity log and renders a receipt (time, searches, sources, memories and " +
          'where the time went), then two views of the same turn: **Story**, one beat per step with the ' +
          "agent's own reasons, its queries, results and timings; and **Evidence**, every source grouped by " +
          'the step that found it, filterable by cited, not cited and failed. Open for the whole live turn, ' +
          'folded to one line once it ends. Each story here renders one of the shared contract fixtures.',
      },
    },
  },
  render: args => (
    <Card width={768}>
      <ActivityPanel {...args} />
    </Card>
  ),
};
export default meta;

type Story = StoryObj<typeof ActivityPanel>;

export const Live: Story = {
  args: { events: live.events as ActivityEvent[], isLive: true },
};

export const DoneStory: Story = {
  args: {
    events: completed.events as ActivityEvent[],
    isLive: false,
    citedSources: completed.web_sources,
    defaultOpen: true,
  },
};

export const DoneEvidence: Story = {
  args: { ...DoneStory.args, defaultView: 'evidence' },
};

export const Folded: Story = {
  args: { ...DoneStory.args, defaultOpen: false },
};

export const PhoneWidth: Story = {
  args: { ...DoneStory.args },
  render: args => (
    <Card width={358}>
      <ActivityPanel {...args} />
    </Card>
  ),
};

export const LivePhoneWidth: Story = {
  args: { ...Live.args },
  render: args => (
    <Card width={358}>
      <ActivityPanel {...args} />
    </Card>
  ),
};

export const SharedViewer: Story = {
  name: 'Shared viewer (counts only)',
  args: {
    events: redacted(completed.events),
    isLive: false,
    citedSources: completed.web_sources,
    defaultOpen: true,
    defaultView: 'evidence',
  },
};

export const BudgetModes: Story = {
  args: {
    events: denied.events as ActivityEvent[],
    isLive: false,
    citedSources: denied.web_sources,
    defaultOpen: true,
  },
};

export const Failed: Story = {
  args: {
    events: errorTurn.events as ActivityEvent[],
    isLive: false,
    citedSources: errorTurn.web_sources,
    defaultOpen: true,
  },
};

export const Subagent: Story = {
  args: {
    events: subagent.events as ActivityEvent[],
    isLive: false,
    citedSources: subagent.web_sources,
    defaultOpen: true,
  },
};

export const NoTools: Story = {
  args: {
    events: memoryOnly.events as ActivityEvent[],
    isLive: false,
    defaultOpen: true,
  },
};

export const Stopped: Story = {
  args: {
    events: stopped.events as ActivityEvent[],
    isLive: false,
    stopReason: 'cancelled',
    defaultOpen: true,
  },
};
