import React, { useEffect, useRef, useState } from 'react';
import styles from './BarChart.module.scss';

export interface BarChartPoint {
  key: string;
  value: number;
  /** Text under the bar when there is room ("Nov 3"). */
  axisLabel: string;
  /** First tooltip line ("Tue, Nov 3"). */
  tooltipTitle: string;
  /** Second tooltip line ("15 requests"). */
  tooltipDetail?: string;
}

export interface BarChartProps {
  points: BarChartPoint[];
  formatValue: (value: number) => string;
  /** Names the chart for screen readers, e.g. "Cost per day". */
  'aria-label': string;
  /** @default 196 */
  height?: number;
  'data-testid'?: string;
}

const MARGIN = { top: 18, right: 6, bottom: 24, left: 50 };
const MAX_AXIS_LABELS = 6;
const TOOLTIP_HEIGHT = 40;

/** Rounds up to 1, 2, 2.5 or 5 × 10ⁿ so two gridline steps cover the max. */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const raw = max / 2;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= raw) ??
    10 * magnitude;
  return step * 2;
}

/** A bar with only its top corners rounded. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const bottom = y + h;
  return `M${x},${bottom} V${y + r} a${r},${r} 0 0 1 ${r},${-r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${bottom} Z`;
}

/**
 * A single-series bar chart for spend over time: one blue bar per day or
 * week, three gridlines, the tallest bar labelled, and a tooltip on hover or
 * keyboard focus (arrow keys move between bars). A hidden table carries the
 * same figures for screen readers.
 */
export default function BarChart({
  points,
  formatValue,
  'aria-label': ariaLabel,
  height = 196,
  'data-testid': testId,
}: BarChartProps): React.ReactElement | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (points.length === 0) return null;

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotHeight;
  const maxValue = Math.max(...points.map(point => point.value));
  const top = niceMax(maxValue);
  const slot = plotWidth / points.length;
  const barWidth = Math.max(Math.min(16, slot * 0.6), 2);
  const labelEvery = Math.ceil(points.length / MAX_AXIS_LABELS);
  const maxIndex = points.findIndex(point => point.value === maxValue);
  const yFor = (value: number) => baseline - (value / top) * plotHeight;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    setActive(current => {
      const from = current ?? (step > 0 ? -1 : points.length);
      return Math.min(Math.max(from + step, 0), points.length - 1);
    });
  };

  const activePoint = active != null ? points[active] : null;
  let tooltip: React.ReactNode = null;
  if (activePoint && active != null) {
    const text = `${activePoint.tooltipTitle}`;
    const detail = `${formatValue(activePoint.value)}${activePoint.tooltipDetail ? ` · ${activePoint.tooltipDetail}` : ''}`;
    const tooltipWidth = Math.max(text.length, detail.length) * 6.4 + 20;
    const centre = MARGIN.left + slot * active + slot / 2;
    const x = Math.min(
      Math.max(centre - tooltipWidth / 2, MARGIN.left),
      width - MARGIN.right - tooltipWidth
    );
    const y = Math.max(yFor(activePoint.value) - TOOLTIP_HEIGHT - 8, 0);
    tooltip = (
      <g className={styles.tooltip} pointerEvents="none">
        <rect x={x} y={y} width={tooltipWidth} height={TOOLTIP_HEIGHT} rx={6} />
        <text x={x + 10} y={y + 16} className={styles.tooltipTitle}>
          {text}
        </text>
        <text x={x + 10} y={y + 31} className={styles.tooltipDetail}>
          {detail}
        </text>
      </g>
    );
  }

  return (
    <div ref={containerRef} className={styles.chart} data-testid={testId}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
        className={styles.svg}
      >
        {[0, 0.5, 1].map(fraction => {
          const y = yFor(top * fraction);
          return (
            <g key={fraction}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y}
                y2={y}
                className={fraction === 0 ? styles.baseline : styles.grid}
              />
              <text
                x={MARGIN.left - 6}
                y={y}
                className={styles.axis}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatValue(top * fraction)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => {
          const x = MARGIN.left + slot * index + (slot - barWidth) / 2;
          const y = yFor(point.value);
          const barHeight = baseline - y;
          return (
            <g key={point.key}>
              <rect
                x={MARGIN.left + slot * index}
                y={MARGIN.top}
                width={slot}
                height={plotHeight}
                className={styles.hit}
                onMouseEnter={() => setActive(index)}
                data-testid={testId ? `${testId}-bar-${index}` : undefined}
              />
              {barHeight > 0 && (
                <path
                  d={barPath(x, y, barWidth, barHeight)}
                  className={`${styles.bar} ${active === index ? styles.barActive : ''}`}
                  pointerEvents="none"
                />
              )}
              {index === maxIndex && maxValue > 0 && active == null && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  className={styles.label}
                  textAnchor="middle"
                >
                  {formatValue(point.value)}
                </text>
              )}
              {index % labelEvery === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={baseline + 16}
                  className={styles.axis}
                  textAnchor="middle"
                >
                  {point.axisLabel}
                </text>
              )}
            </g>
          );
        })}
        {tooltip}
      </svg>
      <table className={styles.srOnly}>
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map(point => (
            <tr key={point.key}>
              <th scope="row">{point.tooltipTitle}</th>
              <td>{formatValue(point.value)}</td>
              {point.tooltipDetail && <td>{point.tooltipDetail}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
