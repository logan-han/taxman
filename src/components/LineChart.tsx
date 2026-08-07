import { useId, useRef, useState } from 'react';

/**
 * Minimal SVG time-series chart: stacked areas or plain lines, year axis,
 * recessive grid, legend, and a crosshair tooltip (nearest point readout).
 * One y-axis only. Series colours are validated categorical tokens.
 */

export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
  /** stack this series on the previous stacked one */
  stacked?: boolean;
}

interface Props {
  /** fractional calendar years, same length as each series' values */
  times: number[];
  series: ChartSeries[];
  height?: number;
  formatValue: (v: number) => string;
  /** extra tooltip lines for the hovered index */
  tooltipExtras?: (index: number) => string[];
  ariaLabel: string;
}

const W = 720;
const PAD = { top: 12, right: 12, bottom: 26, left: 56 };

function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) ticks.push(v);
  return ticks;
}

export function LineChart({ times, series, height = 240, formatValue, tooltipExtras, ariaLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const clipId = useId();

  if (times.length < 2) return null;

  const H = height;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // build stacked value matrix
  const zeros: number[] = new Array(times.length).fill(0);
  const stackedValues: number[][] = [];
  let prevStack: number[] = zeros;
  for (const s of series) {
    const base: number[] = s.stacked ? prevStack : zeros;
    const top: number[] = s.values.map((v, i) => base[i] + v);
    stackedValues.push(top);
    prevStack = top;
  }

  const yMax = Math.max(...stackedValues.flat(), 1) * 1.05;
  const x = (t: number) =>
    PAD.left + ((t - times[0]) / (times[times.length - 1] - times[0])) * plotW;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  const yearStep = Math.ceil((times[times.length - 1] - times[0]) / 6);
  const firstYear = Math.ceil(times[0]);
  const yearTicks: number[] = [];
  for (let yr = firstYear; yr <= times[times.length - 1]; yr += yearStep) yearTicks.push(yr);

  const pathFor = (tops: number[]) =>
    tops.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join('');

  const areaFor = (tops: number[], bases: number[]) =>
    `${pathFor(tops)}L${x(times[times.length - 1]).toFixed(1)},${y(bases[bases.length - 1]).toFixed(1)}` +
    bases
      .map((_, i) => {
        const j = bases.length - 1 - i;
        return `L${x(times[j]).toFixed(1)},${y(bases[j]).toFixed(1)}`;
      })
      .join('') +
    'Z';

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (px - PAD.left) / plotW));
    const t = times[0] + frac * (times[times.length - 1] - times[0]);
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < times.length; i++) {
      const d = Math.abs(times[i] - t);
      if (d < best) {
        best = d;
        idx = i;
      }
    }
    setHover(idx);
  };

  const hoverX = hover !== null ? x(times[hover]) : 0;
  const tooltipLeft = hover !== null && hoverX > W * 0.62;

  return (
    <div className="chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <clipPath id={clipId}>
          <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
        </clipPath>

        {niceTicks(yMax).map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--pay-card-border)"
              strokeWidth={v === 0 ? 1.5 : 1}
            />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="chart__tick">
              {formatValue(v)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" className="chart__tick">
            {yr}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {series.map((s, si) => {
            const tops = stackedValues[si];
            const bases =
              s.stacked && si > 0 ? stackedValues[si - 1] : new Array(times.length).fill(0);
            return (
              <g key={s.label}>
                {s.stacked && (
                  <path d={areaFor(tops, bases)} fill={s.color} opacity={0.18} />
                )}
                <path d={pathFor(tops)} fill="none" stroke={s.color} strokeWidth={2} />
              </g>
            );
          })}
          {hover !== null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--pay-text-secondary)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {hover !== null &&
            series.map((s, si) => (
              <circle
                key={s.label}
                cx={hoverX}
                cy={y(stackedValues[si][hover])}
                r={4}
                fill={s.color}
                stroke="var(--pay-bg-paper)"
                strokeWidth={2}
              />
            ))}
        </g>
      </svg>

      {hover !== null && (
        <div
          className="chart__tooltip"
          style={tooltipLeft ? { right: `${100 - (hoverX / W) * 100}%` } : { left: `${(hoverX / W) * 100}%` }}
        >
          <b>{Math.floor(times[hover])}</b>
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label} <b>{formatValue(s.values[hover])}</b>
            </span>
          ))}
          {tooltipExtras?.(hover).map((line) => <span key={line}>{line}</span>)}
        </div>
      )}

      <div className="chart__legend">
        {series.map((s) => (
          <span key={s.label} className="chart__legend-item">
            <i style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
