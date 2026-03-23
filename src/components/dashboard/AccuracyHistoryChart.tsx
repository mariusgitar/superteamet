import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AccuracyHistoryRow } from '../../lib/dashboard';
import type { User } from '../../types';

interface AccuracyHistoryChartProps {
  data: AccuracyHistoryRow[];
  users: User[];
}

export function AccuracyHistoryChart({ data, users }: AccuracyHistoryChartProps) {
  if (data.length < 2) {
    return <p className="text-sm text-slate-500">Trenger flere ukers data for å vise trend.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip />
          <Legend />
          {users.map((user, index) => (
            <Line
              connectNulls={false}
              dataKey={user.id}
              dot={{ r: 3 }}
              key={user.id}
              name={user.name}
              stroke={LINE_COLORS[index % LINE_COLORS.length]}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const LINE_COLORS = ['#4f46e5', '#0f766e', '#ea580c', '#9333ea'];
