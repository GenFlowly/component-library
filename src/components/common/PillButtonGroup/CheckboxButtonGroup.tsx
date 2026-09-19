import React from 'react';
import PillButtonGroup, { ToggleOption } from './PillButtonGroup';

interface CheckboxButtonGroupProps {
  /** Options to render, in order (see `ToggleOption`: `{ id, label, icon? }`). */
  options: ToggleOption[];
  /** Currently selected option ids (controlled). The first entry is the oldest and is evicted first at the cap. */
  selectedValues: string[];
  /** Called with the next selection whenever a click changes it. */
  onChange: (selectedValues: string[]) => void;
  /** Maximum number of simultaneously selected options. Required — the FIFO eviction behavior needs a cap. */
  maxSelection: number;
  /**
   * Whether the selection may become empty. When false, deselecting the last
   * selected button does nothing.
   * @default false
   */
  allowEmpty?: boolean;
  /**
   * Render a checkbox inside each pill, reflecting its selected state
   * (forwarded to PillButtonGroup).
   * @default false
   */
  showCheckbox?: boolean;
  /** Extra class name(s) forwarded to the underlying PillButtonGroup wrapper. */
  className?: string;
  /** Accessible name for the group, forwarded to the underlying PillButtonGroup wrapper (announced by screen readers before the options). */
  'aria-label'?: string;
  /** Test id forwarded to the underlying PillButtonGroup wrapper. */
  'data-testid'?: string;
}

/**
 * Checkbox-style view of PillButtonGroup: options toggle independently
 * and other selected buttons are left alone until maxSelection is reached —
 * from then on, selecting a new option drops the oldest selection.
 *
 * This is a thin preset over PillButtonGroup (it forces `replaceOldestAtMax`
 * and makes `maxSelection` required). Use it for capped multi-select where
 * the newest pick wins; see the ButtonGroups About page for the full family.
 */
export default function CheckboxButtonGroup({
  options,
  selectedValues,
  onChange,
  maxSelection,
  allowEmpty = false,
  showCheckbox = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: CheckboxButtonGroupProps): React.ReactElement {
  return (
    <PillButtonGroup
      options={options}
      selectedValues={selectedValues}
      onChange={onChange}
      allowEmpty={allowEmpty}
      maxSelection={maxSelection}
      showCheckbox={showCheckbox}
      replaceOldestAtMax
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
    />
  );
}
