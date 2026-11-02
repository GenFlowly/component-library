import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TextEditor.module.scss';

// Lazy load the heavy Markdown editor component
const TextEditorCore = lazy(() => import('./TextEditorCore'));

export type { TextEditorHandle } from './TextEditorCore';

interface TextEditorProps {
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
  // Fill the parent's width instead of the page-centered 75rem column
  fullWidth?: boolean;
  // Force the mobile/narrow layout regardless of @container match — for
  // callers that already have their own JS-driven narrow signal and need it
  // to be the single source of truth (see TextEditor.module.scss .compact)
  compact?: boolean;
}

const TextEditor = React.forwardRef<
  import('./TextEditorCore').TextEditorHandle,
  TextEditorProps
>(function TextEditor(
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
  }: TextEditorProps,
  ref
): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={
        <div
          className={`${styles.container} ${variant === 'seamless' ? styles.seamless : ''} ${fullWidth ? styles.fullWidth : ''} ${compact ? styles.compact : ''} ${className}`}
          data-testid={testId}
          style={height === '100%' ? { height: '100%' } : {}}
        >
          <div
            className={styles.editorWrapper}
            style={
              height === '100%'
                ? {
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
                : {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }
            }
          >
            <div style={{ color: 'var(--color-text-tertiary)' }}>
              {t('editor.textEditor.loadingEditor')}
            </div>
          </div>
        </div>
      }
    >
      <TextEditorCore
        ref={ref}
        id={id}
        value={value}
        onChange={onChange}
        disableCache={disableCache}
        height={height}
        className={className}
        data-testid={testId}
        readOnly={readOnly}
        maxLength={maxLength}
        variant={variant}
        fullWidth={fullWidth}
        compact={compact}
      />
    </Suspense>
  );
});

export default TextEditor;
