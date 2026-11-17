import type { Meta, StoryObj } from '@storybook/react';
import BarChart, { BarChartPoint } from './BarChart';
import { bucketDailySeries } from '../../../utils/dailySeries';

const DAY = 86_400_000;
const isoDaysBefore = (end: string, days: number) =>
  new Date(Date.parse(`${end}T00:00:00Z`) - days * DAY)
    .toISOString()
    .slice(0, 10);
const label = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

function series(days: number): BarChartPoint[] {
  const to = '2026-11-17';
  const from = isoDaysBefore(to, days - 1);
  const daily = Array.from({ length: days }, (_, i) => ({
    date: isoDaysBefore(to, i),
    value: ((i * 37) % 11) / 20,
    count: (i * 7) % 13,
  }));
  const { bucket, buckets } = bucketDailySeries(daily, from, to);
  return buckets.map(b => ({
    key: b.start,
    value: b.value,
    axisLabel: label(b.start),
    tooltipTitle:
      bucket === 'week'
        ? `${label(b.start)} – ${label(b.end)}`
        : label(b.start),
    tooltipDetail: `${b.count} requests`,
  }));
}

const usd = (value: number) => `$${value.toFixed(2)}`;

const meta: Meta<typeof BarChart> = {
  title: 'Components/Settings/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A single-series bar chart for cost per day. It fills its container's width, draws three gridlines, labels the tallest bar, and shows a tooltip on hover or with the arrow keys. A hidden table carries the same numbers for screen readers. Build the bars with \`bucketDailySeries\`: ranges over 60 days become weekly bars.`,
      },
    },
  },
  args: { formatValue: usd, 'aria-label': 'Cost per day' },
};
export default meta;

type Story = StoryObj<typeof BarChart>;

export const SevenDays: Story = { args: { points: series(7) } };
export const ThirtyDays: Story = { args: { points: series(30) } };
export const NinetyDaysAsWeeks: Story = {
  args: { points: series(90), 'aria-label': 'Cost per week' },
};
