import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PromptEditor from './PromptEditor';

const meta: Meta<typeof PromptEditor> = {
  title: 'Components/PromptEditor',
  component: PromptEditor,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromptEditor>;

const initialValue = `# System prompt

You are a helpful assistant for the **Acme** support team.

- Answer in the customer's language
- Keep replies under 200 words
- Escalate billing issues to a human

\`\`\`
Ticket format: [SEVERITY] short summary
\`\`\`
`;

export const Default: Story = {
  render: function Render() {
    const [value, setValue] = React.useState(initialValue);
    return (
      <PromptEditor
        id="prompt-editor-default"
        value={value}
        onChange={setValue}
        height="320px"
      />
    );
  },
};

export const Seamless: Story = {
  render: function Render() {
    const [value, setValue] = React.useState(
      'A *seamless* editor blends into its surroundings.'
    );
    return (
      <PromptEditor
        id="prompt-editor-seamless"
        value={value}
        onChange={setValue}
        variant="seamless"
        height="200px"
      />
    );
  },
};

export const ReadOnly: Story = {
  render: function Render() {
    const [value, setValue] = React.useState(initialValue);
    return (
      <PromptEditor
        id="prompt-editor-readonly"
        value={value}
        onChange={setValue}
        readOnly
        height="320px"
      />
    );
  },
};

export const WithMaxLength: Story = {
  render: function Render() {
    const [value, setValue] = React.useState(
      'Type here — input is capped at 100 characters.'
    );
    return (
      <PromptEditor
        id="prompt-editor-maxlength"
        value={value}
        onChange={setValue}
        maxLength={100}
        height="200px"
      />
    );
  },
};
