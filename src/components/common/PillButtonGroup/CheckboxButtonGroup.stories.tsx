import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import CheckboxButtonGroup from './CheckboxButtonGroup';
import { ToggleOption } from './PillButtonGroup';

const meta: Meta<typeof CheckboxButtonGroup> = {
  title: 'Components/Buttons/ButtonGroups/CheckboxButtonGroup',
  component: CheckboxButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Checkbox-style multi-select with a required cap: options toggle independently until \`maxSelection\` is reached — from then on, selecting a new option drops the oldest selection (first-in, first-out).

This is a thin preset over **PillButtonGroup** (the base component): it forces \`replaceOldestAtMax\` on and makes \`maxSelection\` required. Its sibling preset **RadioButtonGroup** forces \`singleSelection\` instead. See the **ButtonGroups/About** page for the full family comparison and real-world usage.

### Anatomy / Behavior

- Fully controlled: \`options: ToggleOption[]\` (\`{ id, label, icon? }\`), \`selectedValues: string[]\`, \`onChange(selectedValues)\`. The order of \`selectedValues\` matters — the first entry is the oldest and is evicted first at the cap.
- At the \`maxSelection\` cap, unselected buttons stay clickable (never disabled); picking one evicts the oldest selection.
- \`allowEmpty\` (default \`false\`): when false, deselecting the last selected button does nothing, so the selection can never become empty.
- Empty \`options\` renders nothing; options may carry a 16px leading icon.
- Inherits PillButtonGroup's localized \`aria-label\`s (react-i18next) and \`aria-pressed\` state.

### When to use

- Several active options up to a cap where the newest pick wins — e.g. column pickers or filters with limited slots.

### When NOT to use

- At most one active option — use **RadioButtonGroup**.
- Unlimited multi-select or a hard cap that disables the other buttons — use the base **PillButtonGroup**.
- A standalone action button — use **PillButton** or **RectangleButton**.

### Usage

\`\`\`tsx
import { CheckboxButtonGroup, ToggleOption } from '@genflowly/component-library';

const options: ToggleOption[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'claude', label: 'Claude' },
  { id: 'gemini', label: 'Gemini' },
];

const [selected, setSelected] = useState<string[]>(['openai']);

<CheckboxButtonGroup
  options={options}
  selectedValues={selected}
  onChange={setSelected}
  maxSelection={2}
  allowEmpty={false}
/>
\`\`\``,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckboxButtonGroup>;

const options: ToggleOption[] = [
  { id: 'red', label: 'Red' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'yellow', label: 'Yellow' },
];

type CheckboxButtonGroupProps = React.ComponentProps<
  typeof CheckboxButtonGroup
>;

const MaxTwoReplacesOldestDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['red']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxTwoReplacesOldest: Story = {
  render: args => <MaxTwoReplacesOldestDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'With `maxSelection: 2`, select two colors and then a third: the oldest selection is evicted (FIFO) instead of the click being blocked.',
      },
    },
  },
};

const MaxThreeDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['red', 'green']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const MaxThree: Story = {
  render: args => <MaxThreeDemo {...args} />,
  args: {
    options,
    maxSelection: 3,
    allowEmpty: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A larger cap (`maxSelection: 3`) over four options: options toggle freely below the cap, and the FIFO eviction only kicks in once three are selected.',
      },
    },
  },
};

const WithCheckboxDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['red']);
  return (
    <CheckboxButtonGroup
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
    maxSelection: 2,
    allowEmpty: true,
    showCheckbox: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`showCheckbox` renders a checkbox inside each pill reflecting its selected state — the clearest choice when the group drives which panels are visible (e.g. AI vendor columns) and users should read it as a capped multi-select.',
      },
    },
  },
};

const NoEmptySelectionDemo = (args: CheckboxButtonGroupProps) => {
  const [selected, setSelected] = React.useState<string[]>(['blue']);
  return (
    <CheckboxButtonGroup
      {...args}
      selectedValues={selected}
      onChange={setSelected}
    />
  );
};

export const NoEmptySelection: Story = {
  render: args => <NoEmptySelectionDemo {...args} />,
  args: {
    options,
    maxSelection: 2,
    allowEmpty: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          '`allowEmpty: false` (the default): deselecting the last remaining selection is ignored, so at least one option always stays active.',
      },
    },
  },
};
