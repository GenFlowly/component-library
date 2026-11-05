import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangePicker from './DateRangePicker';
import '@testing-library/jest-dom';

describe('DateRangePicker', () => {
  const mockOnChange = jest.fn();
  // Fixed "today" so preset math is deterministic regardless of when the
  // test actually runs.
  const maxDate = '2026-10-25';

  const defaultProps = {
    value: { from: '2026-09-26', to: maxDate }, // exactly "Last 30 days"
    onChange: mockOnChange,
    maxDate,
    'data-testid': 'usage-range',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the preset pills and both date inputs', () => {
    render(<DateRangePicker {...defaultProps} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByTestId('usage-range-from')).toHaveValue('2026-09-26');
    expect(screen.getByTestId('usage-range-to')).toHaveValue(maxDate);
  });

  test('gives the preset group the class that keeps it on one row on phones', () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.getByTestId('usage-range-presets')).toHaveClass('presets');
  });

  test('highlights the preset matching the current value', () => {
    render(<DateRangePicker {...defaultProps} />);

    expect(
      screen.getByTestId('usage-range-presets-option-30d')
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('usage-range-presets-option-7d')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('highlights no preset for a custom range', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        value={{ from: '2026-10-01', to: '2026-10-10' }}
      />
    );

    expect(screen.getByTestId('usage-range-presets-option-7d')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(
      screen.getByTestId('usage-range-presets-option-30d')
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByTestId('usage-range-presets-option-90d')
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking a preset reports the trailing range ending at maxDate', async () => {
    render(<DateRangePicker {...defaultProps} />);

    await userEvent.click(screen.getByTestId('usage-range-presets-option-7d'));

    expect(mockOnChange).toHaveBeenCalledWith({
      from: '2026-10-19',
      to: maxDate,
    });
  });

  test('editing the from field reports the new from, keeping to', () => {
    render(<DateRangePicker {...defaultProps} />);

    fireEvent.change(screen.getByTestId('usage-range-from'), {
      target: { value: '2026-10-01' },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      from: '2026-10-01',
      to: maxDate,
    });
  });

  test('editing from past the current to clamps to forward', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        value={{ from: '2026-10-01', to: '2026-10-05' }}
      />
    );

    fireEvent.change(screen.getByTestId('usage-range-from'), {
      target: { value: '2026-10-10' },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      from: '2026-10-10',
      to: '2026-10-10',
    });
  });

  test('editing the to field reports the new to, keeping from', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        value={{ from: '2026-10-01', to: '2026-10-05' }}
      />
    );

    fireEvent.change(screen.getByTestId('usage-range-to'), {
      target: { value: '2026-10-20' },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      from: '2026-10-01',
      to: '2026-10-20',
    });
  });

  test('editing to before the current from clamps from backward', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        value={{ from: '2026-10-05', to: '2026-10-10' }}
      />
    );

    fireEvent.change(screen.getByTestId('usage-range-to'), {
      target: { value: '2026-10-01' },
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      from: '2026-10-01',
      to: '2026-10-01',
    });
  });

  test('accepts custom presets with localized labels', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        presets={[{ id: '14d', label: 'Last 14 days', days: 14 }]}
      />
    );

    expect(screen.getByText('Last 14 days')).toBeInTheDocument();
    expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
  });
});
