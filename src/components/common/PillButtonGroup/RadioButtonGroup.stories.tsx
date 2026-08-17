import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import RadioButtonGroup from './RadioButtonGroup';
import { ToggleOption } from './PillButtonGroup';

const meta: Meta<typeof RadioButtonGroup> = {
  title: 'Components/Buttons/ButtonGroups/RadioButtonGroup',
  component: RadioButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Radio-style pill group: selecting a button toggles any other selected button off, so at most one option is selected.

This is a thin preset over **PillButtonGroup** (the base component): it forces \`singleSelection\` on. Its sibling preset **CheckboxButtonGroup** forces \`replaceOldestAtMax\` with a required \`maxSelection\` instead. See the **ButtonGroups/About** page for the full family comparison and real-world usage.

### Anatomy / Behavior

- Fully controlled: \`options: ToggleOption[]\` (\`{ id, label, icon? }\`), \`selectedValues: string[]\`, \`onChange(selectedValues)\`. The selection is still reported as an array (one element, or empty) so swapping in another family member never changes the callback contract.
- Clicking an unselected option replaces the current selection with it.
- \`allowEmpty\` (default \`false\`): when false, re-clicking the selected option does nothing; when true, it deselects, allowing an empty selection.
- Empty \`options\` renders nothing; options may carry a 16px leading icon.
- Inherits PillButtonGroup's localized \`aria-label\`s (react-i18next) and \`aria-pressed\` state.

### When to use

- At most one active option: view switchers, mode pickers, frequency selectors.

### When NOT to use

- Several options active at once — use **CheckboxButtonGroup** (capped, newest wins) or the base **PillButtonGroup** (unlimited or custom cap behavior).
- A standalone action button — use **PillButton** or **RectangleButton**.

### Usage

\`\`\`tsx
import { RadioButtonGroup, ToggleOption } from '@genflowly/component-library';

const options: ToggleOption[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const [selected, setSelected] = useState<string[]>(['weekly']);

<RadioButtonGroup
  options={options}
  selectedValues={selected}
  onChange={setSelected}
/>
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioButtonGroup>;

const options: ToggleOption[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

type RadioButtonGroupProps = React.ComponentProps<typeof RadioButtonGroup>;

const DefaultDemo = (args: RadioButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['weekly']);
  return (
    <RadioButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const Default: Story = {
  render: args => <DefaultDemo {...args} />,
  args: {
    options,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Default radio behavior: exactly one option is active, clicking another moves the selection, and re-clicking the active option does nothing because `allowEmpty` defaults to `false`.',
      },
    },
  },
};

const AllowEmptyDemo = (args: RadioButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <RadioButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const AllowEmpty: Story = {
  render: args => <AllowEmptyDemo {...args} />,
  args: {
    options,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `allowEmpty`, re-clicking the selected option deselects it — the group starts empty here and can return to that state.',
      },
    },
  },
};
