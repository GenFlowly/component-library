import React from 'react';
import { useTranslation } from 'react-i18next';
import StatTile from '../../common/StatTile/StatTile';
import { Grid, GridCol } from '../../common/Grid/Grid';
import { ActivityView } from './activity.reduce';
import { formatDuration, phaseLabel } from './activity.format';
import styles from './ActivityPanel.module.scss';

/** The turn's numbers at a glance and where its time went; ticks while live. */
export default function ActivityReceipt({ view }: { view: ActivityView }) {
  const { t } = useTranslation();
  const { searches, sources, memories } = view;
  const totalPhaseMs = view.phases.reduce((sum, p) => sum + p.ms, 0);

  const searchesValue =
    searches.max != null
      ? t('conversation.activity.tile.searchesOf', {
          used: searches.used,
          max: searches.max,
        })
      : String(searches.used);
  const sourcesSub =
    sources.found === 0
      ? undefined
      : sources.cited != null
        ? t('conversation.activity.tile.sourcesCited', { count: sources.cited })
        : view.status === 'live'
          ? t('conversation.activity.tile.sourcesPending')
          : undefined;
  const memoriesSub =
    memories.recalled > 0
      ? t('conversation.activity.tile.memoriesSplit', memories)
      : undefined;

  const barLabel = t('conversation.activity.phase.barLabel', {
    parts: view.phases
      .map(p => `${phaseLabel(t, p.id, view)} ${formatDuration(p.ms)}`)
      .join(', '),
  });

  return (
    <div className={styles.receipt} data-testid="activity-receipt">
      <Grid gap="sm">
        <GridCol span={6} md={3}>
          <StatTile
            className={styles.tile}
            label={t('conversation.activity.tile.time')}
            value={formatDuration(view.totalMs) || '–'}
            data-testid="activity-tile-time"
          />
        </GridCol>
        <GridCol span={6} md={3}>
          <StatTile
            className={styles.tile}
            label={t('conversation.activity.tile.searches')}
            value={searchesValue}
            data-testid="activity-tile-searches"
          />
        </GridCol>
        <GridCol span={6} md={3}>
          <StatTile
            className={styles.tile}
            label={t('conversation.activity.tile.sources')}
            value={String(sources.found)}
            sub={sourcesSub}
            data-testid="activity-tile-sources"
          />
        </GridCol>
        <GridCol span={6} md={3}>
          <StatTile
            className={styles.tile}
            label={t('conversation.activity.tile.memories')}
            value={String(memories.core + memories.recalled)}
            sub={memoriesSub}
            data-testid="activity-tile-memories"
          />
        </GridCol>
      </Grid>
      {view.phases.length > 0 && totalPhaseMs > 0 && (
        <>
          <div
            className={styles.phaseBar}
            role="img"
            aria-label={barLabel}
            data-testid="activity-phase-bar"
          >
            {view.phases.map(phase => (
              <div
                key={phase.id}
                className={`${styles.phaseSegment} ${styles[`phase-${phase.id}`]} ${
                  phase.running ? styles.phaseRunning : ''
                }`}
                style={{ flexGrow: phase.ms, flexBasis: 0 }}
                data-testid={`activity-phase-${phase.id}`}
              />
            ))}
          </div>
          <ul className={styles.legend} aria-hidden="true">
            {view.phases.map(phase => (
              <li key={phase.id}>
                <span
                  className={`${styles.legendSwatch} ${styles[`phase-${phase.id}`]}`}
                />
                {phaseLabel(t, phase.id, view)}
                <span className={styles.legendValue}>
                  {formatDuration(phase.ms)}
                  {phase.running ? '…' : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
