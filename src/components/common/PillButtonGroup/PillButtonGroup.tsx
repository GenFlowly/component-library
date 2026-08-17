import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import styles from './PillButtonGroup.module.scss';

/**
 * A single option in a button group (used by PillButtonGroup and its
 * RadioButtonGroup / CheckboxButtonGroup presets).
 */
export interface ToggleOption {
  /** Unique identifier for the option; this is the value reported in `selectedValues`. */
  id: string;
  /** Visible text of the button, also used in the localized aria-label. */
  label: string;
  /** Optional icon source rendered at 16px before the label. */
  icon?: string;
}

interface PillButtonGroupProps {
  /** Options to render, in order. If the array is empty (or missing), the group renders nothing. */
  options: ToggleOption[];
  /** Currently selected option ids (controlled). Order matters when `replaceOldestAtMax` is on — the first entry is the oldest. */
  selectedValues: string[];
  /** Called with the next selection whenever a click changes it. Not called for no-op clicks (e.g. deselecting the last item when `allowEmpty` is false). */
  onChange: (selectedValues: string[]) => void;
  /**
   * Whether the selection may become empty. When false, clicking the last
   * selected button does nothing.
   * @default false
   */
  allowEmpty?: boolean;
  /**
   * Radio-style mode: selecting an option replaces the whole selection, so
   * at most one option is active.
   * @default false
   */
  singleSelection?: boolean;
  /** Maximum number of simultaneously selected options (multi-select mode). Unlimited when undefined. */
  maxSelection?: number;
  // When the max is reached, selecting a new option drops the oldest
  // selection instead of disabling the remaining buttons
  /**
   * FIFO eviction at the `maxSelection` cap (see comment above). Without it,
   * unselected buttons are disabled while the cap is reached.
   * @default false
   */
  replaceOldestAtMax?: boolean;
  /** Extra class name(s) appended to the group's wrapper `<div>`. */
  className?: string;
  /**
   * Accessible name for the group, announced by screen readers before the
   * options (e.g. "AI vendors"). Strongly recommended so users know what
   * the toggles control.
   */
  'aria-label'?: string;
  /** Test id for the wrapper `<div>`; each button gets an `-option-<id>` suffixed id (and `-option-<id>-icon` for its icon). */
  'data-testid'?: string;
}

/**
 * A controlled row of pill-style toggle buttons — the base of the button
 * group family (RadioButtonGroup and CheckboxButtonGroup are thin presets of
 * it). Use it directly for unlimited multi-select or custom cap behavior;
 * selection state always lives in the parent via
 * `selectedValues`/`onChange`. Button aria-labels are localized via
 * react-i18next (`common.pillButtonGroup.toggleOption`).
 */
export default function PillButtonGroup({
  options,
  selectedValues,
  onChange,
  allowEmpty = false,
  singleSelection = false,
  maxSelection,
  replaceOldestAtMax = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': testId,
}: PillButtonGroupProps): React.ReactElement {
  const { t } = useTranslation();

  const handleToggle = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    let newSelection: string[];

    if (singleSelection) {
      // Single selection mode logic
      if (isSelected) {
        // If clicking already selected item
        if (!allowEmpty) {
          // If empty not allowed, keep it selected (no change)
          return;
        }
        // If empty allowed, deselect it
        newSelection = [];
      } else {
        // Select the new item, replace others
        newSelection = [optionId];
      }
    } else {
      // Multi-selection mode logic (default)
      if (isSelected) {
        newSelection = selectedValues.filter(id => id !== optionId);
      } else if (
        replaceOldestAtMax &&
        maxSelection !== undefined &&
        selectedValues.length >= maxSelection
      ) {
        // At capacity: drop the oldest selection to make room
        newSelection = [
          ...selectedValues.slice(selectedValues.length - (maxSelection - 1)),
          optionId,
        ];
      } else {
        newSelection = [...selectedValues, optionId];
      }
    }

    // Visualize logic: if emptying is not allowed and new selection is empty, revert (do nothing)
    if (!allowEmpty && newSelection.length === 0) {
      return;
    }

    onChange(newSelection);
  };

  if (!options || options.length === 0) return <></>;

  return (
    <div
      className={`${styles.toggleGroup} ${className}`}
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {options.map(option => {
        const isActive = selectedValues.includes(option.id);
        const isMaxReached =
          maxSelection !== undefined && selectedValues.length >= maxSelection;
        const isDisabled = !isActive && isMaxReached && !replaceOldestAtMax;

        return (
          <button
            key={option.id}
            className={`${styles.toggleButton} ${isActive ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
            onClick={() => !isDisabled && handleToggle(option.id)}
            type="button"
            aria-pressed={isActive}
            aria-label={t('common.pillButtonGroup.toggleOption', {
              label: option.label,
            })}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            data-testid={testId ? `${testId}-option-${option.id}` : undefined}
          >
            {option.icon && (
              <Icon
                src={option.icon}
                size={16}
                aria-hidden={true}
                data-testid={
                  testId ? `${testId}-option-${option.id}-icon` : undefined
                }
              />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
