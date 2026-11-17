import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './InputSelectWithHint.module.scss';
import { Icon } from '../Icon/Icon';

export interface SelectOption {
  /** Visible text of the option. */
  label: string;
  /** Value reported through `onChange` when the option is selected. */
  value: string;
  /**
   * Marks a call-to-action option: selecting it fires `ctaAction` INSTEAD of
   * `onChange`, and the select keeps its previous value. Use for entries like
   * "+ Create new…" that open a flow rather than pick a value.
   */
  isCta?: boolean;
  /** Callback fired when this option is chosen and `isCta` is true. */
  ctaAction?: () => void;
  /** Inline style for the `<option>` (CTA options default to bold blue). */
  style?: React.CSSProperties;
  /** Renders the `<option>` disabled. */
  disabled?: boolean;
}

interface InputSelectWithHintProps {
  /** Label text shown in the prefix area before the select. */
  hint: string;
  /** Optional icon source rendered before the hint text (decorative). */
  icon?: string;
  /** Currently selected value (controlled). Empty/undefined shows the placeholder. */
  value?: string;
  /** Called with the newly selected value (not called for CTA options). */
  onChange?: (value: string) => void;
  /** Options to render; see `SelectOption` for CTA and disabled entries. */
  options: SelectOption[];
  /** Extra class name(s) for the container. */
  className?: string;
  /** Placeholder shown while no value is selected. Defaults to a localized "Select an option". */
  placeholder?: string;
  /**
   * Collapse the prefix to just the icon at mobile widths (max-width 768px),
   * hiding the hint text. Requires `icon` to be set — without one the prefix
   * would collapse to nothing, so the flag is ignored.
   * @default false
   */
  iconOnlyHintOnMobile?: boolean;
  /**
   * 'stacked' puts the label above the value, for phone-width forms where a
   * side label would squeeze the value.
   * @default 'inline'
   */
  layout?: 'inline' | 'stacked';
  /** Base test id: applied to the `<select>`; container, icon, hint, placeholder and options get suffixed ids. */
  'data-testid'?: string;
}

/**
 * A `<select>` with a labeled prefix area (hint text + optional icon), used
 * for compact labeled dropdowns like language, persona or version pickers.
 * Fully controlled via `value`/`onChange`; supports CTA options that trigger
 * an action instead of selecting, and can collapse its hint to just the icon
 * on mobile.
 */
export const InputSelectWithHint: React.FC<InputSelectWithHintProps> = ({
  hint,
  icon,
  value,
  onChange,
  options,
  className = '',
  placeholder,
  iconOnlyHintOnMobile = false,
  layout = 'inline',
  'data-testid': testId,
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder =
    placeholder ?? t('common.inputSelectWithHint.placeholder');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const selectedOption = options.find(opt => opt.value === newValue);

    if (selectedOption?.isCta) {
      selectedOption.ctaAction?.();
      return;
    }

    onChange?.(newValue);
  };

  return (
    <div
      className={`${styles.container} ${iconOnlyHintOnMobile && icon ? styles.iconOnlyHintOnMobile : ''} ${layout === 'stacked' ? styles.stacked : ''} ${className}`}
      data-testid={testId ? `${testId}-container` : undefined}
    >
      <div className={styles.prefixArea}>
        {icon && (
          <Icon
            src={icon}
            size={16}
            className={styles.icon}
            data-testid={testId ? `${testId}-icon` : undefined}
          />
        )}
        <span
          className={styles.hintText}
          data-testid={testId ? `${testId}-hint` : undefined}
        >
          {hint}
        </span>
      </div>
      <select
        className={styles.inputElement}
        value={value || ''}
        onChange={handleSelectChange}
        data-testid={testId}
      >
        <option
          value=""
          disabled
          data-testid={testId ? `${testId}-placeholder` : undefined}
        >
          {resolvedPlaceholder}
        </option>
        {options.map(opt => (
          <option
            key={opt.value}
            value={opt.value}
            style={
              opt.style ||
              (opt.isCta ? { fontWeight: 'bold', color: 'blue' } : undefined)
            }
            disabled={opt.disabled}
            data-testid={testId ? `${testId}-option-${opt.value}` : undefined}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
