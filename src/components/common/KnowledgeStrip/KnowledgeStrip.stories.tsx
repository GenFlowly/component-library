import type { Meta, StoryObj } from '@storybook/react';
import KnowledgeStrip from './KnowledgeStrip';

const meta: Meta<typeof KnowledgeStrip> = {
  title: 'Components/Settings/KnowledgeStrip',
  component: KnowledgeStrip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The "about this page" cards under a settings page title: two or three short title-and-text pairs, as a description list. \`layout="row"\` puts them side by side on desktop; \`layout="stack"\` lists them for the phone info drawer. All explanations live here, never inside the cards below.`,
      },
    },
  },
  args: {
    'aria-label': 'About this page',
    items: [
      {
        title: 'Which key is used when',
        text: 'Each reply uses the key of the AI you picked.',
      },
      {
        title: 'What priority means',
        text: 'Priority 1 is your main provider.',
      },
      { title: 'Where to get a key', text: "From the provider's website." },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof KnowledgeStrip>;

export const Row: Story = { args: { layout: 'row' } };
export const Stack: Story = {
  args: { layout: 'stack' },
  decorators: [
    Story => (
      <div style={{ width: 340 }}>
        <Story />
      </div>
    ),
  ],
};
