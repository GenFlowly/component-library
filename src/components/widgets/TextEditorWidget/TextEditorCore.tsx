import React from 'react';
import '@uiw/react-markdown-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import MarkdownEditor from '@uiw/react-markdown-editor';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import styles from './TextEditor.module.scss';

// Stable extension arrays: an inline array would get a new identity every
// render, making the editor reconfigure itself on every keystroke.
const EDITABLE_EXTENSIONS = [EditorView.lineWrapping];
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
  variant?: 'default' | 'seamless';
  fullWidth?: boolean;
}

export default function TextEditorCore({
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
}: TextEditorCoreProps): React.ReactElement {
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
      className={`${styles.container} ${variant === 'seamless' ? styles.seamless : ''} ${fullWidth ? styles.fullWidth : ''} ${className}`}
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
            <MarkdownEditor
              value={value}
              onChange={handleChange}
              height={height}
              visible={false}
              enablePreview={false}
              showToolbar={false}
              className={styles.markdownEditor}
              extensions={readOnly ? READONLY_EXTENSIONS : EDITABLE_EXTENSIONS}
            />
          </div>
          <div className={styles.controlsRow}></div>
        </div>
      </div>
    </div>
  );
}
