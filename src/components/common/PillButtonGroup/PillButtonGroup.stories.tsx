import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PillButtonGroup, { ToggleOption } from './PillButtonGroup';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof PillButtonGroup> = {
  title: 'Components/Buttons/ButtonGroups/PillButtonGroup',
  component: PillButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A controlled row of pill-style toggle buttons — the base component of the button group family. \`RadioButtonGroup\` and \`CheckboxButtonGroup\` are thin presets over it (see the **ButtonGroups/About** page for the full comparison).

### Anatomy / Behavior

- Fully controlled: you pass \`options: ToggleOption[]\` (\`{ id, label, icon? }\`), the current \`selectedValues: string[]\`, and an \`onChange(selectedValues)\` callback. No internal selection state.
- **Multi-select (default):** clicking toggles an option in or out of the selection.
- **\`singleSelection\`:** selecting an option replaces the whole selection (radio semantics); re-clicking the selected option deselects it only when \`allowEmpty\` is true.
- **\`allowEmpty\`** (default \`false\`): when false, any click that would empty the selection is ignored — the group can never reach an empty selection.
- **\`maxSelection\`:** caps the number of simultaneous selections. Without \`replaceOldestAtMax\`, the remaining unselected buttons become disabled (\`disabled\` + \`aria-disabled\`) while the cap is reached.
- **\`replaceOldestAtMax\`** (default \`false\`): changes the cap behavior to first-in, first-out — picking a new option at capacity evicts the oldest selection instead of disabling buttons.
- Empty or missing \`options\` renders nothing.
- Each option can carry a 16px leading icon via \`icon\` (decorative: \`aria-hidden\`; the localized button \`aria-label\` carries the name). The wrapper is \`role="group"\` — pass \`aria-label\` to name it (e.g. "AI vendors").
- i18n: button \`aria-label\`s are localized with \`useTranslation\` (react-i18next key \`common.pillButtonGroup.toggleOption\`), so a consuming app needs an i18next provider; \`aria-pressed\` reflects selection.

### When to use

- Unlimited multi-select, or custom cap behavior the presets don't cover.

### When NOT to use

- At most one active option (view switcher, mode picker) — use **RadioButtonGroup**.
- Capped multi-select where the newest pick wins — use **CheckboxButtonGroup**.
- A standalone action button — use **PillButton** (or **RectangleButton** for simple submits).

### Usage

\`\`\`tsx
import { PillButtonGroup, ToggleOption } from '@genflowly/component-library';

const options: ToggleOption[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'notes', label: 'Notes' },
  { id: 'files', label: 'Files' },
];

const [selected, setSelected] = useState<string[]>(['chat']);

<PillButtonGroup
  options={options}
  selectedValues={selected}
  onChange={setSelected}
  allowEmpty
/>
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PillButtonGroup>;

const options: ToggleOption[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'notes', label: 'Notes' },
  { id: 'files', label: 'Files' },
  { id: 'settings', label: 'Settings' },
];

type PillButtonGroupProps = React.ComponentProps<typeof PillButtonGroup>;

const MultiSelectDemo = (args: PillButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['chat']);
  return (
    <PillButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MultiSelect: Story = {
  render: args => <MultiSelectDemo {...args} />,
  args: {
    options,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default multi-select mode with `allowEmpty`: each click toggles an option independently, with no cap, and the selection may become empty.',
      },
    },
  },
};

const SingleSelectionDemo = (args: PillButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['notes']);
  return (
    <PillButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const SingleSelection: Story = {
  render: args => <SingleSelectionDemo {...args} />,
  args: {
    options,
    singleSelection: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Radio semantics via `singleSelection`: picking an option replaces the previous one, and since `allowEmpty` is off (default), re-clicking the selected option does nothing. This is exactly what the RadioButtonGroup preset does.',
      },
    },
  },
};

const MaxTwoSelectionsDemo = (args: PillButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['chat', 'notes']);
  return (
    <PillButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxTwoSelections: Story = {
  render: args => <MaxTwoSelectionsDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`maxSelection: 2` without `replaceOldestAtMax`: once two options are selected, the remaining buttons are disabled until something is deselected.',
      },
    },
  },
};

const WithIconsDemo = (args: PillButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['me']);
  return (
    <PillButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const WithIcons: Story = {
  render: args => <WithIconsDemo {...args} />,
  args: {
    options: [
      { id: 'me', label: 'Assigned to me', icon: ICONS.USER_CIRCLE },
      { id: 'copied', label: 'Copied', icon: ICONS.COPY },
      { id: 'all', label: 'All' },
    ],
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Options with an `icon` render a 16px leading icon before their label; icon and text-only options can be mixed in the same group.',
      },
    },
  },
};

const WithCheckboxDemo = (args: PillButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['chat']);
  return (
    <PillButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const WithCheckbox: Story = {
  render: args => <WithCheckboxDemo {...args} />,
  args: {
    options,
    showCheckbox: true,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`showCheckbox` renders a checkbox inside each pill that reflects its selected state, making the multi-select nature of the group explicit at a glance.',
      },
    },
  },
};
