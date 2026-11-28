import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import { ActivitySource } from './activity.models';
import { isTrainingSource } from '../ConversationWidget/conversation.models';
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
 * load. Loaded straight from the site without a referrer. A source cited from
 * the model's own knowledge has no site and shows the thinking icon.
 */
export function SiteIcon({
  url,
  favicon,
  origin,
}: {
  url: string;
  favicon?: string;
  origin?: ActivitySource['origin'];
}) {
  const [failed, setFailed] = useState(false);
  if (isTrainingSource({ origin })) {
    return (
      <Brain
        className={styles.siteIcon}
        size={16}
        aria-hidden="true"
        data-testid="activity-training-icon"
      />
    );
  }
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
  const training = isTrainingSource(source);
  const domain = training
    ? t('conversation.activity.evidence.training')
    : domainOf(source.url);
  const date = formatSourceDate(source.published_date, i18n?.language);
  const title = source.title || source.url;
  // A source with no page names it without a link.
  const link = (
    className: string,
    linkTitle: string,
    children: React.ReactNode
  ) =>
    training ? (
      <span className={className} title={linkTitle}>
        {children}
      </span>
    ) : (
      <a
        className={className}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        title={linkTitle}
      >
        {children}
      </a>
    );
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
        {cited === true &&
          (training ? (
            <span
              className={styles.indexBadge}
              aria-label={t('conversation.activity.evidence.citedBadge', {
                index: source.index,
              })}
            >
              [{source.index}]
            </span>
          ) : (
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
          ))}
        <SiteIcon
          url={source.url}
          favicon={source.favicon}
          origin={source.origin}
        />
        <span className={styles.sourceStack}>
          {link(styles.sourceTitle, training ? title : source.url, title)}
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
      <SiteIcon
        url={source.url}
        favicon={source.favicon}
        origin={source.origin}
      />
      <span className={styles.sourceDomain}>{domain}</span>
      {link(styles.sourceTitle, date ? `${title} · ${date}` : title, title)}
      {badge}
    </li>
  );
}
