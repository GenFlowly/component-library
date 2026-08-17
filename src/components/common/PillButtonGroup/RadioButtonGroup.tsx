import React from 'react';
import PillButtonGroup, { ToggleOption } from './PillButtonGroup';

interface RadioButtonGroupProps {
  options: ToggleOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  allowEmpty?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Radio-style view of PillButtonGroup: selecting a button toggles any
 * other selected button off, so at most one option is selected.
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
