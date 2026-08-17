import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { InputSelectWithHint, SelectOption } from './InputSelectWithHint';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof InputSelectWithHint> = {
  title: 'Components/InputSelectWithHint',
  component: InputSelectWithHint,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A native \`<select>\` with a labeled prefix area — hint text plus an optional icon — for compact labeled dropdowns (language, persona, version pickers).

### Anatomy / Behavior

- **Controlled:** pass \`value\` and \`onChange\`. An empty value shows the placeholder (localized "Select an option" by default, override via \`placeholder\`).
- **Prefix area:** \`hint\` text with an optional decorative \`icon\` before it. The prefix labels the select visually; the native \`<select>\` keeps full keyboard/screen-reader behavior.
- **CTA options** (\`isCta: true\`): selecting one fires its \`ctaAction\` *instead of* \`onChange\` and the select keeps its previous value — for entries like "+ Create new…" that open a flow rather than pick a value.
- **Disabled options:** \`disabled: true\` on any option.

### Mobile: \`iconOnlyHintOnMobile\`

At mobile widths (\`max-width: 768px\` — same breakpoint the app uses for \`isMobile\`), the flag collapses the prefix to just the icon and hides the hint text, saving row space.

Two rules that are easy to miss:

1. **It's opt-in per instance.** Selects sitting side by side each need the flag — one collapsed neighbor doesn't affect the other.
2. **It requires \`icon\`.** Without an icon the prefix would collapse to nothing, so the flag is ignored (\`iconOnlyHintOnMobile && icon\` gates the class). If you want the collapse, always pass both:

\`\`\`tsx
<InputSelectWithHint
  hint={t('...versionHint')}
  icon={ICONS.HISTORY}
  iconOnlyHintOnMobile
  value={version}
  onChange={setVersion}
  options={versionOptions}
/>
\`\`\`

### When to use

- A labeled dropdown in a dense row (widget headers, toolbars) — the hint replaces a separate \`<label>\` element visually.
- Not for free-text entry (see InputTextWithHint) and not for multi-select.`,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof InputSelectWithHint>;

const languageOptions: SelectOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
];

type InputSelectWithHintProps = React.ComponentProps<
  typeof InputSelectWithHint
>;

const DefaultDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const Default: Story = {
  render: args => <DefaultDemo {...args} />,
  args: {
    hint: 'Language',
    options: languageOptions,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Text-only hint with the default localized placeholder. Fully controlled: the demo stores the value in state.',
      },
    },
  },
};

const WithIconDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('en');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const WithIcon: Story = {
  render: args => <WithIconDemo {...args} />,
  args: {
    hint: 'Assignee',
    icon: ICONS.USER_CIRCLE,
    options: [
      { label: 'Ada Lovelace', value: 'ada' },
      { label: 'Grace Hopper', value: 'grace' },
      { label: 'Alan Turing', value: 'alan', disabled: true },
    ],
    placeholder: 'Pick a person',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Icon + hint prefix, a custom placeholder, and a disabled option. The icon is decorative — the hint text carries the label.',
      },
    },
  },
};

const WithCtaOptionDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

// Kept out of `args`: contains a ctaAction callback, which is not serializable.
const projectOptions: SelectOption[] = [
  { label: 'Website redesign', value: 'website' },
  { label: 'Mobile app', value: 'mobile' },
  {
    label: '+ Create new project…',
    value: '__create',
    isCta: true,
    ctaAction: () => alert('Create project clicked'),
  },
];

export const WithCtaOption: Story = {
  render: args => <WithCtaOptionDemo {...args} options={projectOptions} />,
  args: {
    hint: 'Project',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The last option is a CTA (`isCta: true`): choosing it fires `ctaAction` (here an alert) instead of `onChange`, and the select keeps its previous value.',
      },
    },
  },
};

const IconOnlyHintOnMobileDemo = (args: InputSelectWithHintProps) => {
  const [value, setValue] = React.useState('de');
  return <InputSelectWithHint {...args} value={value} onChange={setValue} />;
};

export const IconOnlyHintOnMobile: Story = {
  render: args => <IconOnlyHintOnMobileDemo {...args} />,
  args: {
    hint: 'Language',
    icon: ICONS.USER_CIRCLE,
    iconOnlyHintOnMobile: true,
    options: languageOptions,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    docs: {
      description: {
        story:
          'The mobile collapse in action — this story opens in a mobile viewport (Canvas tab) where only the icon shows; widen past 768px and the "Language" hint reappears. Remember: the flag needs `icon` set, and each instance opts in separately.',
      },
    },
  },
};
