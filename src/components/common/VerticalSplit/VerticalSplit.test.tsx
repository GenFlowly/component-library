import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import VerticalSplit from './VerticalSplit';
import '@testing-library/jest-dom';

const STORAGE_KEY = 'test_split_fraction';

const baseProps = {
  storageKey: STORAGE_KEY,
  top: <div>top content</div>,
  bottom: <div>bottom content</div>,
  'data-testid': 'split',
  handleTestId: 'split-handle',
  topTestId: 'split-top',
  bottomTestId: 'split-bottom',
};

const renderSplit = (overrides = {}) =>
  render(<VerticalSplit {...baseProps} {...overrides} />);

describe('VerticalSplit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders both panes and an accessible separator at the default fraction', () => {
    renderSplit();

    expect(screen.getByText('top content')).toBeInTheDocument();
    expect(screen.getByText('bottom content')).toBeInTheDocument();
    expect(screen.getByTestId('split-top')).toHaveStyle({ flexBasis: '40%' });

    const handle = screen.getByRole('separator');
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal');
    expect(handle).toHaveAttribute('aria-valuenow', '40');
    expect(handle).toHaveAttribute('aria-valuemin', '15');
    expect(handle).toHaveAttribute('aria-valuemax', '85');
  });

  test('without top content it renders a single pane and no separator', () => {
    renderSplit({ top: null });

    expect(screen.getByText('bottom content')).toBeInTheDocument();
    expect(screen.queryByTestId('split-top')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  test('restores the persisted fraction on mount', () => {
    localStorage.setItem(STORAGE_KEY, '0.6');
    renderSplit();

    expect(screen.getByTestId('split-top')).toHaveStyle({ flexBasis: '60%' });
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '60'
    );
  });

  test('clamps a persisted fraction outside the allowed range', () => {
    localStorage.setItem(STORAGE_KEY, '0.95');
    renderSplit();

    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '85'
    );
  });

  test('ignores an unparseable persisted value', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    renderSplit();

    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
  });

  test('arrow keys resize the panes and persist the fraction', () => {
    renderSplit();
    const handle = screen.getByRole('separator');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByTestId('split-top')).toHaveStyle({ flexBasis: '42%' });
    expect(parseFloat(localStorage.getItem(STORAGE_KEY) ?? '')).toBeCloseTo(
      0.42
    );

    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle).toHaveAttribute('aria-valuenow', '40');
    expect(parseFloat(localStorage.getItem(STORAGE_KEY) ?? '')).toBeCloseTo(
      0.4
    );
  });

  test('Home and End jump to the fraction bounds', () => {
    renderSplit();
    const handle = screen.getByRole('separator');

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '15');

    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '85');
    expect(parseFloat(localStorage.getItem(STORAGE_KEY) ?? '')).toBeCloseTo(
      0.85
    );
  });

  test('dragging the separator resizes the panes and persists on release', () => {
    renderSplit();
    jest
      .spyOn(screen.getByTestId('split'), 'getBoundingClientRect')
      .mockReturnValue({ top: 0, height: 400 } as DOMRect);

    fireEvent.pointerDown(screen.getByTestId('split-handle'), {
      clientY: 160,
      pointerId: 1,
    });
    fireEvent(
      window,
      new MouseEvent('pointermove', { clientY: 100, bubbles: true })
    );
    expect(screen.getByTestId('split-top')).toHaveStyle({ flexBasis: '25%' });
    // Still mid-drag: nothing persisted yet
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));
    expect(parseFloat(localStorage.getItem(STORAGE_KEY) ?? '')).toBeCloseTo(
      0.25
    );
  });

  test('both panes collapsed: each hugs its own content and the split itself shrinks', () => {
    renderSplit({ topCollapsed: true, bottomCollapsed: true });

    expect(screen.getByTestId('split-top')).not.toHaveAttribute('style');
    expect(screen.getByTestId('split-top').className).not.toContain('paneFill');
    expect(screen.getByTestId('split-bottom').className).toContain(
      'paneFillCollapsed'
    );
    expect(screen.getByTestId('split').className).toContain('splitCollapsed');

    const handle = screen.getByRole('separator', { hidden: true });
    expect(handle).toHaveAttribute('tabIndex', '-1');
    expect(handle).toHaveAttribute('aria-hidden', 'true');

    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle).toHaveAttribute('aria-valuenow', '40');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('only the top pane collapsed: it hugs its header while the bottom keeps filling, split stays full height', () => {
    renderSplit({ topCollapsed: true });

    expect(screen.getByTestId('split-top')).not.toHaveAttribute('style');
    expect(screen.getByTestId('split-top').className).not.toContain('paneFill');
    expect(screen.getByTestId('split-bottom').className).toContain('paneFill');
    expect(screen.getByTestId('split-bottom').className).not.toContain(
      'paneFillCollapsed'
    );
    expect(screen.getByTestId('split').className).not.toContain(
      'splitCollapsed'
    );
    expect(screen.getByRole('separator', { hidden: true })).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  test('only the bottom pane collapsed: top takes over the freed space instead of keeping its drag fraction', () => {
    renderSplit({ bottomCollapsed: true });

    // No fixed flexBasis anymore — it switches to fill, same as the bottom
    // pane normally is, so it absorbs all the space the bottom gave up
    expect(screen.getByTestId('split-top')).not.toHaveAttribute('style');
    expect(screen.getByTestId('split-top').className).toContain('paneFill');
    expect(screen.getByTestId('split-bottom').className).toContain(
      'paneFillCollapsed'
    );
    expect(screen.getByTestId('split').className).not.toContain(
      'splitCollapsed'
    );
    expect(screen.getByRole('separator', { hidden: true })).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  test('neither collapsed: normal drag-fraction behavior, separator stays active', () => {
    renderSplit();

    expect(screen.getByTestId('split-top')).toHaveStyle({ flexBasis: '40%' });
    expect(screen.getByTestId('split-top').className).not.toContain('paneFill');
    expect(screen.getByRole('separator')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('separator')).toHaveAttribute('tabIndex', '0');
  });

  test('bottomCollapsed with no top content still hugs the single bottom pane', () => {
    renderSplit({ top: null, bottomCollapsed: true });

    expect(screen.getByTestId('split').className).toContain('splitCollapsed');
    expect(screen.getByTestId('split-bottom').className).toContain(
      'paneFillCollapsed'
    );
  });

  test('drag positions are clamped to the fraction bounds', () => {
    renderSplit();
    jest
      .spyOn(screen.getByTestId('split'), 'getBoundingClientRect')
      .mockReturnValue({ top: 0, height: 400 } as DOMRect);

    fireEvent.pointerDown(screen.getByTestId('split-handle'), {
      clientY: 160,
      pointerId: 1,
    });
    fireEvent(
      window,
      new MouseEvent('pointermove', { clientY: 399, bubbles: true })
    );
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '85'
    );
    fireEvent(window, new MouseEvent('pointerup', { bubbles: true }));
  });
});
