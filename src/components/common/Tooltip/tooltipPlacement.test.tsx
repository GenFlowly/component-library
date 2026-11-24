import { placeTooltip } from './tooltipPlacement';

const box = (left: number, top: number, width = 40, height = 20) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const phone = { width: 402, height: 874 };
const tooltip = { width: 300, height: 48 };

const edges = (
  layout: ReturnType<typeof placeTooltip>,
  size: { width: number; height: number }
) => {
  const vertical = layout.placement === 'top' || layout.placement === 'bottom';
  const left = vertical ? layout.left - size.width / 2 : layout.left;
  const top = vertical ? layout.top : layout.top - size.height / 2;
  return { left, right: left + size.width, top, bottom: top + size.height };
};

describe('placeTooltip', () => {
  it('goes right of the anchor when it fits', () => {
    const layout = placeTooltip(box(24, 400), tooltip, phone);
    expect(layout.placement).toBe('right');
    expect(layout.left).toBe(72);
  });

  it('flips left when only the left side fits', () => {
    const layout = placeTooltip(box(900, 400), tooltip, {
      width: 1000,
      height: 800,
    });
    expect(layout.placement).toBe('left');
    expect(layout.left).toBe(592);
  });

  it.each([80, 127, 162, 218])(
    'stays on a phone screen when neither side fits (anchor at %i)',
    anchorLeft => {
      const layout = placeTooltip(box(anchorLeft, 780), tooltip, phone);
      const placed = edges(layout, tooltip);
      expect(layout.placement).toBe('top');
      expect(placed.left).toBeGreaterThanOrEqual(8);
      expect(placed.right).toBeLessThanOrEqual(phone.width - 8);
      expect(placed.top).toBeGreaterThanOrEqual(8);
      expect(placed.bottom).toBeLessThanOrEqual(780);
    }
  );

  it('goes below when there is no room above either', () => {
    const layout = placeTooltip(box(120, 20), tooltip, phone);
    expect(layout.placement).toBe('bottom');
    expect(layout.top).toBe(48);
  });

  it('keeps the arrow on the anchor after shifting the tooltip', () => {
    const layout = placeTooltip(box(300, 780), tooltip, phone);
    const placed = edges(layout, tooltip);
    expect(layout.placement).toBe('top');
    expect(placed.left + (layout.arrowLeft as number)).toBe(320);
  });

  it('keeps the arrow on the tooltip for an anchor at the very edge', () => {
    const wide = { width: 390, height: 48 };
    const layout = placeTooltip(box(0, 780, 4), wide, phone);
    expect(layout.placement).toBe('top');
    expect(layout.arrowLeft).toBe(8);
  });

  it('keeps a side tooltip inside the top and bottom of the screen', () => {
    const top = placeTooltip(box(24, 0), tooltip, phone);
    expect(top.top).toBe(32);
    const bottom = placeTooltip(box(24, 860), tooltip, phone);
    expect(bottom.top).toBe(842);
  });
  it('prefers above the anchor when asked, though a side has room', () => {
    const layout = placeTooltip(box(24, 400), tooltip, phone, 'vertical');
    expect(layout.placement).toBe('top');
    expect(layout.top).toBe(400 - 8 - 48);
    const { left, right } = edges(layout, tooltip);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(right).toBeLessThanOrEqual(phone.width - 8);
  });

  it('prefers below when there is no room above', () => {
    const layout = placeTooltip(box(200, 20), tooltip, phone, 'vertical');
    expect(layout.placement).toBe('bottom');
    expect(layout.top).toBe(40 + 8);
  });

  it('keeps the arrow on the anchor when the box is pushed in from an edge', () => {
    const layout = placeTooltip(
      box(20, 400, 16, 16),
      tooltip,
      phone,
      'vertical'
    );
    const { left } = edges(layout, tooltip);
    expect(left + (layout.arrowLeft ?? 0)).toBeCloseTo(20 + 8, 0);
  });
});
