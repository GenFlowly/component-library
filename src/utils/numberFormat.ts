const countFormatter = new Intl.NumberFormat('en-US');

/** A count with thousands separators: 486400 → "486,400". */
export function formatCount(value: number): string {
  return countFormatter.format(value);
}

const oneDecimal = (value: number): string =>
  (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');

/**
 * How every count in the apps reads (tokens, requests, searches): below a
 * million every digit shows ("486,400"); from a million up it is rounded to
 * one decimal with a suffix ("1.7M", "17.1M", "2M", "1.2B").
 */
export function formatCompactCount(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude < 1_000_000) return formatCount(value);
  const sign = value < 0 ? '-' : '';
  const millions = Math.round(magnitude / 100_000) / 10;
  if (millions < 1000) return `${sign}${oneDecimal(millions)}M`;
  return `${sign}${oneDecimal(magnitude / 1_000_000_000)}B`;
}
