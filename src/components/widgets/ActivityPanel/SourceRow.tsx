import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivitySource } from './activity.models';
import {
  domainOf,
  formatSourceDate,
  monogramOf,
  usableFavicon,
} from './activity.format';
import styles from './ActivityPanel.module.scss';

export interface SourceRowProps {
  source: ActivitySource;
  /** true / false once the answer exists; null while the turn runs. */
  cited?: boolean | null;
  /** 'compact': one line under a query in the story; 'ledger': two lines in the evidence view. */
  variant?: 'compact' | 'ledger';
  /** Extra text on the ledger's second line, e.g. which query found it. */
  meta?: string;
  'data-testid'?: string;
}

/**
 * The site's own icon, or its first letter when there is none or it fails to
 * load. Loaded straight from the site without a referrer.
 */
export function SiteIcon({ url, favicon }: { url: string; favicon?: string }) {
  const [failed, setFailed] = useState(false);
  const src = usableFavicon(favicon);
  const domain = domainOf(url);
  if (src && !failed) {
    return (
      <img
        className={styles.siteIcon}
        src={src}
        alt=""
        width={16}
        height={16}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        data-testid="activity-site-icon"
      />
    );
  }
  return (
    <span
      className={`${styles.siteIcon} ${styles.monogram}`}
      aria-hidden="true"
      data-testid="activity-site-monogram"
    >
      {monogramOf(domain)}
    </span>
  );
}

/** One source: where it came from, what it is, when it was published, whether the answer cites it. */
export default function SourceRow({
  source,
  cited = null,
  variant = 'compact',
  meta,
  'data-testid': testId = 'activity-source',
}: SourceRowProps) {
  const { t, i18n } = useTranslation();
  const domain = domainOf(source.url);
  const date = formatSourceDate(source.published_date, i18n?.language);
  const title = source.title || source.url;
  const badge =
    cited === true ? (
      <span className={styles.citedBadge}>
        {t('conversation.activity.evidence.citedBadge', {
          index: source.index,
        })}
      </span>
    ) : null;

  if (variant === 'ledger') {
    const line = [domain, date, meta].filter(Boolean).join(' · ');
    return (
      <li
        className={`${styles.source} ${styles.sourceLarge}`}
        data-testid={testId}
        data-cited={cited === null ? undefined : String(cited)}
      >
        {cited === true && (
          <a
            className={styles.indexBadge}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('conversation.activity.evidence.citedBadge', {
              index: source.index,
            })}
          >
            [{source.index}]
          </a>
        )}
        <SiteIcon url={source.url} favicon={source.favicon} />
        <span className={styles.sourceStack}>
          <a
            className={styles.sourceTitle}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.url}
          >
            {title}
          </a>
          <span className={styles.sourceMeta}>{line}</span>
        </span>
      </li>
    );
  }

  return (
    <li
      className={`${styles.source} ${cited === false ? styles.notCited : ''}`}
      data-testid={testId}
      data-cited={cited === null ? undefined : String(cited)}
    >
      <SiteIcon url={source.url} favicon={source.favicon} />
      <span className={styles.sourceDomain}>{domain}</span>
      <a
        className={styles.sourceTitle}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        title={date ? `${title} · ${date}` : title}
      >
        {title}
      </a>
      {badge}
    </li>
  );
}
