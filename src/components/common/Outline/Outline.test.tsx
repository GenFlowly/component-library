import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OutlineMenu from './OutlineMenu';
import OutlineSheet from './OutlineSheet';
import { OutlineItem } from './outline.models';

const items: OutlineItem[] = [
  {
    id: 'b1',
    number: 1,
    prompt: 'First question',
    meta: '1 response · OpenAI · 10:30 PM',
  },
  { id: 'b2', number: 2, prompt: 'Second question', meta: '2 responses' },
  { id: 'b3', number: 3, prompt: 'Third question', isGenerating: true },
];

describe('OutlineMenu', () => {
  test('lists every turn with its meta and marks the current one', () => {
    render(
      <OutlineMenu
        items={items}
        currentId="b2"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByTestId('outline-row-b1')).toHaveTextContent(
      '1 response · OpenAI · 10:30 PM'
    );
    expect(screen.getByTestId('outline-row-b2')).toHaveAttribute(
      'aria-current',
      'true'
    );
    expect(screen.getByTestId('outline-row-b2')).toHaveFocus();
  });

  test('a generating turn shows the pulse', () => {
    render(
      <OutlineMenu items={items} onSelect={jest.fn()} onClose={jest.fn()} />
    );
    expect(
      screen.getByTestId('outline-row-b3').querySelector('.pulse')
    ).toBeInTheDocument();
  });

  test('choosing a row selects it and closes', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(<OutlineMenu items={items} onSelect={onSelect} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('outline-row-b3'));
    expect(onSelect).toHaveBeenCalledWith('b3');
    expect(onClose).toHaveBeenCalled();
  });

  test('arrow keys, Home and End move between rows', () => {
    render(
      <OutlineMenu
        items={items}
        currentId="b1"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const first = screen.getByTestId('outline-row-b1');
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByTestId('outline-row-b2')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('outline-row-b2'), { key: 'End' });
    expect(screen.getByTestId('outline-row-b3')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('outline-row-b3'), { key: 'ArrowUp' });
    expect(screen.getByTestId('outline-row-b2')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('outline-row-b2'), { key: 'Home' });
    expect(first).toHaveFocus();
  });

  test('Escape, Tab and a click outside close it; a click on the anchor does not', () => {
    const onClose = jest.fn();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };
    render(
      <OutlineMenu
        items={items}
        onSelect={jest.fn()}
        onClose={onClose}
        anchorRef={anchorRef}
      />
    );
    fireEvent.pointerDown(anchor);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(anchor).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('outline-row-b1'), { key: 'Tab' });
    expect(onClose).toHaveBeenCalledTimes(3);
    anchor.remove();
  });
});

describe('OutlineSheet', () => {
  test('renders nothing while closed', () => {
    render(
      <OutlineSheet
        isOpen={false}
        items={items}
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows the turns in a dialog and jumps on a tap', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(
      <OutlineSheet
        isOpen
        items={items}
        currentId="b3"
        onSelect={onSelect}
        onClose={onClose}
        data-testid="sheet"
      />
    );
    expect(screen.getByRole('dialog', { name: 'Outline' })).toHaveTextContent(
      '3 turns'
    );
    expect(screen.getByTestId('outline-row-b3')).toHaveAttribute(
      'aria-current',
      'true'
    );
    fireEvent.click(screen.getByTestId('outline-row-b1'));
    expect(onSelect).toHaveBeenCalledWith('b1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the close button, the scrim and Escape close it', () => {
    const onClose = jest.fn();
    render(
      <OutlineSheet
        isOpen
        items={items}
        onSelect={jest.fn()}
        onClose={onClose}
        data-testid="sheet"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByTestId('sheet-scrim'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
