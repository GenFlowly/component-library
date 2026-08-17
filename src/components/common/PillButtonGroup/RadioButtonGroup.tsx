import React from 'react';
import PillButtonGroup, { ToggleOption } from './PillButtonGroup';

interface RadioButtonGroupProps {
  /** Options to render, in order (see `ToggleOption`: `{ id, label, icon? }`). */
  options: ToggleOption[];
  /** Currently selected option ids (controlled). At most one entry; still an array so the callback contract matches the rest of the family. */
  selectedValues: string[];
  /** Called with the next selection (a one-element array, or `[]` when `allowEmpty` permits deselection). */
  onChange: (selectedValues: string[]) => void;
  /**
   * Whether clicking the selected button deselects it, allowing an empty
   * selection. When false, the selected button stays selected on re-click.
   * @default false
   */
  allowEmpty?: boolean;
  /** Extra class name(s) forwarded to the underlying PillButtonGroup wrapper. */
  className?: string;
  /** Test id forwarded to the underlying PillButtonGroup wrapper. */
  'data-testid'?: string;
}

/**
 * Radio-style view of PillButtonGroup: selecting a button toggles any
 * other selected button off, so at most one option is selected.
 *
 * This is a thin preset over PillButtonGroup (it forces `singleSelection`).
 * Use it for view switchers and mode pickers; see the ButtonGroups About
 * page for the full family.
 */
export default function RadioButtonGroup({
  options,
  selectedValues,
  onChange,
  allowEmpty = false,
  className = '',
  'data-testid': testId,
}: RadioButtonGroupProps): React.ReactElement {
  return (
    <PillButtonGroup
      options={options}
      selectedValues={selectedValues}
      onChange={onChange}
      allowEmpty={allowEmpty}
      singleSelection
      className={className}
      data-testid={testId}
    />
  );
}
