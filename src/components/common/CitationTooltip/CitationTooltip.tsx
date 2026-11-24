import React from 'react';
import { useTranslation } from 'react-i18next';
import Tooltip from '../Tooltip/Tooltip';
import SourceRow from '../../widgets/ActivityPanel/SourceRow';
import type { WebSource } from '../../widgets/ConversationWidget/conversation.models';
import styles from './CitationTooltip.module.scss';

export interface CitationTooltipProps {
  /** The sources the trigger stands for: one for a citation, several for a "+N" chip. */
  sources: WebSource[];
  /** How many times the answer cites each source, by source index. */
  citeCounts?: ReadonlyMap<number, number>;
  /** The trigger, usually a CitationChip. */
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * The library Tooltip, opened from a citation: each source as the thinking
 * panel lists it (site icon, title, then domain · date · how often it is
 * cited). Hover shows it; a click or tap keeps it open; its title opens the
 * page.
 */
export default function CitationTooltip({
  sources,
  citeCounts,
  children,
  'data-testid': testId,
}: CitationTooltipProps) {
  const { t } = useTranslation();

  const content = (
    <ul className={styles.sources} data-testid={testId && `${testId}-sources`}>
      {sources.map(source => {
        const count = citeCounts?.get(source.index);
        return (
          <SourceRow
            key={source.index}
            source={source}
            variant="ledger"
            meta={
              count ? t('common.citation.citedTimes', { count }) : undefined
            }
            data-testid="citation-source"
          />
        );
      })}
    </ul>
  );

  return (
    <Tooltip
      as="span"
      variant="card"
      interactive
      openOnClick
      prefer="vertical"
      content={content}
      data-testid={testId}
    >
      {children}
    </Tooltip>
  );
}
