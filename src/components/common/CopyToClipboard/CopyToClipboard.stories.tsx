import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CopyToClipboard from './CopyToClipboard';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof CopyToClipboard> = {
  title: 'Components/CopyToClipboard',
  component: CopyToClipboard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A button that copies a string to the clipboard and briefly confirms success. You give it the text via \`content\` — it is **not** read from the DOM, so the button can live anywhere relative to the text it copies.

### Anatomy / Behavior

- Clicking calls \`navigator.clipboard.writeText(content)\` (requires a secure context: https or localhost).
- On success the button swaps its content to \`successMessage\` for \`successDuration\` ms (defaults: localized "✓ Copied", 2000ms), then reverts.
- The button face is, in priority order: the success message while confirming → \`buttonText\` if set → the \`icon\` if set → the (localized) \`label\`.
- \`content: ''\` auto-disables the button — no dead clicks on empty text.
- Sizes \`sm | md | lg\`, variants \`primary | secondary\`; extends \`ButtonHTMLAttributes\`, so any standard button prop passes through.
- Accessibility: \`title\` always carries the label; in icon-only mode the button also gets \`aria-label\`, and the icon itself is decorative (\`aria-hidden\`).

### Placing it inside a div with text

The component renders **only the button** — pairing it with the text is the consumer's layout job. The rule that makes it work: pass the *same string* you render as the \`content\` prop (single source of truth). Two proven recipes, both used by \`TextContainer\`:

**1. Overlay in a corner** — wrap the text block in \`position: relative\` and pin the button:

\`\`\`tsx
const text = 'The quick brown fox jumps over the lazy dog.';

<div style={{ position: 'relative', padding: '1rem' }}>
  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
    <CopyToClipboard
      content={text}
      icon={ICONS.COPY}
      variant="secondary"
      size="sm"
      successMessage="✓"
    />
  </div>
  <p>{text}</p>
</div>
\`\`\`

This is exactly how \`TextContainer\` decorates markdown code blocks (its \`PreBlock\`).

**2. Header row** — put the button at the end of a flex header above the text:

\`\`\`tsx
<div>
  <header style={{ display: 'flex', justifyContent: 'flex-end' }}>
    <CopyToClipboard content={text} icon={ICONS.COPY} variant="secondary" size="sm" successMessage="✓" />
  </header>
  <p>{text}</p>
</div>
\`\`\`

Tips for text-block usage:
- Prefer \`icon\` + a short \`successMessage\` (like \`"✓"\`) so the button doesn't change width mid-confirmation and shift the text around it.
- Use \`variant="secondary"\` so the button doesn't compete with the content.
- If the copyable text is assembled from markup, extract it first — \`TextContainer\` exports its \`extractText\` helper for react-markdown nodes.
- If you're copying rendered markdown, pass the *source* string, not the rendered HTML.

### When to use / not use

- Use it wherever users need the raw text: code snippets, API keys, generated responses, share links.
- Don't use it for actions other than clipboard copy — that's what PillButton/RectangleButton are for.
- \`TextContainer\` already embeds it for markdown content (header + every code block); don't add a second one on top.`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CopyToClipboard>;

export const Default: Story = {
  args: {
    content: 'Text that gets copied to the clipboard',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Text-label form with all defaults: localized "Copy" label, "✓ Copied" confirmation for 2 seconds.',
      },
    },
  },
};

export const IconButton: Story = {
  args: {
    content: 'npm install my-component-library',
    icon: ICONS.COPY,
    variant: 'secondary',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only form — the compact variant for embedding next to text. The button carries `aria-label` and `title`; the icon is decorative.',
      },
    },
  },
};

const SAMPLE_TEXT =
  'The generated response you want to let users copy. It can be a paragraph, a code snippet, an API key — the button copies exactly the string you pass as `content`.';

const InTextBlockDemo = () => (
  <div
    style={{
      position: 'relative',
      maxWidth: 480,
      padding: '1rem 3rem 1rem 1rem',
      border: '1px solid var(--color-border, #ccc)',
      borderRadius: 8,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '0.5rem',
        right: '0.5rem',
        zIndex: 10,
      }}
    >
      <CopyToClipboard
        content={SAMPLE_TEXT}
        icon={ICONS.COPY}
        variant="secondary"
        size="sm"
        successMessage="✓"
      />
    </div>
    <p style={{ margin: 0 }}>{SAMPLE_TEXT}</p>
  </div>
);

export const InTextBlock: Story = {
  render: () => <InTextBlockDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'The "div with text" pattern: the text block is `position: relative`, the button is pinned to the top-right corner, and the same string feeds both the paragraph and `content`. The icon + single-character success message keep the button width stable so the confirmation never shifts the layout.',
      },
    },
  },
};

export const CustomLabels: Story = {
  args: {
    content: 'sk-proj-1234567890abcdef',
    label: 'Copy API key',
    successMessage: 'Key copied!',
    successDuration: 1500,
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Overriding the label, confirmation message and duration — useful when the default "Copy" is too generic (here: an API key).',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    content: '',
    label: 'Nothing to copy',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Empty `content` auto-disables the button — no explicit `disabled` prop needed (though one exists for other cases).',
      },
    },
  },
};
