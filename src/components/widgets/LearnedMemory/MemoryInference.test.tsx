import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MemoryInference from './MemoryInference';
import type { MemoryInference as Data } from './memoryInference.models';
import fixture from './fixtures/inference_run.json';

const data = fixture as unknown as Data;
const names: Record<string, string> = { OPENAI: 'OpenAI', CLAUDE: 'Anthropic' };

describe('MemoryInference', () => {
  test('tells the run as a story: trigger, what was read, what was decided, what was saved', () => {
    render(
      <MemoryInference inference={data} vendorName={id => names[id] ?? id} />
    );

    expect(
      screen.getByText('Triggered when the turn finished')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/answered by 2 AIs \(OpenAI, Anthropic\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByText('5 lines · 12 existing memories')
    ).toBeInTheDocument();
    expect(screen.getByTestId('memory-inference-taken')).toHaveTextContent(
      'You · line 3 · the line this memory was taken from'
    );
    expect(
      screen.getAllByTestId('memory-inference-response').map(q => q.textContent)
    ).toEqual([
      expect.stringContaining('OpenAI · line 4 · read'),
      expect.stringContaining('Anthropic · line 5 · read'),
    ]);
    expect(
      screen.getByText('It proposed 3 changes, each with its own reason.')
    ).toBeInTheDocument();
    const ops = screen.getAllByTestId('memory-inference-op');
    expect(within(ops[0]).getByText('This memory')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Stored as a Profile · Core memory and shown under the reply.'
      )
    ).toBeInTheDocument();
  });

  test('the side cards carry the source and the run facts', () => {
    render(
      <MemoryInference inference={data} vendorName={id => names[id] ?? id} />
    );

    const run = screen.getByTestId('memory-inference-run');
    expect(run).toHaveTextContent('gpt-5.4 on your OpenAI key');
    expect(run).toHaveTextContent('OpenAI · Anthropic');
    expect(run).toHaveTextContent('4.2 s');
    expect(run).toHaveTextContent('3,180 in · 212 out');
    expect(run).toHaveTextContent('$0.0041');
    expect(screen.getByTestId('memory-inference-source')).toHaveTextContent(
      'iOS App Growth Strategy for Paygo'
    );
  });

  test('links open the conversation, other memories and delete', () => {
    const onOpenConversation = jest.fn();
    const onOpenMemory = jest.fn();
    const onDelete = jest.fn();
    render(
      <MemoryInference
        inference={data}
        onOpenConversation={onOpenConversation}
        onOpenMemory={onOpenMemory}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByTestId('memory-inference-open-conversation'));
    expect(onOpenConversation).toHaveBeenCalledWith(
      '29adc62a-8370-41b8-8b63-9d979bab4702',
      'U5'
    );
    fireEvent.click(screen.getAllByText('Open memory')[0]);
    expect(onOpenMemory).toHaveBeenCalledWith('MEM#77aa');
    fireEvent.click(screen.getByTestId('memory-inference-delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  test('an operation whose memory was deleted since says so instead of linking', () => {
    const ops = data.run.operations.map((op, i) =>
      i === 1 ? { ...op, memoryDeleted: true } : op
    );
    render(
      <MemoryInference
        inference={{ ...data, run: { ...data.run, operations: ops } }}
        onOpenMemory={jest.fn()}
      />
    );

    const second = screen.getAllByTestId('memory-inference-op')[1];
    expect(second).toHaveTextContent('Memory deleted since');
    expect(within(second).queryByText('Open memory')).not.toBeInTheDocument();
  });

  test('a deleted conversation says so and quotes nothing', () => {
    render(
      <MemoryInference
        inference={{
          ...data,
          excerpts: [],
          conversationTitle: null,
          conversationDeleted: true,
        }}
        onOpenConversation={jest.fn()}
      />
    );

    expect(
      screen.getByText(
        "The conversation was deleted, so its lines can't be shown."
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('memory-inference-taken')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('memory-inference-open-conversation')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('memory-inference-source')).toHaveTextContent(
      'Deleted conversation'
    );
  });
});
