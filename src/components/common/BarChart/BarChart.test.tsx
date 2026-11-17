import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import BarChart from './BarChart';
import { bucketDailySeries } from '../../../utils/dailySeries';

const usd = (value: number) => `$${value.toFixed(2)}`;

describe('bucketDailySeries', () => {
  test('one bar per day with missing days as zero', () => {
    const series = bucketDailySeries(
      [
        { date: '2026-11-01', value: 0.2, count: 17 },
        { date: '2026-11-03', value: 0.1, count: 4 },
      ],
      '2026-11-01',
      '2026-11-03'
    );
    expect(series.bucket).toBe('day');
    expect(series.buckets.map(b => [b.start, b.value, b.count])).toEqual([
      ['2026-11-01', 0.2, 17],
      ['2026-11-02', 0, 0],
      ['2026-11-03', 0.1, 4],
    ]);
  });

  test('ranges over 60 days become weeks: 90 days read as 13 bars', () => {
    const series = bucketDailySeries(
      [
        { date: '2026-08-20', value: 1, count: 1 },
        { date: '2026-08-26', value: 2, count: 1 },
        { date: '2026-08-27', value: 4, count: 1 },
      ],
      '2026-08-20',
      '2026-11-17'
    );
    expect(series.bucket).toBe('week');
    expect(series.buckets).toHaveLength(13);
    expect(series.buckets[0]).toEqual({
      start: '2026-08-20',
      end: '2026-08-26',
      value: 3,
      count: 2,
    });
    expect(series.buckets[1].value).toBe(4);
    expect(series.buckets[12].end).toBe('2026-11-17');
  });

  test('a backwards range is empty', () => {
    expect(bucketDailySeries([], '2026-11-02', '2026-11-01').buckets).toEqual(
      []
    );
  });
});

describe('BarChart', () => {
  const points = [
    {
      key: 'a',
      value: 0.1,
      axisLabel: 'Nov 1',
      tooltipTitle: 'Sun, Nov 1',
      tooltipDetail: '3 requests',
    },
    {
      key: 'b',
      value: 0.43,
      axisLabel: 'Nov 2',
      tooltipTitle: 'Mon, Nov 2',
      tooltipDetail: '15 requests',
    },
    { key: 'c', value: 0, axisLabel: 'Nov 3', tooltipTitle: 'Tue, Nov 3' },
  ];

  test('labels the tallest bar and carries every figure in a hidden table', () => {
    render(
      <BarChart
        points={points}
        formatValue={usd}
        aria-label="Cost per day"
        data-testid="chart"
      />
    );
    expect(
      screen.getByRole('img', { name: 'Cost per day' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('$0.43').length).toBeGreaterThan(0);
    const table = screen.getByRole('table', { name: 'Cost per day' });
    expect(within(table).getByText('Mon, Nov 2')).toBeInTheDocument();
    expect(within(table).getByText('15 requests')).toBeInTheDocument();
  });

  test('hovering a bar shows its tooltip; arrow keys move between bars', () => {
    render(
      <BarChart
        points={points}
        formatValue={usd}
        aria-label="Cost per day"
        data-testid="chart"
      />
    );
    fireEvent.mouseEnter(screen.getByTestId('chart-bar-0'));
    expect(screen.getAllByText('Sun, Nov 1').length).toBe(2);
    expect(screen.getByText('$0.10 · 3 requests')).toBeInTheDocument();

    const svg = screen.getByRole('img', { name: 'Cost per day' });
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByText('$0.43 · 15 requests')).toBeInTheDocument();
  });

  test('renders nothing without points', () => {
    const { container } = render(
      <BarChart points={[]} formatValue={usd} aria-label="Cost per day" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
