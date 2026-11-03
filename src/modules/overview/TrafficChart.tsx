import { useMemo, useState } from 'react';
import { datasets, formatNumber, storeLabels, type DatasetId, type PeriodId, type StoreId } from '../../data/overview';

type Metric = 'visits' | 'unique';

type Props = { datasetId: DatasetId; store: StoreId; period: PeriodId; metric: Metric };

const periodLabels: Record<PeriodId, string[]> = {
  today: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'],
  week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  month: ['01', '05', '10', '15', '20', '25', '30'],
};

function smoothPath(values: number[], x0: number, y0: number, width: number, height: number, max: number) {
  const points = values.map((value, index) => [x0 + index * width / (values.length - 1), y0 + height - height * value / max]);
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return { d, points };
}

export default function TrafficChart({ datasetId, store, period, metric }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const dataset = datasets[datasetId];
  const target = metric === 'visits'
    ? Math.round(dataset.stores[store].footfall * dataset.periodMultiplier[period])
    : Math.round(dataset.stores[store].uv * dataset.periodMultiplier[period]);

  const chart = useMemo(() => {
    const source = dataset.chart[period];
    const current = [...source.current];
    const prior = [...source.prior];
    const expected = target;
    const correction = expected / current.reduce((sum, value) => sum + value, 0);
    const scaled = current.map(value => value * correction);
    const scaledPrior = prior.map(value => value * correction);
    const max = Math.ceil(Math.max(...scaled, ...scaledPrior) * 1.18 / 100) * 100;
    const width = 588;
    const height = 146;
    const x0 = 42;
    const y0 = 13;
    const currentPath = smoothPath(scaled, x0, y0, width, height, max);
    const priorPath = smoothPath(scaledPrior, x0, y0, width, height, max);
    return { scaled, scaledPrior, max, width, height, x0, y0, currentPath, priorPath };
  }, [dataset, period, target]);

  const labels = periodLabels[period];
  const activeIndex = hover ?? Math.round(chart.currentPath.points.length * 0.75);
  const active = chart.currentPath.points[activeIndex];

  return <div className="chart-wrap">
    <svg viewBox="0 0 650 205" role="img" aria-label={`${dataset.label} hourly ${metric} trend for ${storeLabels[store]}`} preserveAspectRatio="none">
      <defs><linearGradient id={`goldArea-${datasetId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BA9C69" stopOpacity=".23" /><stop offset="1" stopColor="#BA9C69" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(step => {
        const y = chart.y0 + step * chart.height / 4;
        return <g key={step}><line className="gridline" x1="42" x2="630" y1={y} y2={y} /><text className="tick" x="30" y={y + 3} textAnchor="end">{formatNumber(chart.max * (4 - step) / 4)}</text></g>;
      })}
      {labels.map((label, index) => <text key={label} className="tick" x={chart.x0 + index * chart.width / 6} y="184" textAnchor="middle">{label}</text>)}
      <path d={`${chart.currentPath.d} L ${chart.x0 + chart.width} ${chart.y0 + chart.height} L ${chart.x0} ${chart.y0 + chart.height} Z`} fill={`url(#goldArea-${datasetId})`} />
      <path d={chart.priorPath.d} stroke="#C4C4BE" strokeWidth="2" fill="none" strokeDasharray="5 4" />
      <path d={chart.currentPath.d} stroke="#B5955D" strokeWidth="2.7" fill="none" strokeLinecap="round" />
      {chart.currentPath.points.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r="11" fill="transparent" style={{ cursor: 'crosshair' }} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} />)}
      <circle cx={active[0]} cy={active[1]} r="4.5" fill="#FFF" stroke="#B5955D" strokeWidth="2.8" />
    </svg>
    {hover !== null && <div className="chart-tooltip show" style={{ left: `${(active[0] / 650) * 100}%`, top: `${(active[1] / 205) * 100 - 4}%` }}>
      {period === 'today' ? `${String(hover).padStart(2, '0')}:00` : period === 'week' ? labels[hover] : `Day ${String(hover + 1).padStart(2, '0')}`} · {formatNumber(chart.scaled[hover])} {metric === 'unique' ? 'unique visitors' : 'visits'} (simulated)
    </div>}
  </div>;
}
