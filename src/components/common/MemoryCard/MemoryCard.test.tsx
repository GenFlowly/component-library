import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MemoryCard from './MemoryCard';

const LONG =
  'Is exploring city government software (permitting, licensing, legacy IT replacement) as a startup market; noted slow exits.';

describe('MemoryCard', () => {
  test('the Memory page look shows usage and version; the chat look shows the date only', () => {
    const { rerender } = render(
      <MemoryCard
        text="Prefers short answers."
        actions={[]}
        onOpen={jest.fn()}
        showUsage
        usageCount={3}
        version={2}
        date="22 Nov 2026"
      />
    );
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByText('3×')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();

    rerender(
      <MemoryCard
        text="Prefers short answers."
        actions={[]}
        onOpen={jest.fn()}
        date="Just now"
      />
    );
    expect(screen.queryByText('Used')).not.toBeInTheDocument();
    expect(screen.queryByText('v2')).not.toBeInTheDocument();
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  test('clamped text keeps the full text in the title and opens on click', () => {
    const onOpen = jest.fn();
    render(
      <MemoryCard text={LONG} actions={[]} onOpen={onOpen} clampLines={4} />
    );
    const text = screen.getByTestId('memory-card-open');
    expect(text).toHaveAttribute('title', LONG);
    expect(text).toHaveStyle('--memory-card-lines: 4');
    fireEvent.click(text);
    expect(onOpen).toHaveBeenCalled();
  });

  test('the kebab lists the actions and runs the chosen one', () => {
    const remove = jest.fn();
    render(
      <MemoryCard
        text="x"
        onOpen={jest.fn()}
        actions={[
          {
            id: 'delete',
            label: 'Delete from memory',
            icon: 'trash.svg',
            danger: true,
            onSelect: remove,
          },
        ]}
      />
    );
    fireEvent.click(screen.getByTestId('memory-card-actions'));
    fireEvent.click(screen.getByTestId('memory-action-delete'));
    expect(remove).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('a busy card shows its label instead of the foot', () => {
    render(
      <MemoryCard
        text="x"
        actions={[]}
        onOpen={jest.fn()}
        date="Just now"
        busyLabel="Deleting…"
      />
    );
    expect(screen.getByText('Deleting…')).toBeInTheDocument();
    expect(screen.queryByText('Just now')).not.toBeInTheDocument();
  });
});
