import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COLOR_HEX } from '../../domain/colors';
import type { PaletteColor } from '../../domain/types';

/** Win % over time per player (owner decision, M10). Loaded lazily so Recharts stays out of the main bundle. */
export default function WinTrend({
  data,
  lines,
}: {
  data: Record<string, number>[];
  lines: { id: string; name: string; color: PaletteColor }[];
}) {
  const motion = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="h-56 w-full" role="img" aria-label="Win percentage over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="game" tick={{ fill: 'var(--text-2)', fontSize: 12 }} stroke="var(--border)" />
          <YAxis domain={[0, 100]} unit="%" tick={{ fill: 'var(--text-2)', fontSize: 12 }} stroke="var(--border)" />
          <Tooltip
            contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
            labelFormatter={(g) => `Game ${g}`}
            formatter={(v) => `${v}%`}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: 'var(--text)' }} />
          {lines.map((l) => (
            <Line key={l.id} type="linear" dataKey={l.id} name={l.name} stroke={COLOR_HEX[l.color]} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={motion} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
