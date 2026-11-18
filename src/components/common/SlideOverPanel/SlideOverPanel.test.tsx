import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SlideOverPanel from './SlideOverPanel';

const setup = (
  props: Partial<React.ComponentProps<typeof SlideOverPanel>> = {}
) => {
  const onClose = jest.fn();
  render(
    <SlideOverPanel
      open
      onClose={onClose}
      aria-label="Panel"
      data-testid="panel"
      {...props}
    >
      <p>Content</p>
    </SlideOverPanel>
  );
  return { onClose, dialog: screen.getByRole('dialog', { name: 'Panel' }) };
};

let now = 0;

/** One finger from `from` to `to` in two moves, 16ms apart. */
const swipe = (
  element: Element,
  from: [number, number],
  to: [number, number]
) => {
  const at = ([clientX, clientY]: [number, number]) => ({
    touches: [{ clientX, clientY }],
  });
  fireEvent.touchStart(element, at(from));
  now += 16;
  fireEvent.touchMove(
    element,
    at([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2])
  );
  now += 16;
  fireEvent.touchMove(element, at(to));
  fireEvent.touchEnd(element, { touches: [] });
};

describe('SlideOverPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders nothing while closed', () => {
    render(
      <SlideOverPanel open={false} onClose={jest.fn()} aria-label="Panel">
        <p>Content</p>
      </SlideOverPanel>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('takes the side and full-width classes', () => {
    setup({ side: 'right', fullWidth: true });
    expect(screen.getByTestId('panel')).toHaveClass('right', 'full');
  });

  test('the scrim and Escape close it', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTestId('panel-scrim'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('a swipe back toward its edge slides it out, then closes it', () => {
    const { onClose, dialog } = setup({ side: 'right' });
    swipe(dialog, [20, 300], [400, 310]);
    expect(dialog.style.transform).toMatch(/^translateX\(\d+px\)$/);
    expect(onClose).not.toHaveBeenCalled();
    act(() => jest.runAllTimers());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a left panel closes on a swipe to the left', () => {
    const { onClose, dialog } = setup({ side: 'left' });
    swipe(dialog, [300, 300], [0, 300]);
    act(() => jest.runAllTimers());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a swipe away from its edge, a vertical scroll and a short slow drag leave it open', () => {
    const { onClose, dialog } = setup({ side: 'right' });
    swipe(dialog, [300, 300], [20, 300]);
    swipe(dialog, [100, 100], [110, 500]);
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 300 }] });
    now += 500;
    fireEvent.touchMove(dialog, { touches: [{ clientX: 120, clientY: 300 }] });
    fireEvent.touchEnd(dialog, { touches: [] });
    act(() => jest.runAllTimers());
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog.style.transform).toBe('');
  });
});
