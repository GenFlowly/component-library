import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './MobileHeader.module.scss';

export interface MobileHeaderMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  'data-testid'?: string;
}

/** A round icon button at the header's right end, e.g. a page's info button. */
export interface MobileHeaderTrailingAction {
  /** Icon asset URL. */
  icon: string;
  /** Accessible name of the button. */
  label: string;
  onClick: () => void;
  'data-testid'?: string;
}

export interface MobileHeaderProps {
  title: string;
  /** Second line under the title (e.g. the turn in view). */
  subtitle?: React.ReactNode;
  /**
   * Makes the whole pill one button, with a chevron at the end of its last
   * line (e.g. to open the list of a conversation's turns).
   */
  onPillClick?: () => void;
  /** Accessible name of the tappable pill; defaults to the title itself. */
  pillActionLabel?: string;
  /** What the pill opens is showing: the chevron turns up. */
  pillExpanded?: boolean;
  /** Entries of the kebab (3-dot) menu on the right; omit to hide the kebab. */
  menuItems?: MobileHeaderMenuItem[];
  /** A round icon button on the right, shown when there is no kebab menu. */
  trailingAction?: MobileHeaderTrailingAction;
  /** Fired by the hamburger button; the app decides what menu it opens. */
  onMenuClick: () => void;
  children?: React.ReactNode;
}

/**
 * 📱 Mobile replacement for a navbar + page-header band: the page content runs
 * full-screen and this renders as a transparent overlay pinned to the top —
 * hamburger on the left, title + subtitle in a translucent center pill, kebab
 * menu with the page actions on the right. Pages that render it pad their
 * mobile content down by the bar's 3.5rem height so content rests below it
 * while still scrolling underneath.
 */
export default function MobileHeader({
  title,
  subtitle,
  onPillClick,
  pillActionLabel,
  pillExpanded = false,
  menuItems = [],
  trailingAction,
  onMenuClick,
  children,
}: MobileHeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);

  // Close the kebab menu on any tap outside of it
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        kebabRef.current &&
        !kebabRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const chevron = onPillClick ? (
    <Icon
      src={ICONS.ALT_ARROW_RIGHT}
      size={12}
      className={`${styles.chevron} ${pillExpanded ? styles.chevronUp : ''}`}
    />
  ) : null;
  const pillLines = (
    <>
      <span className={styles.titleLine}>
        <span
          className={styles.title}
          title={title}
          data-testid="mobile-header-title"
        >
          {title}
        </span>
        {subtitle == null && chevron}
      </span>
      {subtitle != null && (
        <span className={styles.subtitle} data-testid="mobile-header-subtitle">
          {subtitle}
          {chevron}
        </span>
      )}
    </>
  );

  return (
    <>
      <div className={styles.header} data-testid="mobile-header">
        <button
          onClick={onMenuClick}
          className={styles.circleButton}
          aria-label={t('layout.mobileMenu.menu')}
          data-testid="mobile-header-menu-toggle"
        >
          <Icon src={ICONS.MENU} size={22} />
        </button>

        <div className={styles.center}>
          {onPillClick ? (
            <button
              type="button"
              onClick={onPillClick}
              className={`${styles.centerPill} ${styles.pillButton}`}
              aria-label={pillActionLabel ?? title}
              aria-haspopup="dialog"
              aria-expanded={pillExpanded}
              data-testid="mobile-header-pill"
            >
              {pillLines}
            </button>
          ) : (
            <div className={styles.centerPill}>{pillLines}</div>
          )}
        </div>

        {menuItems.length > 0 ? (
          <div className={styles.kebabWrapper} ref={kebabRef}>
            <button
              onClick={() => setMenuOpen(open => !open)}
              className={styles.circleButton}
              aria-label={t('layout.mobileHeader.moreActions')}
              aria-expanded={isMenuOpen}
              data-testid="mobile-header-kebab"
            >
              <Icon src={ICONS.MORE_VERTICAL} size={22} />
            </button>
            {isMenuOpen && (
              <div
                className={styles.dropdown}
                role="menu"
                data-testid="mobile-header-kebab-menu"
              >
                {menuItems.map(item => (
                  <button
                    key={item.label}
                    role="menuitem"
                    className={styles.dropdownItem}
                    disabled={item.disabled}
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    data-testid={item['data-testid']}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : trailingAction ? (
          <button
            type="button"
            onClick={trailingAction.onClick}
            className={styles.circleButton}
            aria-label={trailingAction.label}
            data-testid={
              trailingAction['data-testid'] ?? 'mobile-header-trailing'
            }
          >
            <Icon src={trailingAction.icon} size={22} />
          </button>
        ) : (
          // Keeps the center column truly centered when there is no kebab
          <div className={styles.circlePlaceholder} aria-hidden="true" />
        )}
      </div>

      {children}
    </>
  );
}
