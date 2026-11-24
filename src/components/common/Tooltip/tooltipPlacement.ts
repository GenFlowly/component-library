export type TooltipPlacement = 'right' | 'left' | 'top' | 'bottom';

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

export interface TooltipLayout {
  placement: TooltipPlacement;
  top: number;
  left: number;
  /** Where the arrow sits along the tooltip's width (top and bottom only). */
  arrowLeft?: number;
}

const GAP = 8;

export type TooltipPreference = 'side' | 'vertical';

/**
 * 'side': beside the anchor if a side has room, otherwise above or below it.
 * 'vertical': above the anchor if there is room, otherwise below it.
 * Whichever it is, the tooltip stays inside the viewport. WebTooltip.swift's
 * TooltipLayout.place gives the same answers.
 */
export function placeTooltip(
  anchor: Box,
  tooltip: Size,
  viewport: Size,
  prefer: TooltipPreference = 'side'
): TooltipLayout {
  const rightLeft = anchor.right + GAP;
  const leftLeft = anchor.left - GAP - tooltip.width;
  const fitsRight = rightLeft + tooltip.width <= viewport.width - GAP;
  const fitsLeft = leftLeft >= GAP;

  if (prefer === 'side' && (fitsRight || fitsLeft)) {
    const halfHeight = tooltip.height / 2;
    const centered = anchor.top + anchor.height / 2;
    const top = Math.max(
      halfHeight + GAP,
      Math.min(centered, viewport.height - halfHeight - GAP)
    );
    return fitsRight
      ? { placement: 'right', top, left: rightLeft }
      : { placement: 'left', top, left: leftLeft };
  }

  const halfWidth = tooltip.width / 2;
  const anchorCenter = anchor.left + anchor.width / 2;
  const left = Math.max(
    halfWidth + GAP,
    Math.min(anchorCenter, viewport.width - halfWidth - GAP)
  );
  const arrowLeft = Math.max(
    GAP,
    Math.min(anchorCenter - (left - halfWidth), tooltip.width - GAP)
  );

  const aboveTop = anchor.top - GAP - tooltip.height;
  return aboveTop >= GAP
    ? { placement: 'top', top: aboveTop, left, arrowLeft }
    : { placement: 'bottom', top: anchor.bottom + GAP, left, arrowLeft };
}
