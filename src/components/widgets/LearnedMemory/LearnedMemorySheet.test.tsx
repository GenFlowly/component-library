import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LearnedMemorySheet from './LearnedMemorySheet';

const FACTS = Array.from({ length: 7 }, (_, i) => ({
  memoryId: `mem-${i}`,
  text: `Fact ${i}`,
  runId: 'run-1',
}));

describe('LearnedMemorySheet', () => {
  test('lists every fact as a swipe row; tap opens it, the tray deletes it', () => {
    const onOpenFact = jest.fn();
    const onDelete = jest.fn();
    render(
      <LearnedMemorySheet
        facts={FACTS}
        onOpenFact={onOpenFact}
        onDelete={onDelete}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      '7 facts added to memory'
    );
    expect(screen.getAllByTestId('learned-memory-sheet-row')).toHaveLength(7);

    fireEvent.click(screen.getAllByTestId('learned-memory-sheet-open')[2]);
    expect(onOpenFact).toHaveBeenCalledWith(FACTS[2]);

    fireEvent.click(screen.getAllByTestId('learned-memory-sheet-delete')[1]);
    expect(onDelete).toHaveBeenCalledWith(FACTS[1]);
  });

  test('Escape, the scrim and Done close it; Manage in Memory closes then manages', () => {
    const onClose = jest.fn();
    const onManage = jest.fn();
    render(
      <LearnedMemorySheet
        facts={FACTS.slice(0, 1)}
        onOpenFact={jest.fn()}
        onDelete={jest.fn()}
        onClose={onClose}
        onManage={onManage}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('learned-memory-sheet-done'));
    fireEvent.click(screen.getByTestId('learned-memory-sheet-manage'));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onManage).toHaveBeenCalled();
  });
});
