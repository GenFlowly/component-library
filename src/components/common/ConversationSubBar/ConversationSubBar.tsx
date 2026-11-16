import React, { ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import IconButton from '../IconButton/IconButton';
import Tooltip from '../Tooltip/Tooltip';
import OutlineMenu from '../Outline/OutlineMenu';
import { OutlineItem } from '../Outline/outline.models';
import { ICONS } from '../../../constants/icons';
import styles from './ConversationSubBar.module.scss';

export interface ConversationSubBarProps {
  /** Conversation title, shown muted at the left. */
  title: string;
  /** The conversation's turns; empty for a new chat (no crumb, no stepper). */
  items: OutlineItem[];
  /** The turn in view. Falls back to the last turn. */
  currentId?: string | null;
  /** Jump to a turn: from the Outline, or Previous / Next. */
  onSelectItem: (id: string) => void;
  /** Controls at the right end (Share, the shared-item menu). */
  actions?: ReactNode;
  'data-testid'?: string;
}

/**
 * The bar above the conversation: where you are (title and the turn in view),
 * the Outline of every turn, a turn stepper, and the conversation's actions.
 */
export default function ConversationSubBar({
  title,
  items,
  currentId,
  onSelectItem,
  actions,
  'data-testid': testId,
}: ConversationSubBarProps): React.ReactElement {
  const { t } = useTranslation();
  const [isOutlineOpen, setOutlineOpen] = useState(false);
  const crumbRef = useRef<HTMLButtonElement>(null);

  const foundIndex = items.findIndex(item => item.id === currentId);
  const index = foundIndex >= 0 ? foundIndex : items.length - 1;
  const current = index >= 0 ? items[index] : undefined;

  return (
    <div className={styles.bar} data-testid={testId}>
      <span className={styles.title} title={title} data-testid="sub-bar-title">
        {title}
      </span>
      {current && (
        <>
          <Icon
            src={ICONS.ALT_ARROW_RIGHT}
            size={12}
            className={styles.separator}
          />
          <span className={styles.crumbWrap}>
            <Tooltip
              content={isOutlineOpen ? '' : t('conversation.outline.title')}
              position="bottom"
            >
              <button
                ref={crumbRef}
                type="button"
                className={`${styles.crumb} ${isOutlineOpen ? styles.crumbOpen : ''}`}
                aria-haspopup="menu"
                aria-expanded={isOutlineOpen}
                onClick={() => setOutlineOpen(open => !open)}
                data-testid="sub-bar-crumb"
              >
                <span className={styles.badge}>Q{current.number}</span>
                <span className={styles.prompt}>{current.prompt}</span>
                <Icon
                  src={ICONS.ALT_ARROW_RIGHT}
                  size={12}
                  className={
                    isOutlineOpen ? styles.chevronUp : styles.chevronDown
                  }
                />
              </button>
            </Tooltip>
            {isOutlineOpen && (
              <OutlineMenu
                items={items}
                currentId={current.id}
                onSelect={onSelectItem}
                onClose={() => setOutlineOpen(false)}
                anchorRef={crumbRef}
                className={styles.menu}
                data-testid="outline-menu"
              />
            )}
          </span>
        </>
      )}
      <span className={styles.spacer} />
      {current && (
        <>
          <span className={styles.counter} data-testid="sub-bar-counter">
            {index + 1} / {items.length}
          </span>
          <IconButton
            icon={ICONS.ALT_ARROW_RIGHT}
            iconRotation={270}
            label={t('conversation.subBar.previousTurn')}
            onClick={() => onSelectItem(items[index - 1].id)}
            disabled={index <= 0}
            data-testid="sub-bar-previous"
          />
          <IconButton
            icon={ICONS.ALT_ARROW_RIGHT}
            iconRotation={90}
            label={t('conversation.subBar.nextTurn')}
            onClick={() => onSelectItem(items[index + 1].id)}
            disabled={index >= items.length - 1}
            data-testid="sub-bar-next"
          />
          {actions != null && (
            <span className={styles.divider} aria-hidden="true" />
          )}
        </>
      )}
      {actions}
    </div>
  );
}
