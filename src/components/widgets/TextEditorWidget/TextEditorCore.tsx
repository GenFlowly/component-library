import React from 'react';
import '@uiw/react-markdown-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import MarkdownEditor, {
  type IMarkdownEditor,
  type MarkdownEditorRef,
} from '@uiw/react-markdown-editor';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { completionPopupExtensions } from './completionPopup';
import styles from './TextEditor.module.scss';

// The editor forwards its ref (that's what MarkdownEditorRef exists for) but
// its published type is a plain FC that hides it — recover the real shape
const MarkdownEditorWithRef =
  MarkdownEditor as unknown as React.ForwardRefExoticComponent<
    IMarkdownEditor & React.RefAttributes<MarkdownEditorRef>
  >;

// Stable extension arrays: an inline array would get a new identity every
// render, making the editor reconfigure itself on every keystroke.
const EDITABLE_EXTENSIONS = [
  EditorView.lineWrapping,
  ...completionPopupExtensions,
];
const READONLY_EXTENSIONS = [
  EditorView.lineWrapping,
  EditorView.editable.of(false),
  EditorState.readOnly.of(true),
];

interface TextEditorCoreProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disableCache?: boolean;
  height?: string;
  className?: string;
  'data-testid'?: string;
  readOnly?: boolean;
  maxLength?: number;
  // 'composer': a bare text area for a host that draws its own box
  variant?: 'default' | 'seamless' | 'composer';
  fullWidth?: boolean;
  compact?: boolean;
  placeholder?: string;
}

/** Imperative surface the editor exposes to its host (via ref). */
export interface TextEditorHandle {
  /** Focus the editor with the caret after the last character. */
  focusEnd: () => void;
}

const TextEditorCore = React.forwardRef<TextEditorHandle, TextEditorCoreProps>(
  function TextEditorCore(
    {
      id,
      value,
      onChange,
      disableCache = false,
      height = '50vh',
      className = '',
      'data-testid': testId,
      readOnly = false,
      maxLength,
      variant = 'default',
      fullWidth = false,
      compact = false,
      placeholder,
    }: TextEditorCoreProps,
    ref
  ): React.ReactElement {
    const editorRef = React.useRef<MarkdownEditorRef>(null);

    React.useImperativeHandle(ref, () => ({
      focusEnd: () => {
        const view = editorRef.current?.editor?.current?.view;
        if (!view) return;
        view.focus();
        view.dispatch({
          selection: { anchor: view.state.doc.length },
          scrollIntoView: true,
        });
      },
    }));

    const handleChange = React.useCallback(
      (newValue: string) => {
        if (maxLength && newValue.length > maxLength) {
          onChange(newValue.slice(0, maxLength));
        } else {
          onChange(newValue);
        }
      },
      [maxLength, onChange]
    );

    return (
      <div
        className={`${styles.container} ${variant !== 'default' ? styles[variant] : ''} ${fullWidth ? styles.fullWidth : ''} ${compact ? styles.compact : ''} ${className}`}
        data-testid={testId}
        style={height === '100%' ? { height: '100%' } : {}}
      >
        <div
          className={styles.editorWrapper}
          style={height === '100%' ? { height: '100%' } : {}}
        >
          <div
            className={styles.innerContainer}
            style={height === '100%' ? { height: '100%' } : {}}
          >
            {/* Ghost spacer for perfect centering */}
            <div className={styles.spacer} />
            <div
              className={styles.mdxEditorRoot}
              style={
                height === '100%'
                  ? { height: '100%', display: 'flex', flexDirection: 'column' }
                  : {}
              }
            >
              <MarkdownEditorWithRef
                ref={editorRef}
                value={value}
                onChange={handleChange}
                height={height}
                visible={false}
                enablePreview={false}
                showToolbar={false}
                placeholder={placeholder}
                className={styles.markdownEditor}
                extensions={
                  readOnly ? READONLY_EXTENSIONS : EDITABLE_EXTENSIONS
                }
              />
            </div>
            <div className={styles.controlsRow}></div>
          </div>
        </div>
      </div>
    );
  }
);

export default TextEditorCore;
