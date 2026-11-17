import React from 'react';
import { Icon } from '../Icon/Icon';
import Tooltip from '../Tooltip/Tooltip';
import { ICONS } from '../../../constants/icons';
import styles from './MenuSearchField.module.scss';

export interface MenuSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible name and tooltip of the clear button. */
  clearLabel: string;
  /**
   * 'menu': the 44 px pill at the foot of a mobile menu. 'sidebar': a 34 px
   * field under a desktop sidebar's New Chat button. @default 'menu'
   */
  variant?: 'menu' | 'sidebar';
  'data-testid'?: string;
}

/**
 * The search pill at the bottom of a mobile menu, within thumb reach, or the
 * search field of a desktop sidebar. It only reports the text; what gets
 * searched stays with the caller.
 */
export default function MenuSearchField({
  value,
  onChange,
  placeholder,
  clearLabel,
  variant = 'menu',
  'data-testid': testId,
}: MenuSearchFieldProps): React.ReactElement {
  return (
    <div
      className={`${styles.field} ${variant === 'sidebar' ? styles.sidebar : ''}`}
    >
      <Icon
        src={ICONS.SEARCH}
        size={variant === 'sidebar' ? 16 : 18}
        className={styles.searchIcon}
      />
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
        <Tooltip content={clearLabel} position="top">
          <button
            type="button"
            className={styles.clear}
            aria-label={clearLabel}
            onClick={() => onChange('')}
            data-testid={testId ? `${testId}-clear` : undefined}
          >
            <Icon src={ICONS.CLOSE} size={16} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
