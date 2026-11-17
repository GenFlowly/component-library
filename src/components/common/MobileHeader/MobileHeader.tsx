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
  /** Second line under the title (e.g. the loaded instruction persona). */
  subtitle?: React.ReactNode;
  /** Makes the subtitle tappable (e.g. to open an instruction picker). */
  onSubtitleClick?: () => void;
  /** Makes the title tappable, with a chevron (e.g. to open an outline sheet). */
  onTitleClick?: () => void;
  /** Accessible name of the tappable title; defaults to the title itself. */
  titleActionLabel?: string;
  /** What the title opens is showing: the chevron turns up. */
  titleExpanded?: boolean;
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
  onSubtitleClick,
  onTitleClick,
  titleActionLabel,
  titleExpanded = false,
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
          <div className={styles.centerPill}>
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className={styles.titleButton}
                aria-label={titleActionLabel}
                aria-haspopup="dialog"
                aria-expanded={titleExpanded}
                data-testid="mobile-header-title"
              >
                <span className={styles.title} title={title}>
                  {title}
                </span>
                <Icon
                  src={ICONS.ALT_ARROW_RIGHT}
                  size={12}
                  className={`${styles.titleChevron} ${titleExpanded ? styles.titleChevronUp : ''}`}
                />
              </button>
            ) : (
              <span className={styles.title} title={title}>
                {title}
              </span>
            )}
            {subtitle != null &&
              (onSubtitleClick ? (
                <button
                  onClick={onSubtitleClick}
                  className={styles.subtitleButton}
                  data-testid="mobile-header-subtitle"
                >
                  {subtitle}
                </button>
              ) : (
                <span
                  className={styles.subtitle}
                  data-testid="mobile-header-subtitle"
                >
                  {subtitle}
                </span>
              ))}
          </div>
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
