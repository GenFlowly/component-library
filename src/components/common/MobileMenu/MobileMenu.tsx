import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './MobileMenu.module.scss';

export interface MobileMenuProps {
  /** Title of the page-context view (e.g. "History", "Saved Notes"). */
  title?: string;
  /** Title of the app-menu view (e.g. "Menu"). */
  appMenuTitle: string;
  /** App-wide navigation content — what the desktop navbar shows. */
  appMenu: React.ReactNode;
  /**
   * Page-context content (conversation history, saved notes, ...) shown as
   * the first level. Omit it to open the app menu directly.
   */
  children?: React.ReactNode;
  onClose: () => void;
  'data-testid'?: string;
}

/**
 * 📱 Two-level full-screen mobile menu. The first level is page context
 * (history, saved notes, ...); its hamburger button drills into the app menu,
 * whose back button returns to the context. Without context content the app
 * menu is the only level.
 */
export default function MobileMenu({
  title,
  appMenuTitle,
  appMenu,
  children,
  onClose,
  'data-testid': testId,
}: MobileMenuProps): React.ReactElement {
  const { t } = useTranslation();
  const hasContext = children != null;
  const [isAppMenuOpen, setAppMenuOpen] = useState(!hasContext);
  const showAppMenu = isAppMenuOpen || !hasContext;

  return (
    <div
      className={`${styles.mobileMenu} ${showAppMenu ? styles.appView : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={showAppMenu ? appMenuTitle : title}
      data-testid={testId || 'mobile-menu'}
    >
      <div className={styles.header}>
        {showAppMenu ? (
          hasContext ? (
            <button
              onClick={() => setAppMenuOpen(false)}
              className={styles.iconButton}
              aria-label={t('layout.mobileMenu.back')}
              data-testid="mobile-menu-back"
            >
              <Icon src={ICONS.ALT_ARROW_LEFT} size={20} />
            </button>
          ) : (
            // Keeps the title centered when there is nothing to go back to
            <div className={styles.iconPlaceholder} aria-hidden="true" />
          )
        ) : (
          <button
            onClick={() => setAppMenuOpen(true)}
            className={styles.iconButton}
            aria-label={t('layout.mobileMenu.menu')}
            data-testid="mobile-menu-app-toggle"
          >
            <Icon src={ICONS.MENU} size={20} />
          </button>
        )}
        <h2 className={styles.title}>{showAppMenu ? appMenuTitle : title}</h2>
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
        {showAppMenu ? appMenu : children}
      </div>
    </div>
  );
}
