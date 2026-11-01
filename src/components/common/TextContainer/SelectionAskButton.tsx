import React from 'react';
import { createPortal } from 'react-dom';
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

type ButtonPlacement =
  | {
      mode: 'anchored';
      top: number;
      left: number;
      below: boolean;
      text: string;
    }
  | { mode: 'docked'; text: string };

// Touch selections come with the OS's own Copy/Look Up callout, which is
// drawn over the page wherever the selection sits — an anchored pill can't
// avoid it, so touch devices get a pill docked at the viewport bottom instead.
const isCoarsePointer = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * Floating "Ask" pill that follows the user's text selection inside a
 * response card. Desktop mouse/keyboard selection and mobile-web long-press
 * both arrive through the document's selectionchange event, so one listener
 * covers every input. On fine-pointer devices the pill anchors to the
 * selection; on coarse-pointer devices it docks at the bottom of the viewport
 * (portaled past the conversation blocks' paint containment, which would
 * otherwise clip a fixed-position descendant). Activating the pill hands the
 * selected plain text to the host and clears the selection.
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
      if (isCoarsePointer()) {
        setPlacement({ mode: 'docked', text });
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
        mode: 'anchored',
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

  const activate = () => {
    onAsk(placement.text);
    document.getSelection()?.removeAllRanges();
    setPlacement(null);
  };

  const button = (
    <button
      type="button"
      className={
        placement.mode === 'docked'
          ? `${styles.selectionAskButton} ${styles.selectionAskDocked}`
          : `${styles.selectionAskButton} ${
              placement.below ? styles.selectionAskBelow : ''
            }`
      }
      style={
        placement.mode === 'anchored'
          ? { top: placement.top, left: placement.left }
          : undefined
      }
      // Keep the selection: a press on the button must not collapse it
      // before the activation lands. On touch, preventDefault also suppresses
      // the synthetic click, so activate() runs exactly once per tap.
      onMouseDown={e => e.preventDefault()}
      onTouchEnd={e => {
        e.preventDefault();
        activate();
      }}
      onClick={activate}
      data-testid="selection-ask-button"
    >
      <Icon src={ICONS.SEND} size={15} />
      {t('common.textContainer.askSelection')}
    </button>
  );

  // The docked pill is viewport-fixed; portal it out of the card so ancestor
  // containment/transforms can't re-anchor or clip it
  return placement.mode === 'docked'
    ? createPortal(button, document.body)
    : button;
}
