import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConversationSubBar from './ConversationSubBar';
import { OutlineItem } from '../Outline/outline.models';

const items: OutlineItem[] = [
  {
    id: 'b1',
    number: 1,
    prompt: 'What fails first?',
    meta: '1 response · OpenAI · 10:30 PM',
  },
  {
    id: 'b2',
    number: 2,
    prompt: 'How often should I flush it?',
    meta: '2 responses',
  },
  { id: 'b3', number: 3, prompt: 'Draft a message', isGenerating: true },
];

describe('ConversationSubBar', () => {
  test('a new chat shows only the title and the actions', () => {
    render(
      <ConversationSubBar
        title="New Chat"
        items={[]}
        onSelectItem={jest.fn()}
        actions={<button>Share</button>}
      />
    );
    expect(screen.getByTestId('sub-bar-title')).toHaveTextContent('New Chat');
    expect(screen.queryByTestId('sub-bar-crumb')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sub-bar-counter')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  test('shows the turn in view with its number and the counter', () => {
    render(
      <ConversationSubBar
        title="Water heater"
        items={items}
        currentId="b2"
        onSelectItem={jest.fn()}
      />
    );
    const crumb = screen.getByTestId('sub-bar-crumb');
    expect(crumb).toHaveTextContent('Q2');
    expect(crumb).toHaveTextContent('How often should I flush it?');
    expect(screen.getByTestId('sub-bar-counter')).toHaveTextContent('2 / 3');
  });

  test('falls back to the last turn when the current id is unknown', () => {
    render(
      <ConversationSubBar
        title="T"
        items={items}
        currentId="draft"
        onSelectItem={jest.fn()}
      />
    );
    expect(screen.getByTestId('sub-bar-crumb')).toHaveTextContent('Q3');
    expect(screen.getByTestId('sub-bar-next')).toBeDisabled();
  });

  test('Previous and Next step through the turns and stop at the ends', () => {
    const onSelect = jest.fn();
    const { rerender } = render(
      <ConversationSubBar
        title="T"
        items={items}
        currentId="b1"
        onSelectItem={onSelect}
      />
    );
    expect(screen.getByTestId('sub-bar-previous')).toBeDisabled();
    fireEvent.click(screen.getByTestId('sub-bar-next'));
    expect(onSelect).toHaveBeenLastCalledWith('b2');

    rerender(
      <ConversationSubBar
        title="T"
        items={items}
        currentId="b2"
        onSelectItem={onSelect}
      />
    );
    fireEvent.click(screen.getByTestId('sub-bar-previous'));
    expect(onSelect).toHaveBeenLastCalledWith('b1');
  });

  test('the crumb opens the Outline; choosing a turn jumps and closes it', () => {
    const onSelect = jest.fn();
    render(
      <ConversationSubBar
        title="T"
        items={items}
        currentId="b1"
        onSelectItem={onSelect}
      />
    );
    const crumb = screen.getByTestId('sub-bar-crumb');
    expect(crumb).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(crumb);
    expect(crumb).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Outline' });
    expect(menu).toHaveTextContent('3 turns');
    expect(screen.getByTestId('outline-row-b1')).toHaveAttribute(
      'aria-current',
      'true'
    );

    fireEvent.click(screen.getByTestId('outline-row-b3'));
    expect(onSelect).toHaveBeenCalledWith('b3');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('the crumb toggles the Outline closed again', () => {
    render(
      <ConversationSubBar title="T" items={items} onSelectItem={jest.fn()} />
    );
    const crumb = screen.getByTestId('sub-bar-crumb');
    fireEvent.click(crumb);
    fireEvent.pointerDown(crumb);
    fireEvent.click(crumb);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('the stepper buttons carry their labels', () => {
    render(
      <ConversationSubBar
        title="T"
        items={items}
        currentId="b2"
        onSelectItem={jest.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Previous turn' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Next turn' })
    ).toBeInTheDocument();
  });
});
