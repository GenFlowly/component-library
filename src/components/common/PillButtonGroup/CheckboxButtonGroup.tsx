import React from 'react';
import PillButtonGroup, { ToggleOption } from './PillButtonGroup';

interface CheckboxButtonGroupProps {
  options: ToggleOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  maxSelection: number;
  allowEmpty?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * Checkbox-style view of PillButtonGroup: options toggle independently
 * and other selected buttons are left alone until maxSelection is reached —
 * from then on, selecting a new option drops the oldest selection.
 */
export default function CheckboxButtonGroup({
  options,
  selectedValues,
  onChange,
  maxSelection,
  allowEmpty = false,
  className = '',
  'data-testid': testId,
}: CheckboxButtonGroupProps): React.ReactElement {
  return (
    <PillButtonGroup
      options={options}
      selectedValues={selectedValues}
      onChange={onChange}
      allowEmpty={allowEmpty}
      maxSelection={maxSelection}
      replaceOldestAtMax
      className={className}
      data-testid={testId}
    />
  );
}
