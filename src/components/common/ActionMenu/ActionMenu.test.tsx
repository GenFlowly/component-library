import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActionMenu from './ActionMenu';

const rect = (r: Partial<DOMRect>) =>
  ({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...r,
  }) as DOMRect;

describe('ActionMenu', () => {
  const move = jest.fn();
  const pin = jest.fn();
  const remove = jest.fn();
  const items = [
    {
      icon: <span>📁</span>,
      label: 'Move to project',
      onClick: move,
      testId: 'move',
    },
    { label: 'Pin', onClick: pin, testId: 'pin' },
    { label: 'Delete', onClick: remove, testId: 'delete' },
  ];
  const originalRect = HTMLElement.prototype.getBoundingClientRect;

  const renderMenu = () =>
    render(
      <div>
        <ActionMenu
          label="More actions"
          items={items}
          className="rowButton"
          data-testid="kebab"
          menuTestId="menu"
        />
        <button>Elsewhere</button>
      </div>
    );

  const layout = ({
    button,
    menu,
    viewport = { width: 1000, height: 800 },
  }: {
    button: Partial<DOMRect>;
    menu: Partial<DOMRect>;
    viewport?: { width: number; height: number };
  }) => {
    Object.defineProperty(window, 'innerWidth', {
      value: viewport.width,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: viewport.height,
      configurable: true,
    });
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.getAttribute('role') === 'menu') return rect(menu);
      if (this.getAttribute('data-testid') === 'kebab') return rect(button);
      return rect({});
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    layout({
      button: { top: 100, bottom: 120, left: 200, right: 220 },
      menu: { width: 168, height: 96 },
    });
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
  });

  test('is a labelled menu button with a tooltip, closed at first', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    expect(kebab).toHaveAccessibleName('More actions');
    expect(kebab).toHaveAttribute('aria-haspopup', 'menu');
    expect(kebab).toHaveAttribute('aria-expanded', 'false');
    expect(kebab).toHaveClass('trigger', 'rowButton');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.mouseEnter(kebab.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('More actions');
    fireEvent.mouseLeave(kebab.parentElement!);
  });

  test('opens under the button, aligned to its right edge, with the first item focused', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    fireEvent.click(kebab);

    const menu = screen.getByRole('menu', { name: 'More actions' });
    expect(kebab).toHaveAttribute('aria-expanded', 'true');
    expect(kebab).toHaveAttribute('aria-controls', menu.id);
    expect(menu).toHaveStyle({ top: '124px', left: '52px' });
    expect(
      screen.getAllByRole('menuitem').map(item => item.textContent)
    ).toEqual(['📁Move to project', 'Pin', 'Delete']);
    expect(screen.getByTestId('move')).toHaveFocus();
    // No tooltip over the open menu
    fireEvent.mouseEnter(kebab.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('opens above the button when there is no room below', () => {
    layout({
      button: { top: 700, bottom: 720, left: 200, right: 220 },
      menu: { width: 168, height: 96 },
    });
    renderMenu();
    fireEvent.click(screen.getByTestId('kebab'));
    expect(screen.getByRole('menu')).toHaveStyle({ top: '600px' });
  });

  test('stays inside the window near its left edge', () => {
    layout({
      button: { top: 100, bottom: 120, left: 10, right: 30 },
      menu: { width: 168, height: 96 },
    });
    renderMenu();
    fireEvent.click(screen.getByTestId('kebab'));
    expect(screen.getByRole('menu')).toHaveStyle({ left: '8px' });
  });

  test('choosing an item closes the menu, runs it and returns focus to the button', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    fireEvent.click(kebab);
    fireEvent.click(screen.getByTestId('pin'));
    expect(pin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(kebab).toHaveFocus();
    expect(kebab).toHaveAttribute('aria-expanded', 'false');
  });

  test('arrow keys, Home and End move through the items and wrap', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('kebab'));
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByTestId('pin')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(screen.getByTestId('delete')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByTestId('move')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(screen.getByTestId('delete')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(screen.getByTestId('move')).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'a' });
    expect(screen.getByTestId('move')).toHaveFocus();
  });

  test('Escape and Tab close it and return focus to the button', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    fireEvent.click(kebab);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(kebab).toHaveFocus();

    fireEvent.click(kebab);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(kebab).toHaveFocus();
  });

  test('a press outside, a scroll or a resize closes it; a press inside does not', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    fireEvent.click(kebab);
    fireEvent.pointerDown(screen.getByTestId('pin'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText('Elsewhere'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(kebab);
    act(() => {
      fireEvent.scroll(window);
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(kebab);
    act(() => {
      fireEvent(window, new Event('resize'));
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('the button toggles it closed again', () => {
    renderMenu();
    const kebab = screen.getByTestId('kebab');
    fireEvent.click(kebab);
    fireEvent.click(kebab);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
