import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

interface ProjectTrendChartProps {
  data: ChartRow[];
  projects: Project[];
}

export function ProjectTrendChart({ data, projects }: ProjectTrendChartProps) {
  const [hiddenProjects, setHiddenProjects] = useState<Record<string, boolean>>({});

  const visibleProjects = useMemo(
    () => projects.filter((project) => !hiddenProjects[project.id]),
    [hiddenProjects, projects],
  );

  if (data.length === 0) {
    return <p className="text-sm text-slate-600">Ingen trenddata i valgt periode.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="weekLabel" />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value: number) => `${Math.round(value)}%`} />
          <Legend
            verticalAlign="bottom"
            onClick={(entry) => {
              const projectId = typeof entry.dataKey === 'string' ? entry.dataKey : '';
              if (!projectId) return;
              setHiddenProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
            }}
          />
          {visibleProjects.map((project) => (
            <Line
              dataKey={project.id}
              dot={false}
              key={project.id}
              name={project.name}
              stroke={project.color}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
