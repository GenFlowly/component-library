import React from 'react';
import styles from './InstructionTile.module.scss';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import Tooltip from '../Tooltip/Tooltip';

// Characters of the detail text shown before the ellipsis
const DETAIL_PREVIEW_LENGTH = 140;

export interface InstructionTileOwner {
  /** Username shown in the avatar's hover tooltip. */
  name: string;
  /** Avatar image URL; falls back to a generic user icon. */
  avatarUrl?: string;
}

export interface InstructionTileProps {
  title: string;
  /** Body text; only the first 140 characters are shown, ellipsized. */
  detail: string;
  /** Emoji/icon shown before the title. */
  icon?: string;
  /** Hue of the tile, rendered as an accent bar along the top edge. */
  color?: string;
  tags?: string[];
  version?: number;
  /** Creator of the instruction; avatar with the username on hover. */
  owner?: InstructionTileOwner;
  onClick?: () => void;
  'data-testid'?: string;
}

/**
 * Card summarizing an instruction: color accent, icon and title, a
 * 140-character detail preview, tag chips, and a footer with the owner's
 * avatar (username on hover) and the version badge. Styled entirely from
 * theme tokens so it renders consistently in light and dark mode.
 */
export default function InstructionTile({
  title,
  detail,
  icon,
  color,
  tags,
  version,
  owner,
  onClick,
  'data-testid': testId,
}: InstructionTileProps): React.ReactElement {
  const preview =
    detail && detail.length > DETAIL_PREVIEW_LENGTH
      ? `${detail.substring(0, DETAIL_PREVIEW_LENGTH)}…`
      : detail || '';

  return (
    <div
      className={styles.tile}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      data-testid={testId}
    >
      <div
        className={styles.accent}
        style={color ? { backgroundColor: color } : undefined}
        data-testid={testId ? `${testId}-accent` : undefined}
      />

      <div className={styles.header}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <h3 className={styles.title} title={title}>
          {title}
        </h3>
      </div>

      <div className={styles.detail}>{preview}</div>

      {!!tags?.length && (
        <div className={styles.tags}>
          {tags.map(tag => (
            <span key={tag} className={styles.tagChip}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        {owner ? (
          <Tooltip content={owner.name} position="top">
            <span
              className={styles.avatar}
              data-testid={testId ? `${testId}-owner` : undefined}
            >
              {owner.avatarUrl ? (
                <img
                  src={owner.avatarUrl}
                  alt={owner.name}
                  className={styles.avatarImage}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Icon src={ICONS.USER_CIRCLE} size={24} aria-hidden={true} />
              )}
            </span>
          </Tooltip>
        ) : (
          <span />
        )}
        {version !== undefined && (
          <span className={styles.version}>v{version}</span>
        )}
      </div>
    </div>
  );
}
