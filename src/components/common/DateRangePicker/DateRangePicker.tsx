import React from 'react';
import RadioButtonGroup from '../PillButtonGroup/RadioButtonGroup';
import styles from './DateRangePicker.module.scss';

export interface DateRange {
  /** Inclusive start date, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive end date, `YYYY-MM-DD`. */
  to: string;
}

export interface DateRangePreset {
  /** Unique id, also used as the underlying RadioButtonGroup option id. */
  id: string;
  /** Pre-localized label — this component has no i18n of its own. */
  label: string;
  /** Trailing window length including today (e.g. 30 → today and the 29 days before it). */
  days: number;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** @default last 7/30/90 days, English labels — pass localized presets from the consuming app. */
  presets?: DateRangePreset[];
  /** Accessible label for the "from" input. @default 'From' */
  fromLabel?: string;
  /** Accessible label for the "to" input. @default 'To' */
  toLabel?: string;
  /** Accessible group label for the preset pills. */
  presetsAriaLabel?: string;
  /**
   * Latest selectable date, `YYYY-MM-DD`. @default today (usage data never
   * has a meaningful future range).
   */
  maxDate?: string;
  /**
   * 'toolbar': one compact row (segmented presets, then label-prefixed From
   * and To fields) that stacks when its container is under 480px, for a
   * settings card. @default 'default'
   */
  variant?: 'default' | 'toolbar';
  className?: string;
  'data-testid'?: string;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

/** Inclusive trailing window of `days` ending on `endIso` (itself included). */
function trailingRange(days: number, endIso: string): DateRange {
  const end = new Date(`${endIso}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { from: toIsoDate(start), to: endIso };
}

export const DEFAULT_DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

/**
 * A preset pill row (Last 7/30/90 days, etc.) plus two date inputs for a
 * fully custom range. Controlled: the parent owns `value` and receives every
 * change via `onChange` — there is no internal date math kept as state.
 */
export default function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_DATE_RANGE_PRESETS,
  fromLabel = 'From',
  toLabel = 'To',
  presetsAriaLabel,
  maxDate,
  variant = 'default',
  className = '',
  'data-testid': testId,
}: DateRangePickerProps): React.ReactElement {
  const effectiveMax = maxDate ?? todayIso();

  // A preset is "active" only when the current value is exactly the range it
  // computes today — editing either date field falls through to "custom"
  // (no pill highlighted), which is the correct and simplest mental model.
  const activePresetId =
    presets.find(p => {
      const computed = trailingRange(p.days, effectiveMax);
      return computed.from === value.from && computed.to === value.to;
    })?.id ?? null;

  const handlePresetChange = (selected: string[]) => {
    const presetId = selected[0];
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    onChange(trailingRange(preset.days, effectiveMax));
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFrom = e.target.value;
    if (!nextFrom) return;
    // Keep the range coherent: "from" can never land after "to".
    onChange({ from: nextFrom, to: nextFrom > value.to ? nextFrom : value.to });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTo = e.target.value;
    if (!nextTo) return;
    onChange({ from: nextTo < value.from ? nextTo : value.from, to: nextTo });
  };

  if (variant === 'toolbar') {
    return (
      <div className={`${styles.toolbar} ${className}`} data-testid={testId}>
        {presets.length > 0 && (
          <div
            role="group"
            aria-label={presetsAriaLabel}
            className={styles.segmented}
            data-testid={testId ? `${testId}-presets` : undefined}
          >
            {presets.map(preset => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={preset.id === activePresetId}
                className={preset.id === activePresetId ? styles.segmentOn : ''}
                onClick={() => handlePresetChange([preset.id])}
                data-testid={
                  testId ? `${testId}-preset-${preset.id}` : undefined
                }
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <span className={styles.spacer} aria-hidden="true" />
        <label className={styles.prefixedField}>
          <span className={styles.prefix}>{fromLabel}</span>
          <input
            type="date"
            className={styles.prefixedInput}
            value={value.from}
            max={value.to}
            onChange={handleFromChange}
            data-testid={testId ? `${testId}-from` : undefined}
          />
        </label>
        <label className={styles.prefixedField}>
          <span className={styles.prefix}>{toLabel}</span>
          <input
            type="date"
            className={styles.prefixedInput}
            value={value.to}
            min={value.from}
            max={effectiveMax}
            onChange={handleToChange}
            data-testid={testId ? `${testId}-to` : undefined}
          />
        </label>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} data-testid={testId}>
      {presets.length > 0 && (
        <RadioButtonGroup
          options={presets.map(p => ({ id: p.id, label: p.label }))}
          selectedValues={activePresetId ? [activePresetId] : []}
          onChange={handlePresetChange}
          allowEmpty
          className={styles.presets}
          aria-label={presetsAriaLabel}
          data-testid={testId ? `${testId}-presets` : undefined}
        />
      )}
      <div className={styles.customRange}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{fromLabel}</span>
          <input
            type="date"
            className={styles.dateInput}
            value={value.from}
            max={value.to}
            onChange={handleFromChange}
            data-testid={testId ? `${testId}-from` : undefined}
          />
        </label>
        <span className={styles.separator} aria-hidden="true">
          &ndash;
        </span>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{toLabel}</span>
          <input
            type="date"
            className={styles.dateInput}
            value={value.to}
            min={value.from}
            max={effectiveMax}
            onChange={handleToChange}
            data-testid={testId ? `${testId}-to` : undefined}
          />
        </label>
      </div>
    </div>
  );
}
