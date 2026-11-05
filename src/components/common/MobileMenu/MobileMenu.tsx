import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import PillButton from '../PillButton/PillButton';
import styles from './MobileMenu.module.scss';

export interface MobileMenuAction {
  label: string;
  /** Icon source rendered before the label. */
  icon?: string;
  onClick: () => void;
  'data-testid'?: string;
}

export interface MobileMenuProps {
  /**
   * Accessible name of the menu (e.g. "History", "Saved Notes"). The top bar
   * shows `action` instead of a visible title.
   */
  title?: string;
  /** The page's create action, centered in the top bar. */
  action?: MobileMenuAction;
  /** Opens the app-wide menu, which the consuming app owns. */
  onOpenAppMenu: () => void;
  /** Page-context content (conversation history, saved notes, ...). */
  children: React.ReactNode;
  onClose: () => void;
  'data-testid'?: string;
}

/**
 * 📱 Full-screen mobile menu of a page's context (history, saved notes, ...).
 * Its hamburger leads to the app-wide menu, its close button to the page.
 */
export default function MobileMenu({
  title,
  action,
  onOpenAppMenu,
  children,
  onClose,
  'data-testid': testId,
}: MobileMenuProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className={styles.mobileMenu}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId || 'mobile-menu'}
    >
      <div className={styles.header}>
        <button
          onClick={onOpenAppMenu}
          className={styles.iconButton}
          aria-label={t('layout.mobileMenu.menu')}
          data-testid="mobile-menu-app-toggle"
        >
          <Icon src={ICONS.MENU} size={20} />
        </button>
        <div className={styles.actionSlot}>
          {action && (
            <PillButton
              label={action.label}
              icon={action.icon}
              className={styles.actionPill}
              onClick={action.onClick}
              data-testid={action['data-testid']}
            />
          )}
        </div>
        <button
          onClick={onClose}
          className={styles.iconButton}
          aria-label={t('layout.mobileMenu.close')}
          data-testid="mobile-menu-close"
        >
          <Icon src={ICONS.CLOSE} size={20} />
        </button>
      </div>

      <div className={styles.content} data-testid="mobile-menu-content">
        {children}
      </div>
    </div>
  );
}
