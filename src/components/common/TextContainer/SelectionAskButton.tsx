import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { ICONS } from '../../../constants/icons';
import styles from './TextContainer.module.scss';

/** Vertical gap between the selection's bounding box and the button. */
const BUTTON_GAP = 8;
// Selections hugging the card's top edge get the button below the selection
// instead — above it would be clipped by the card
const FLIP_THRESHOLD = 40;

interface SelectionAskButtonProps {
  /** Element the selection must live inside (the rendered markdown body). */
  scopeRef: React.RefObject<HTMLElement | null>;
  onAsk: (selectedText: string) => void;
}

interface ButtonPlacement {
  top: number;
  left: number;
  below: boolean;
  text: string;
}

/**
 * Floating "Ask" pill that follows the user's text selection inside a
 * response card. Desktop mouse/keyboard selection and mobile-web long-press
 * both arrive through the document's selectionchange event, so one listener
 * covers every input. Clicking the pill hands the selected plain text to the
 * host and clears the selection.
 */
export default function SelectionAskButton({
  scopeRef,
  onAsk,
}: SelectionAskButtonProps) {
  const { t } = useTranslation();
  const [placement, setPlacement] = React.useState<ButtonPlacement | null>(
    null
  );

  React.useEffect(() => {
    const handleSelectionChange = () => {
      const scope = scopeRef.current;
      const selection = document.getSelection();
      if (
        !scope ||
        !selection ||
        selection.rangeCount === 0 ||
        selection.isCollapsed
      ) {
        setPlacement(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!scope.contains(range.commonAncestorContainer)) {
        setPlacement(null);
        return;
      }
      // Selection.toString() is unreliable in jsdom; the Range's is not
      const text = selection.toString() || range.toString();
      if (!text.trim()) {
        setPlacement(null);
        return;
      }
      // Position relative to the scope element, so the button rides along
      // with the card when the conversation scrolls. (jsdom has no range
      // layout — the zero-rect fallback keeps the button functional there.)
      const rect =
        typeof range.getBoundingClientRect === 'function'
          ? range.getBoundingClientRect()
          : { top: 0, bottom: 0, left: 0, width: 0 };
      const scopeRect = scope.getBoundingClientRect();
      const below = rect.top - scopeRect.top < FLIP_THRESHOLD;
      setPlacement({
        top: below
          ? rect.bottom - scopeRect.top + BUTTON_GAP
          : rect.top - scopeRect.top - BUTTON_GAP,
        left: Math.min(
          Math.max(rect.left - scopeRect.left + rect.width / 2, 0),
          scopeRect.width
        ),
        below,
        text,
      });
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, [scopeRef]);

  if (!placement) return null;

  return (
    <button
      type="button"
      className={`${styles.selectionAskButton} ${
        placement.below ? styles.selectionAskBelow : ''
      }`}
      style={{ top: placement.top, left: placement.left }}
      // Keep the selection: a mousedown on the button must not collapse it
      // before the click lands
      onMouseDown={e => e.preventDefault()}
      onClick={() => {
        onAsk(placement.text);
        document.getSelection()?.removeAllRanges();
        setPlacement(null);
      }}
      data-testid="selection-ask-button"
    >
      <Icon src={ICONS.SEND} size={12} />
      {t('common.textContainer.askSelection')}
    </button>
  );
}
