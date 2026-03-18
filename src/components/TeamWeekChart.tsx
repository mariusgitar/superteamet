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
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { Project } from '../types';

interface ChartRow {
  weekLabel: string;
  averageUnregisteredHours?: number | null;
  [projectId: string]: number | string | null | undefined;
}

interface TeamWeekChartProps {
  data: ChartRow[];
  projects: Project[];
}

function TeamWeekTooltip({ active, label, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0]?.payload as ChartRow | undefined;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-sm font-medium text-slate-900">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p className="text-sm text-slate-700" key={String(entry.dataKey)}>
            <span className="font-medium">{entry.name}:</span> {Math.round(Number(entry.value) || 0)}%
          </p>
        ))}
        {typeof row?.averageUnregisteredHours === 'number' ? (
          <p className="text-sm text-slate-700">
            <span className="font-medium">Uregistrert:</span> ~{Math.round(row.averageUnregisteredHours)} t
          </p>
        ) : null}
      </div>
    </div>
  );
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
          <Tooltip content={<TeamWeekTooltip />} />
          <Legend verticalAlign="bottom" />
          {projects.map((project) => (
            <Bar dataKey={project.id} fill={project.color} key={project.id} name={project.name} stackId="team" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
