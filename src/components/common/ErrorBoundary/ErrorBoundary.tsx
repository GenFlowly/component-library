import React from 'react';
import styles from './ErrorBoundary.module.scss';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Replaces the default fallback. A function receives the caught error. */
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /**
   * Changing this value after a catch remounts [children] fresh (e.g. pass
   * the id of whatever is rendered inside) — otherwise the fallback sticks
   * for the lifetime of this component instance, since React keeps reusing
   * it across re-renders at the same tree position.
   */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export type ErrorBoundaryReporter = (
  error: Error,
  info: React.ErrorInfo
) => void;

let reporter: ErrorBoundaryReporter | undefined;

/**
 * Sends every error any ErrorBoundary catches to [next] (e.g. a crash
 * reporter), including boundaries deep inside library widgets that the app
 * can't pass an onError to. Pass undefined to stop.
 */
export function setErrorBoundaryReporter(
  next: ErrorBoundaryReporter | undefined
): void {
  reporter = next;
}

/**
 * Stops a render-time throw from blanking the whole app. React only catches
 * render errors at a class-component boundary (no hook equivalent) — wrap
 * any subtree rendering content this app doesn't fully control (markdown /
 * third-party data) so one bad item degrades to an inline fallback instead
 * of taking the page down.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error(
      'ErrorBoundary caught a render error',
      error,
      info.componentStack
    );
    reporter?.(error, info);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') return fallback(error);
    if (fallback !== undefined) return fallback;

    return (
      <div
        className={styles.fallback}
        role="alert"
        data-testid="error-boundary-fallback"
      >
        Something went wrong rendering this content.
      </div>
    );
  }
}

export default ErrorBoundary;
