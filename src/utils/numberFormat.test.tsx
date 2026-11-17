import { formatCompactCount, formatCount } from './numberFormat';

describe('formatCount', () => {
  test('groups thousands', () => {
    expect(formatCount(486400)).toBe('486,400');
    expect(formatCount(0)).toBe('0');
  });
});

describe('formatCompactCount', () => {
  test('keeps every digit below a million', () => {
    expect(formatCompactCount(999_999)).toBe('999,999');
    expect(formatCompactCount(226_100)).toBe('226,100');
  });

  test('rounds a million and up to one decimal with M', () => {
    expect(formatCompactCount(1_000_000)).toBe('1M');
    expect(formatCompactCount(1_702_300)).toBe('1.7M');
    expect(formatCompactCount(17_120_000)).toBe('17.1M');
    expect(formatCompactCount(2_049_999)).toBe('2M');
  });

  test('moves to B instead of reading 1000M', () => {
    expect(formatCompactCount(999_960_000)).toBe('1B');
    expect(formatCompactCount(1_240_000_000)).toBe('1.2B');
  });

  test('keeps the sign', () => {
    expect(formatCompactCount(-3_400_000)).toBe('-3.4M');
  });
});
