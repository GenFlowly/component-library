/** One day's figure from an API, keyed by UTC date ("YYYY-MM-DD"). */
export interface DailyValue {
  date: string;
  value: number;
  /** A secondary count shown in tooltips, e.g. requests. */
  count?: number;
}

/** One bar: a single day, or a week of days for long ranges. */
export interface SeriesBucket {
  /** First UTC date in the bucket. */
  start: string;
  /** Last UTC date in the bucket (same as start for a day). */
  end: string;
  value: number;
  count: number;
}

export interface BucketedSeries {
  bucket: 'day' | 'week';
  buckets: SeriesBucket[];
}

const DAY_MS = 86_400_000;

const toUtcMs = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`);
const toIsoDate = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10);

/**
 * Turns sparse per-day values into one bar per day from `from` to `to`
 * (UTC dates, inclusive), missing days as zero. Ranges longer than
 * `maxDailyBars` days are grouped into 7-day buckets starting at `from`, so a
 * 90-day range reads as 13 weeks.
 */
export function bucketDailySeries(
  days: DailyValue[],
  from: string,
  to: string,
  maxDailyBars = 60
): BucketedSeries {
  const start = toUtcMs(from);
  const end = toUtcMs(to);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return { bucket: 'day', buckets: [] };
  }
  const byDate = new Map<string, DailyValue>();
  days.forEach(day => byDate.set(day.date, day));

  const dayCount = Math.round((end - start) / DAY_MS) + 1;
  const size = dayCount > maxDailyBars ? 7 : 1;
  const buckets: SeriesBucket[] = [];
  for (let offset = 0; offset < dayCount; offset += size) {
    const bucketStart = start + offset * DAY_MS;
    const bucketEnd = Math.min(bucketStart + (size - 1) * DAY_MS, end);
    let value = 0;
    let count = 0;
    for (let ms = bucketStart; ms <= bucketEnd; ms += DAY_MS) {
      const day = byDate.get(toIsoDate(ms));
      value += day?.value ?? 0;
      count += day?.count ?? 0;
    }
    buckets.push({
      start: toIsoDate(bucketStart),
      end: toIsoDate(bucketEnd),
      value,
      count,
    });
  }
  return { bucket: size === 1 ? 'day' : 'week', buckets };
}
