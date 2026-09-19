import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ScrollArea from './ScrollArea';
import '@testing-library/jest-dom';

describe('ScrollArea', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders children and passes through div props', () => {
    render(
      <ScrollArea data-testid="area" aria-label="My list" className="extra">
        <span>content</span>
      </ScrollArea>
    );
    const area = screen.getByTestId('area');
    expect(area).toHaveAttribute('aria-label', 'My list');
    expect(area).toHaveClass('extra');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  test('applies scrolling class while scrolling and removes it after the delay', () => {
    render(<ScrollArea data-testid="area" />);
    const area = screen.getByTestId('area');

    expect(area.className).not.toContain('scrolling');

    fireEvent.scroll(area);
    expect(area.className).toContain('scrolling');

    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(area.className).not.toContain('scrolling');
  });

  test('keeps scrolling class while scroll events keep arriving', () => {
    render(<ScrollArea data-testid="area" />);
    const area = screen.getByTestId('area');

    fireEvent.scroll(area);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.scroll(area);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    // 1000ms since the first event, but only 500ms since the last one
    expect(area.className).toContain('scrolling');

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(area.className).not.toContain('scrolling');
  });

  test('renders an overlay thumb that is hidden from assistive tech', () => {
    render(<ScrollArea data-testid="area" />);
    const thumb = screen.getByTestId('scroll-area-thumb');
    expect(thumb).toHaveAttribute('aria-hidden', 'true');
  });

  test('renders the element given via as', () => {
    render(
      <ScrollArea as="ul" data-testid="area">
        <li>item</li>
      </ScrollArea>
    );
    expect(screen.getByTestId('area').tagName).toBe('UL');
  });

  test('forwards scroll events to a caller-provided onScroll', () => {
    const onScroll = jest.fn();
    render(<ScrollArea data-testid="area" onScroll={onScroll} />);

    fireEvent.scroll(screen.getByTestId('area'));
    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
