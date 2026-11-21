import { Activity, TrendingUp, Users } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';
import type { Month } from '../../shared/content';
import styles from './Analytics.module.css';

export const integer = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function monthLabel(month: string, long = false) {
  return (long ? longDate : shortDate).format(new Date(month + '-01T00:00:00Z'));
}

export const metrics = {
  revenue: { label: 'Pendapatan', color: '#395bd6', icon: TrendingUp, total: (v: number) => 'Rp' + compact.format(v), value: currency.format, tick: compact.format },
  visits: { label: 'Kunjungan', color: '#087b66', icon: Users, total: compact.format, value: integer.format, tick: compact.format },
  conversion: { label: 'Konversi', color: '#7546ac', icon: Activity, total: (v: number) => decimal.format(v) + '%', value: (v: number) => decimal.format(v) + '%', tick: (v: number) => compact.format(v) + '%' },
};
export type Metric = keyof typeof metrics;
export const metricKeys = ['revenue', 'visits', 'conversion'] as const;

export function formatMetric(metric: Metric, value: number | null, short = false) {
  if (value === null) return '—';
  return short ? metrics[metric].total(value) : metrics[metric].value(value);
}

function monthIndex(month: string) {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
}
function ceiling(max: number) {
  if (!max) return 4;
  const unit = 10 ** Math.floor(Math.log10(max / 4));
  return unit * Math.ceil(max / (unit * 4)) * 4;
}

export function TrendChart({ rows, metric }: { rows: Month[]; metric: Metric }) {
  const fillId = useId();
  const monthSelect = useId();
  const [focus, setFocus] = useState('');
  const spec = metrics[metric];
  const max = rows.reduce((largest, row) => Math.max(largest, row[metric] ?? 0), 0);
  const top = ceiling(max);
  const height = 190;
  const width = 640;
  if (!rows.length) return <p className={styles.chartState}>Tidak ada data untuk filter ini.</p>;
  if (rows.every((row) => row[metric] === null)) return <p className={styles.chartState}>Konversi belum tersedia karena jumlah kunjungan nol.</p>;

  const first = monthIndex(rows[0].month);
  const last = monthIndex(rows.at(-1)!.month);
  const xAt = (index: number) => last === first ? width / 2 : 8 + (width - 16) * (index - first) / (last - first);
  const ticks = [1, .75, .5, .25, 0].map((fraction) => fraction * top);
  const points = rows.flatMap((row) => {
    const value = row[metric];
    const index = monthIndex(row.month);
    return value === null ? [] : [{ index, month: row.month, x: xAt(index), y: height * (1 - value / top), value }];
  });
  const selected = points.find((point) => point.month === focus) ?? points.at(-1)!;
  const segments: (typeof points)[] = [];
  for (const point of points) {
    const previous = segments.at(-1);
    if (previous && previous.at(-1)!.index + 1 === point.index) previous.push(point);
    else segments.push([point]);
  }
  const crossesYear = rows[0].month.slice(0, 4) !== rows.at(-1)!.month.slice(0, 4);
  const tickRows = rows.length <= (crossesYear ? 3 : 6) ? rows : [rows[0], rows[Math.floor(rows.length / 2)], rows.at(-1)!];
  return (
    <figure className={styles.chart} aria-label={spec.label + ' per bulan'}>
      <div className={styles.ticks} aria-hidden="true">{ticks.map((tick) => <span key={tick}>{spec.tick(tick)}</span>)}</div>
      <div className={styles.plot}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={'Tren ' + spec.label + '. Rincian nilai tersedia di grafik dan tabel data bulanan.'}>
          <defs>
            <linearGradient id={fillId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={spec.color} stopOpacity=".23" />
              <stop offset="100%" stopColor={spec.color} stopOpacity=".025" />
            </linearGradient>
          </defs>
          {ticks.map((tick, index) => <line key={tick} x1="0" x2={width} y1={height * index / 4} y2={height * index / 4} stroke="#e2e7f1" vectorEffect="non-scaling-stroke" />)}
          {segments.filter((segment) => segment.length > 1).map((segment) => {
            const start = segment[0];
            const end = segment.at(-1)!;
            const line = segment.slice(1).reduce((path, point, i) => {
              const previous = segment[i];
              const middle = (point.x + previous.x) / 2;
              return path + ` C ${middle},${previous.y} ${middle},${point.y} ${point.x},${point.y}`;
            }, `M ${start.x},${start.y}`);
            return <g key={start.month}>
              <path d={line + ` L ${end.x},${height} H ${start.x} Z`} fill={'url(#' + fillId + ')'} />
              <path d={line} fill="none" stroke={spec.color} strokeWidth="2.7" vectorEffect="non-scaling-stroke" />
            </g>;
          })}
          <line x1={selected.x} x2={selected.x} y1={selected.y} y2={height} stroke={spec.color} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {points.map(({ month, x, y, value }) => (
            <ellipse key={month} cx={x} cy={y} rx={width / 180} ry="4" fill={month === selected.month ? spec.color : '#fff'} stroke={spec.color} strokeWidth="2" vectorEffect="non-scaling-stroke" onClick={() => setFocus(month)}>
              <title>{monthLabel(month)} · {spec.value(value)}</title>
            </ellipse>
          ))}
        </svg>
        <div className={styles.months} aria-hidden="true">
          {tickRows.map(({ month }) => <span key={month} style={{ left: (xAt(monthIndex(month)) / width * 100) + '%' }}>{crossesYear ? monthLabel(month) : monthLabel(month).split(' ')[0]}</span>)}
        </div>
      </div>
      <figcaption className={styles.annotation} style={{ '--highlight': spec.color } as CSSProperties}>
        <span aria-hidden="true" />
        <label htmlFor={monthSelect}>Bulan pada grafik</label>
        <select id={monthSelect} value={selected.month} onChange={(event) => setFocus(event.target.value)}>{points.map(({ month }) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select>
        <strong aria-live="polite">{spec.value(selected.value)}</strong>
      </figcaption>
    </figure>
  );
}
