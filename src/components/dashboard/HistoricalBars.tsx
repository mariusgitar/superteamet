import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TopProjectBar } from '../../lib/dashboard';

interface HistoricalBarsProps {
  data: TopProjectBar[];
}

export function HistoricalBars({ data }: HistoricalBarsProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Ingen timer registrert i valgt periode.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
          <XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" />
          <YAxis dataKey="name" type="category" width={120} />
          <Tooltip />
          <Bar dataKey="percentage" radius={[0, 10, 10, 0]}>
            {data.map((entry) => (
              <Cell fill={entry.color} key={entry.id} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}t`;
}
