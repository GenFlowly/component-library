import type { Meta, StoryObj } from '@storybook/react';
import PillButton from './PillButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof PillButton> = {
  title: 'Components/Buttons/PillButton',
  component: PillButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A rounded, pill-shaped action button with three visual variants (\`primary\`, \`secondary\`, \`danger\`) and an optional leading icon.

### Anatomy / Behavior

- Renders a native \`<button>\`; because the props extend \`ButtonHTMLAttributes<HTMLButtonElement>\`, every standard button attribute (\`onClick\`, \`disabled\`, \`type\`, \`aria-*\`, ...) passes straight through.
- \`icon\` (an icon source string) renders a 16px \`Icon\` before the label (decorative: \`aria-hidden\`, the label carries the accessible name); omit it for a text-only pill.
- \`label\` accepts any ReactNode. A plain string is wrapped in a \`<span>\` so it can receive a \`-text\` suffixed test id; other nodes render as-is.
- \`variant\` defaults to \`primary\`; \`secondary\` and \`danger\` swap the style class.
- \`data-testid\` on the root also derives \`-icon\` and \`-text\` suffixed ids.

### When to use

- Standalone actions: save, cancel, copy, delete.
- When you need visual variants (e.g. a destructive \`danger\` action) or arbitrary button attributes.

### When NOT to use

- Simple submit-style actions with a minimal API — use **RectangleButton**.
- A set of mutually related toggle buttons with managed selection — use the **ButtonGroups** family (PillButtonGroup / RadioButtonGroup / CheckboxButtonGroup).

### Usage

\`\`\`tsx
import { PillButton } from '@genflowly/component-library';

<PillButton
  label="Delete conversation"
  variant="danger"
  onClick={handleDelete}
  disabled={isDeleting}
/>
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PillButton>;

export const Primary: Story = {
  args: {
    label: 'Save changes',
    variant: 'primary',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The default `primary` variant — the main affirmative action in a view (also what you get when `variant` is omitted).',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    label: 'Cancel',
    variant: 'secondary',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The `secondary` variant for lower-emphasis actions, typically paired with a primary pill (e.g. Cancel next to Save).',
      },
    },
  },
};

export const Danger: Story = {
  args: {
    label: 'Delete conversation',
    variant: 'danger',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The `danger` variant for destructive actions such as deleting data.',
      },
    },
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Copy link',
    icon: ICONS.COPY,
    variant: 'primary',
  },
  parameters: {
    docs: {
      description: {
        story: 'Passing an `icon` source renders a 16px icon before the label.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    label: 'Save changes',
    variant: 'primary',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The native `disabled` attribute (inherited from `ButtonHTMLAttributes`) passes through to the underlying `<button>` and blocks clicks.',
      },
    },
  },
};
