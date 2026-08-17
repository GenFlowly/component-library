import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './Icon';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof Icon> = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `The icon primitive: renders an svg asset as a CSS \`mask-image\` on a \`<span>\`, tinted by \`currentColor\` — so an icon always takes the color of the surrounding text, in every theme.

### Anatomy / Behavior

- \`src\` is a url string (in the app these come from the \`ICONS\` asset map).
- Sizing defaults to \`1em\`, so icons scale with the surrounding font size (and with browser zoom / text-scaling, WCAG 1.4.4). Pass \`size\` for a fixed dimension.
- \`forced-color-adjust: none\` keeps the mask visible in Windows High Contrast mode, where forced colors would otherwise blank out \`background-color\`-based rendering.

### Accessibility: decorative by default

- **No \`alt\` (or \`alt=""\`)** → the icon renders \`aria-hidden="true"\` with no role, exactly like \`<img alt="">\`. Screen readers skip it entirely.
- **A real \`alt\`** → the icon renders \`role="img"\` + \`aria-label\`. Use this only when the icon conveys information by itself (e.g. a status indicator with no accompanying text).
- **Icon-only buttons:** never rely on the icon for the name — put \`aria-label\` on the \`<button>\` and leave the icon decorative:

\`\`\`tsx
<button onClick={openMenu} aria-label={t('layout.mobileMenu.menu')}>
  <Icon src={ICONS.MENU} size={24} />
</button>
\`\`\`

### Usage

\`\`\`tsx
import { Icon } from '@genflowly/component-library';

// decorative (sits next to visible text)
<Icon src={ICONS.COPY} size={16} />

// informative (no text nearby — the icon IS the information)
<Icon src={ICONS.VALID} alt="Configured" />
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Copy: Story = {
  args: {
    src: ICONS.COPY,
    alt: 'Copy',
  },
  parameters: {
    docs: {
      description: {
        story:
          'An informative icon: a real `alt` produces `role="img"` + `aria-label="Copy"`.',
      },
    },
  },
};

export const UserCircle: Story = {
  args: {
    src: ICONS.USER_CIRCLE,
    alt: 'User',
  },
  parameters: {
    docs: {
      description: {
        story: 'Another labeled icon, using the user-circle asset.',
      },
    },
  },
};

export const Decorative: Story = {
  args: {
    src: ICONS.COPY,
    size: 24,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The default: with no `alt`, the icon is decorative — rendered `aria-hidden="true"` with no role, invisible to screen readers. Use this whenever visible text (or the parent element\'s label) already carries the meaning.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    src: ICONS.USER_CIRCLE,
    alt: 'User',
    size: 48,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Fixed pixel sizing via `size`. Without it, icons default to `1em` and follow the text size.',
      },
    },
  },
};

export const ColoredViaCurrentColor: Story = {
  args: {
    src: ICONS.COPY,
    alt: 'Copy',
    size: 32,
    style: { color: '#d9534f' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Icons are tinted by `currentColor`: setting the CSS `color` (here via inline style, normally inherited from the parent) recolors the mask.',
      },
    },
  },
};
