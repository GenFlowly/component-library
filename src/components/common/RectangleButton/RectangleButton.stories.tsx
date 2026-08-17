import type { Meta, StoryObj } from '@storybook/react';
import RectangleButton from './RectangleButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof RectangleButton> = {
  title: 'Components/Buttons/RectangleButton',
  component: RectangleButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A rectangular submit-style button with a text label and an optional trailing icon, exposing a deliberately minimal API.

### Anatomy / Behavior

- Renders a native \`<button>\` with a fixed submit-button style — there are no visual variants.
- The API is exactly four props plus a test id: \`label\` (string only), \`onClick\` (required), \`disabled\` (defaults to \`false\`), and \`icon\`. Other button attributes are not forwarded.
- \`icon\` renders an \`Icon\` **after** the label (trailing), unlike PillButton where the icon leads.
- \`data-testid\` on the root also derives an \`-icon\` suffixed id for the icon.

### When to use

- Simple submit/confirm actions where a plain text label and a click handler are all you need.

### When NOT to use

- You need visual variants (secondary/danger), a ReactNode label, or extra button attributes (\`type\`, \`aria-*\`, ...) — use **PillButton**.
- You need a set of related toggle buttons with managed selection — use the **ButtonGroups** family (PillButtonGroup / RadioButtonGroup / CheckboxButtonGroup).

### Usage

\`\`\`tsx
import { RectangleButton } from '@genflowly/component-library';

<RectangleButton
  label="Submit"
  onClick={handleSubmit}
  disabled={!isFormValid}
/>
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RectangleButton>;

export const Default: Story = {
  args: {
    label: 'Submit',
  },
  parameters: {
    docs: {
      description: {
        story: 'The default appearance: a text label and nothing else.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Copy to clipboard',
    icon: ICONS.COPY,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Passing an `icon` source renders an icon after the label (trailing position).',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    label: 'Submit',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Setting `disabled` disables the underlying `<button>` so clicks are ignored.',
      },
    },
  },
};
