import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Project } from '../types';

interface ChartRow {
  weekLabel: string;
  [projectId: string]: number | string;
}

interface TeamWeekChartProps {
  data: ChartRow[];
  projects: Project[];
}

export function TeamWeekChart({ data, projects }: TeamWeekChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-600">Ingen ukedata i valgt periode.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value: number) => `${Math.round(value)}%`} />
          <Legend verticalAlign="bottom" />
          {projects.map((project) => (
            <Bar dataKey={project.id} fill={project.color} key={project.id} name={project.name} stackId="team" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
