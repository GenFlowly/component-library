import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TextContainer from './TextContainer';

const meta: Meta<typeof TextContainer> = {
  title: 'Components/TextContainer',
  component: TextContainer,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TextContainer>;

const markdownContent = `## Getting started

Install the package and create your first client:

\`\`\`bash
npm install @acme/sdk
\`\`\`

\`\`\`typescript
import { Client } from '@acme/sdk'

const client = new Client({ apiKey: process.env.ACME_API_KEY })
const result = await client.messages.create({
    model: 'acme-large',
    prompt: 'Hello, world',
})
console.log(result.text)
\`\`\`

### Supported models

| Model | Context window | Best for |
| --- | --- | --- |
| acme-small | 32k | Quick drafts, classification |
| acme-medium | 128k | General-purpose chat |
| acme-large | 200k | Long documents, complex reasoning |

> Note: inline code like \`client.messages.create()\` and **bold** / *italic* text
> render through react-markdown.

1. Create an API key
2. Install the SDK
3. Ship it
`;

export const Default: Story = {
  args: {
    title: 'API response',
    content: markdownContent,
  },
};

export const WithoutCopyButton: Story = {
  args: {
    title: 'Read-only note',
    content: 'Just a short paragraph of **markdown** without a copy button.',
    showCopyButton: false,
  },
};

export const Loading: Story = {
  args: {
    title: 'Generating...',
    content: 'Partial response streamed so far, with `inline code`...',
    isLoading: true,
  },
};

export const WithSubheader: Story = {
  args: {
    title: 'Assistant',
    subheader: (
      <div style={{ fontStyle: 'italic', opacity: 0.7, padding: '0.25rem 0' }}>
        Thought for 12 seconds
      </div>
    ),
    content: markdownContent,
  },
};
