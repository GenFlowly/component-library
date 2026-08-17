import React from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import styles from './TextEditorTooltip.module.scss';

interface TextEditorTooltipProps {
  top: number;
  left: number;
  visible: boolean;
  onMarkReusable: () => void;
}

export default function TextEditorTooltip({
  top,
  left,
  visible,
  onMarkReusable,
}: TextEditorTooltipProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return createPortal(
    <div
      className={styles.tooltipContainer}
      style={{
        top: `${top - 10}px`, // Slight offset above
        left: `${left}px`,
      }}
      onMouseDown={e => e.preventDefault()} // Prevent stealing focus
    >
      <button className={styles.button} onClick={onMarkReusable}>
        {t('editor.textEditorTooltip.markAsReusable')}
      </button>
    </div>,
    document.body
  );
}
