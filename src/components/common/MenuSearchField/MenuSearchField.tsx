import React from 'react';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './MenuSearchField.module.scss';

export interface MenuSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name of the clear button. */
  clearLabel: string;
  'data-testid'?: string;
}

/**
 * The search pill at the bottom of a mobile menu, within thumb reach. It only
 * reports the text; what gets searched stays with the caller.
 */
export default function MenuSearchField({
  value,
  onChange,
  placeholder,
  clearLabel,
  'data-testid': testId,
}: MenuSearchFieldProps): React.ReactElement {
  return (
    <div className={styles.field}>
      <Icon src={ICONS.SEARCH} size={18} className={styles.searchIcon} />
      <input
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        autoCorrect="off"
        enterKeyHint="search"
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        data-testid={testId}
      />
      {value !== '' && (
        <button
          type="button"
          className={styles.clear}
          aria-label={clearLabel}
          onClick={() => onChange('')}
          data-testid={testId ? `${testId}-clear` : undefined}
        >
          <Icon src={ICONS.CLOSE} size={16} />
        </button>
      )}
    </div>
  );
}
