import React from 'react';
import { render } from '@testing-library/react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import TextEditorCore from './TextEditorCore';

// jest.setup.js stubs CodeMirror out; these tests read real extensions
jest.unmock('@codemirror/view');
jest.unmock('@codemirror/state');

const mockEditorProps: any[] = [];
jest.mock('@uiw/react-markdown-editor', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef((props: any, _ref: any) => {
      mockEditorProps.push(props);
      return <div data-testid="markdown-editor" />;
    }),
  };
});

const lastEditorProps = () => mockEditorProps[mockEditorProps.length - 1];

// The bottom scroll margins the editor's extensions ask CodeMirror to keep
const bottomScrollMargins = (extensions: any) =>
  EditorState.create({ extensions })
    .facet(EditorView.scrollMargins)
    .map(source => source({} as EditorView)?.bottom);

describe('TextEditorCore', () => {
  beforeEach(() => {
    mockEditorProps.length = 0;
  });

  test('the composer keeps its host controls in view below the caret', () => {
    render(
      <TextEditorCore
        id="e"
        value=""
        onChange={jest.fn()}
        variant="composer"
        height="auto"
      />
    );

    expect(bottomScrollMargins(lastEditorProps().extensions)).toEqual([64]);
    expect(lastEditorProps().height).toBe('auto');
  });

  test('other editors keep no extra room', () => {
    render(<TextEditorCore id="e" value="" onChange={jest.fn()} />);

    expect(bottomScrollMargins(lastEditorProps().extensions)).toEqual([]);
  });
});
