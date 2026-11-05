import { formatDate } from '../../domain/pets/pet';
import { formatKilos, type WeightPoint } from '../../domain/pets/weight';

const W = 320;
const H = 140;
const PAD = { left: 8, right: 8, top: 14, bottom: 22 };

/** A plain line chart of the weights, oldest to newest. Needs two points to draw a line. */
export function WeightChart({ points, label }: { points: readonly WeightPoint[]; label: string }) {
  if (points.length < 2) return null;
  const times = points.map((p) => Date.parse(`${p.onDate}T00:00:00Z`));
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const grams = points.map((p) => p.grams);
  const minG = Math.min(...grams);
  const maxG = Math.max(...grams);
  const x = (t: number) => PAD.left + (maxT === minT ? 0.5 : (t - minT) / (maxT - minT)) * (W - PAD.left - PAD.right);
  const y = (g: number) => PAD.top + (maxG === minG ? 0.5 : 1 - (g - minG) / (maxG - minG)) * (H - PAD.top - PAD.bottom);
  const coords = points.map((p, i) => `${x(times[i]).toFixed(1)},${y(p.grams).toFixed(1)}`);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <polyline points={coords.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={x(times[i])} cy={y(p.grams)} r="3" fill="currentColor" />
      ))}
      <text x={PAD.left} y={H - 6}>
        {formatDate(first.onDate)}
      </text>
      <text x={W - PAD.right} y={H - 6} textAnchor="end">
        {formatDate(last.onDate)}
      </text>
      <text x={PAD.left} y={10}>
        {formatKilos(maxG)}
      </text>
    </svg>
  );
}
