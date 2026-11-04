import { EditorView, tooltips } from '@codemirror/view';

/** The part of the page the user can see: a phone's keyboard covers the rest. */
export function visibleViewportSpace(): {
  top: number;
  left: number;
  right: number;
  bottom: number;
} {
  const viewport = window.visualViewport;
  if (!viewport) {
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }
  return {
    top: viewport.offsetTop,
    left: viewport.offsetLeft,
    right: viewport.offsetLeft + viewport.width,
    bottom: viewport.offsetTop + viewport.height,
  };
}

/**
 * The popup lives under <body> because the composer's transform and overflow
 * would otherwise trap and clip it. Out there it no longer inherits the
 * editor's font size. CodeMirror's own colors assume a light editor, so the
 * app's theme colors replace them.
 */
export const completionPopupExtensions = [
  tooltips({
    position: 'fixed',
    parent: document.body,
    tooltipSpace: visibleViewportSpace,
  }),
  EditorView.theme({
    '.cm-tooltip': {
      backgroundColor: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)',
      borderColor: 'var(--color-border)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontSize: '1.5rem',
    },
  }),
];
