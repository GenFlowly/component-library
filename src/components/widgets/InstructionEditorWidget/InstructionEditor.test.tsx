import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InstructionEditor from './InstructionEditor';

// The real TextEditor lazy-loads the UIW markdown editor, which does not
// work in JSDOM, so replace it with a plain textarea.
jest.mock('../TextEditorWidget/TextEditor', () => ({
  __esModule: true,
  default: function MockTextEditor(props: any) {
    return (
      <textarea
        data-testid="mock-text-editor"
        value={props.value}
        readOnly={props.readOnly}
        onChange={e => props.onChange(e.target.value)}
      />
    );
  },
}));

describe('InstructionEditor', () => {
  const baseProps = {
    name: 'My persona',
    onNameChange: jest.fn(),
    instructionText: 'Be helpful.',
    onInstructionTextChange: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  test('shows Share, Delete and Save for an owner editing an instruction', () => {
    render(
      <InstructionEditor
        {...baseProps}
        canShare
        canDelete
        onShare={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Edit Instruction')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('hides Share and Delete when creating a new instruction', () => {
    render(
      <InstructionEditor
        {...baseProps}
        isNew
        canShare
        canDelete
        onShare={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Create Instruction')).toBeInTheDocument();
    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('hides Share when canShare is false', () => {
    render(<InstructionEditor {...baseProps} canDelete onDelete={jest.fn()} />);

    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('readOnly hides all actions, disables inputs and shows the banner', () => {
    render(
      <InstructionEditor
        {...baseProps}
        readOnly
        canShare
        canDelete
        onShare={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.queryByText('Share')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(
      screen.getByText('You have view-only access to this instruction.')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('My persona')).toBeDisabled();
  });

  test('disables Save while loading and when the text is empty', () => {
    const { rerender } = render(<InstructionEditor {...baseProps} isLoading />);
    expect(screen.getByText('Saving…').closest('button')).toBeDisabled();

    rerender(<InstructionEditor {...baseProps} instructionText="   " />);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });

  test('fires callbacks for save, back and input changes', async () => {
    const onBack = jest.fn();
    render(<InstructionEditor {...baseProps} onBack={onBack} />);

    await userEvent.click(screen.getByText('Save'));
    expect(baseProps.onSave).toHaveBeenCalled();

    await userEvent.click(screen.getByText('← Back'));
    expect(onBack).toHaveBeenCalled();

    await userEvent.type(screen.getByDisplayValue('My persona'), '!');
    expect(baseProps.onNameChange).toHaveBeenCalledWith('My persona!');

    await userEvent.type(screen.getByTestId('mock-text-editor'), '!');
    expect(baseProps.onInstructionTextChange).toHaveBeenCalledWith(
      'Be helpful.!'
    );
  });

  test('overrides default labels', () => {
    render(
      <InstructionEditor
        {...baseProps}
        isNew
        labels={{ createTitle: 'New public instruction', save: 'Publish' }}
      />
    );

    expect(screen.getByText('New public instruction')).toBeInTheDocument();
    expect(screen.getByText('Publish')).toBeInTheDocument();
  });
});
