import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ErrorBoundary, setErrorBoundaryReporter } from './ErrorBoundary';

function Boom(): React.ReactElement {
  throw new Error('render blew up');
}

describe('ErrorBoundary', () => {
  // getDerivedStateFromError logs to the console via React's own dev
  // warning path regardless of our componentDidCatch — silence it so the
  // test output isn't noise, without hiding assertions on our own calls.
  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    setErrorBoundaryReporter(undefined);
  });

  test('sends a caught error to the registered reporter as well as onError', () => {
    const reporter = jest.fn();
    const onError = jest.fn();
    setErrorBoundaryReporter(reporter);
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>
    );

    expect(reporter).toHaveBeenCalledTimes(1);
    expect(reporter.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(reporter.mock.calls[0][1].componentStack).toEqual(
      expect.any(String)
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });

  test('stops reporting once the reporter is cleared', () => {
    const reporter = jest.fn();
    setErrorBoundaryReporter(reporter);
    setErrorBoundaryReporter(undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(reporter).not.toHaveBeenCalled();
  });

  test('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">ok</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('ok');
  });

  test('renders the default fallback and calls onError when a child throws', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  test('renders a custom fallback node', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">custom fallback</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  test('renders a custom fallback function with the caught error', () => {
    render(
      <ErrorBoundary
        fallback={error => <div data-testid="custom">{error.message}</div>}
      >
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('render blew up');
  });

  test('clears the caught error once resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();

    rerender(
      <ErrorBoundary resetKey="b">
        <div data-testid="child">recovered</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('recovered');
  });
});
