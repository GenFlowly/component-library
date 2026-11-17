import React from 'react';
import KnowledgeStrip, {
  KnowledgeItem,
} from '../KnowledgeStrip/KnowledgeStrip';
import InfoDrawer from '../InfoDrawer/InfoDrawer';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './SettingsPageLayout.module.scss';

export interface SettingsPageLayoutStrings {
  /** Name of the knowledge list and the drawer's title, e.g. "About this page". */
  aboutTitle: string;
  /** The breadcrumb's accessible name. */
  breadcrumbLabel: string;
  closeLabel: string;
  /** Last line of the phone drawer, e.g. how to open it again. */
  drawerHint?: string;
}

export interface SettingsPageLayoutProps {
  title: string;
  /** The section the page belongs to, shown in the breadcrumb ("Profile"). */
  section?: string;
  /** Status pill(s) next to the title, e.g. "2 set". */
  status?: React.ReactNode;
  /** The page's knowledge cards: a strip on desktop, the info drawer on phones. */
  knowledge?: KnowledgeItem[];
  /**
   * Phone layout: no breadcrumb or title block (the mobile header shows the
   * title) and the knowledge cards move into the info drawer.
   */
  narrow?: boolean;
  /** Whether the phone's info drawer is open. */
  infoOpen?: boolean;
  onInfoClose?: () => void;
  strings: SettingsPageLayoutStrings;
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * The frame of every settings page: breadcrumb, title with status, the
 * knowledge strip, then the page's cards. On phones it is only the cards,
 * with the knowledge in a drawer the header's info button opens.
 */
export default function SettingsPageLayout({
  title,
  section,
  status,
  knowledge = [],
  narrow = false,
  infoOpen = false,
  onInfoClose,
  strings,
  children,
  'data-testid': testId,
}: SettingsPageLayoutProps): React.ReactElement {
  if (narrow) {
    return (
      <div className={styles.narrow} data-testid={testId}>
        {children}
        {knowledge.length > 0 && (
          <InfoDrawer
            open={infoOpen}
            onClose={() => onInfoClose?.()}
            title={strings.aboutTitle}
            subtitle={title}
            items={knowledge}
            hint={strings.drawerHint}
            closeLabel={strings.closeLabel}
            data-testid={testId ? `${testId}-info` : 'settings-info-drawer'}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid={testId}>
      <nav className={styles.breadcrumb} aria-label={strings.breadcrumbLabel}>
        {section && (
          <>
            <span className={styles.crumb}>{section}</span>
            <Icon
              src={ICONS.ALT_ARROW_RIGHT}
              size={12}
              className={styles.separator}
            />
          </>
        )}
        <span className={styles.current} aria-current="page">
          {title}
        </span>
      </nav>
      <div className={styles.content}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {status}
        </div>
        <KnowledgeStrip items={knowledge} aria-label={strings.aboutTitle} />
        {children}
      </div>
    </div>
  );
}
