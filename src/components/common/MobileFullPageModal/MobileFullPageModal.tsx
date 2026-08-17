import React, { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PillButton from '../PillButton/PillButton';
import styles from './MobileFullPageModal.module.scss';

interface MobileFullPageModalProps {
  children: React.ReactNode;
  onClose: () => void;
  'data-testid'?: string;
}

/**
 * Mobile view of the right sidebar: a modal rendered on the same page
 * (same URL, same React tree), so its widgets keep full access to the
 * page's contexts and can interact with the page state.
 * Covers everything below the navbar — the navbar itself stays visible.
 */
export default function MobileFullPageModal({
  children,
  onClose,
  'data-testid': testId,
}: MobileFullPageModalProps): React.ReactElement {
  const { t } = useTranslation();
  // Pin the modal directly below the navbar, whatever its rendered height is
  const [topOffset, setTopOffset] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const nav = document.querySelector('nav');
      setTopOffset(nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <div
      className={styles.mobileModal}
      style={{ top: topOffset }}
      role="dialog"
      aria-modal="true"
      aria-label={t('layout.mobileFullPageModal.aiSettings')}
      data-testid={testId || 'mobile-full-page-modal'}
    >
      <div className={styles.sidebarContent}>{children}</div>
      <div className={styles.mobileFooter}>
        <PillButton
          label={t('layout.mobileFullPageModal.closeSettings')}
          variant="secondary"
          onClick={onClose}
          className={styles.closeSettingsButton}
          data-testid="mobile-full-page-modal-close"
        />
      </div>
    </div>
  );
}
