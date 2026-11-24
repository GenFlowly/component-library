import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Tooltip from './Tooltip';
import '@testing-library/jest-dom';

const renderLinkTooltip = (id = 'tip', extra = {}) =>
  render(
    <p>
      Claim
      <Tooltip
        as="span"
        variant="card"
        interactive
        openOnClick
        prefer="vertical"
        content={
          <a href="https://example.com/page" data-testid={`${id}-title`}>
            Page title
          </a>
        }
        data-testid={id}
        {...extra}
      >
        <a href="https://example.com/page" data-testid={`${id}-chip`}>
          16
        </a>
      </Tooltip>
    </p>
  );

const click = (element: Element, init: MouseEventInit = {}) => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  act(() => {
    element.dispatchEvent(event);
  });
  return event;
};

describe('Tooltip openOnClick', () => {
  test('renders an inline span wrapper inside a paragraph', () => {
    renderLinkTooltip();
    const wrapper = screen.getByTestId('tip');
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.closest('p')).not.toBeNull();
  });

  test('the first click opens it and keeps the link from opening', () => {
    renderLinkTooltip();
    const event = click(screen.getByTestId('tip-chip'));
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByTestId('tip-content')).toBeInTheDocument();
    expect(screen.getByTestId('tip')).toHaveAttribute('data-open', 'true');
  });

  test('stays open when the pointer leaves the trigger', () => {
    jest.useFakeTimers();
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    fireEvent.mouseLeave(screen.getByTestId('tip'));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('tip-content')).toBeInTheDocument();
    jest.useRealTimers();
  });

  test('the second click closes it and lets the link open', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    const second = click(screen.getByTestId('tip-chip'));
    expect(second.defaultPrevented).toBe(false);
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('a modified click goes straight through', () => {
    renderLinkTooltip();
    const event = click(screen.getByTestId('tip-chip'), { metaKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('Escape closes it', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('a press outside closes it, a press inside does not', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    fireEvent.pointerDown(screen.getByTestId('tip-content'));
    expect(screen.getByTestId('tip-content')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('scrolling the page closes it', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    fireEvent.scroll(window);
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('following a link inside the content closes it', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    click(screen.getByTestId('tip-title'));
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
  });

  test('opening a second one closes the first', () => {
    render(
      <div>
        <Tooltip openOnClick content="First" data-testid="one">
          <button>One</button>
        </Tooltip>
        <Tooltip openOnClick content="Second" data-testid="two">
          <button>Two</button>
        </Tooltip>
      </div>
    );
    click(screen.getByText('One'));
    expect(screen.getByText('First')).toBeInTheDocument();
    click(screen.getByText('Two'));
    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  test('a tap opens it even though touch suppresses hover', () => {
    renderLinkTooltip();
    const chip = screen.getByTestId('tip-chip');
    fireEvent.touchStart(chip);
    fireEvent.touchEnd(chip);
    fireEvent.mouseEnter(screen.getByTestId('tip'));
    expect(screen.queryByTestId('tip-content')).not.toBeInTheDocument();
    click(chip);
    expect(screen.getByTestId('tip-content')).toBeInTheDocument();
  });

  test('without openOnClick a click changes nothing', () => {
    render(
      <Tooltip content="Plain" data-testid="plain">
        <a href="https://example.com">Link</a>
      </Tooltip>
    );
    const event = click(screen.getByText('Link'));
    expect(event.defaultPrevented).toBe(false);
    expect(screen.queryByText('Plain')).not.toBeInTheDocument();
  });

  test('the card variant marks the content', () => {
    renderLinkTooltip();
    click(screen.getByTestId('tip-chip'));
    expect(screen.getByTestId('tip-content').className).toContain('card');
  });
});
