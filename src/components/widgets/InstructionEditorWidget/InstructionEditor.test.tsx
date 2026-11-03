import React from 'react';
import { act, render, screen } from '@testing-library/react';
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

  test('shows Delete and Save for an owner editing an instruction', () => {
    render(<InstructionEditor {...baseProps} canDelete onDelete={jest.fn()} />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('hides Delete when creating a new instruction', () => {
    render(
      <InstructionEditor {...baseProps} isNew canDelete onDelete={jest.fn()} />
    );

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('hides Delete when canDelete is false', () => {
    render(<InstructionEditor {...baseProps} />);

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  test('readOnly hides all actions, disables inputs and shows the banner', () => {
    render(
      <InstructionEditor
        {...baseProps}
        readOnly
        canDelete
        onDelete={jest.fn()}
      />
    );

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

  test('fires callbacks for save and input changes', async () => {
    render(<InstructionEditor {...baseProps} />);

    await userEvent.click(screen.getByText('Save'));
    expect(baseProps.onSave).toHaveBeenCalled();

    await userEvent.type(screen.getByDisplayValue('My persona'), '!');
    expect(baseProps.onNameChange).toHaveBeenCalledWith('My persona!');

    await userEvent.type(screen.getByTestId('mock-text-editor'), '!');
    expect(baseProps.onInstructionTextChange).toHaveBeenCalledWith(
      'Be helpful.!'
    );
  });

  test('always renders the version sidebar and stars the latest version', () => {
    render(
      <InstructionEditor
        {...baseProps}
        versions={[{ version: 2, details: 'Latest name' }, { version: 1 }]}
        selectedVersion={2}
      />
    );
    expect(screen.getByText('Versions')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Latest name')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2').closest('button')).toHaveAttribute(
      'aria-current',
      'true'
    );

    // Latest is marked with a starred label and tooltip, not a "Latest" badge
    expect(screen.queryByText('Latest')).not.toBeInTheDocument();
    const star = screen.getByText('*');
    expect(star).toHaveAttribute('title', 'latest version');
    expect(screen.getByText('v2').closest('button')).toContainElement(star);
    expect(screen.getByText('v1').closest('button')).not.toContainElement(star);
  });

  test('renders icon, color swatch, role, category and tags in the main section', () => {
    render(
      <InstructionEditor
        {...baseProps}
        icon="🔍⚡"
        color="#059669"
        role="OWNER"
        category="Research"
        tags={['physics', 'citations']}
        data-testid="editor"
      />
    );

    const meta = screen.getByTestId('editor-meta');
    expect(meta).toContainElement(screen.getByText('🔍⚡'));
    expect(screen.getByTestId('editor-color')).toHaveStyle(
      'background-color: #059669'
    );
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('#physics')).toBeInTheDocument();
    expect(screen.getByText('#citations')).toBeInTheDocument();

    // Role is not a chip: it renders top-right as "Access Level: <role>"
    const accessLevel = screen.getByTestId('editor-access-level');
    expect(accessLevel).toHaveTextContent('Access Level: OWNER');
    expect(meta).not.toContainElement(screen.getByText('OWNER'));
  });

  test('omits the metadata row when no metadata is passed', () => {
    render(<InstructionEditor {...baseProps} data-testid="editor" />);
    expect(screen.queryByTestId('editor-meta')).not.toBeInTheDocument();
  });

  test('selecting a version fires onSelectVersion', async () => {
    const onSelectVersion = jest.fn();
    render(
      <InstructionEditor
        {...baseProps}
        versions={[{ version: 2 }, { version: 1 }]}
        selectedVersion={2}
        onSelectVersion={onSelectVersion}
      />
    );

    await userEvent.click(screen.getByText('v1'));
    expect(onSelectVersion).toHaveBeenCalledWith(1);
  });

  test('shows the empty state when no versions are passed', () => {
    render(<InstructionEditor {...baseProps} />);
    expect(screen.getByText('Versions')).toBeInTheDocument();
    expect(screen.getByText('No versions yet.')).toBeInTheDocument();
  });

  test('overrides default labels', () => {
    render(
      <InstructionEditor
        {...baseProps}
        isNew
        labels={{ save: 'Publish', versionsTitle: 'History' }}
      />
    );

    expect(screen.getByText('Publish')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  describe('on a phone', () => {
    const desktopWidth = window.innerWidth;
    const versions = [
      { version: 2, details: 'Newest' },
      { version: 1, details: 'Oldest' },
    ];

    const setWidth = (width: number) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    beforeEach(() => setWidth(402));
    afterEach(() => setWidth(desktopWidth));

    const renderPhone = (props: object = {}) =>
      render(
        <InstructionEditor
          {...baseProps}
          data-testid="editor"
          versions={versions}
          selectedVersion={2}
          {...props}
        />
      );

    test('keeps the fields clear: versions stay closed behind a row showing the current one', () => {
      renderPhone();

      expect(
        screen.queryByTestId('editor-versions-sidebar')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Oldest')).not.toBeInTheDocument();
      const toggle = screen.getByTestId('editor-versions-toggle');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveTextContent('v2');
    });

    test('picking a version selects it and closes the dropdown', async () => {
      const onSelectVersion = jest.fn();
      renderPhone({ onSelectVersion });

      await userEvent.click(screen.getByTestId('editor-versions-toggle'));
      expect(screen.getByTestId('editor-versions-toggle')).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      await userEvent.click(screen.getByTestId('editor-version-1'));

      expect(onSelectVersion).toHaveBeenCalledWith(1);
      expect(screen.queryByText('Oldest')).not.toBeInTheDocument();
    });

    test('tapping outside closes the dropdown', async () => {
      renderPhone();

      await userEvent.click(screen.getByTestId('editor-versions-toggle'));
      expect(screen.getByText('Oldest')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('editor-versions-backdrop'));

      expect(screen.queryByText('Oldest')).not.toBeInTheDocument();
    });

    test('a new instruction has no versions row', () => {
      renderPhone({ isNew: true, versions: [], selectedVersion: undefined });

      expect(
        screen.queryByTestId('editor-versions-toggle')
      ).not.toBeInTheDocument();
    });
  });
});
