import React, { useRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SelectionAskButton from './SelectionAskButton';

function Harness({ onAsk }: { onAsk: (text: string) => void }) {
  const scopeRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={scopeRef}>
        <p data-testid="inside">Hello selectable world</p>
        <SelectionAskButton scopeRef={scopeRef} onAsk={onAsk} />
      </div>
      <p data-testid="outside">Unrelated text</p>
    </div>
  );
}

function selectNodeContents(node: Node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

function clearSelection() {
  document.getSelection()?.removeAllRanges();
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

describe('SelectionAskButton', () => {
  afterEach(() => {
    document.getSelection()?.removeAllRanges();
  });

  test('hidden while nothing is selected', () => {
    render(<Harness onAsk={jest.fn()} />);
    expect(
      screen.queryByTestId('selection-ask-button')
    ).not.toBeInTheDocument();
  });

  test('selection inside the scope shows the button; clicking hands over the text and clears the selection', () => {
    const onAsk = jest.fn();
    render(<Harness onAsk={onAsk} />);

    selectNodeContents(screen.getByTestId('inside'));
    const button = screen.getByTestId('selection-ask-button');

    fireEvent.click(button);
    expect(onAsk).toHaveBeenCalledWith('Hello selectable world');
    expect(document.getSelection()?.isCollapsed ?? true).toBe(true);
    expect(
      screen.queryByTestId('selection-ask-button')
    ).not.toBeInTheDocument();
  });

  test('selection outside the scope never shows the button', () => {
    render(<Harness onAsk={jest.fn()} />);
    selectNodeContents(screen.getByTestId('outside'));
    expect(
      screen.queryByTestId('selection-ask-button')
    ).not.toBeInTheDocument();
  });

  test('collapsing the selection hides the button again', () => {
    render(<Harness onAsk={jest.fn()} />);
    selectNodeContents(screen.getByTestId('inside'));
    expect(screen.getByTestId('selection-ask-button')).toBeInTheDocument();

    clearSelection();
    expect(
      screen.queryByTestId('selection-ask-button')
    ).not.toBeInTheDocument();
  });
});
