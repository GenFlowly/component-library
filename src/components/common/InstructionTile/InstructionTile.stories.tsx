import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import InstructionTile from './InstructionTile';

const meta: Meta<typeof InstructionTile> = {
  title: 'Components/InstructionTile',
  component: InstructionTile,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ maxWidth: '340px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InstructionTile>;

const PHYSICS_DETAIL =
  'You are an expert in physics and electromagnetic waves. You respond in ' +
  'markdown. You cite your sources and provide data to backup your claims ' +
  'whenever possible.';

export const Default: Story = {
  args: {
    title: 'Physics Wave Expert',
    detail: PHYSICS_DETAIL,
    icon: '🔍⚡',
    color: '#059669',
    tags: ['physics', 'electromagnetic waves', 'citations'],
    version: 3,
    owner: { name: 'nkirit' },
    onClick: () => {},
  },
};

export const WithAvatarImage: Story = {
  args: {
    ...Default.args,
    owner: {
      name: 'nkirit',
      avatarUrl: 'https://i.pravatar.cc/48?img=13',
    },
  },
};

export const Minimal: Story = {
  args: {
    title: 'You are a helpful assistant',
    detail: 'You are a helpful assistant',
    version: 1,
    onClick: () => {},
  },
};

export const Grid: Story = {
  decorators: [
    Story => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1rem',
          maxWidth: '1000px',
        }}
      >
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <InstructionTile {...(Default.args as any)} />
      <InstructionTile
        title="H-1B Immigration and Tax Compliance Specialist"
        detail="You are an immigration and Tax expert. You specialize in H1B visas."
        icon="🗄️"
        color="#475569"
        tags={['legal']}
        version={1}
        owner={{ name: 'nkirit' }}
        onClick={() => {}}
      />
      <InstructionTile
        title="Clarity Guidance Coach"
        detail="You are a helpful assistant. You try to clarify before jumping to answer. When you give recommendations, you present it with pros and cons. You break down complex topics."
        icon="📚💡"
        color="#0891B2"
        tags={['teaching', 'clarification', 'structured']}
        version={1}
        owner={{ name: 'someone-else' }}
        onClick={() => {}}
      />
    </>
  ),
};
