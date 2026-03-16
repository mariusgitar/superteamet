import { useEffect, useMemo, useState } from 'react';
import { getActualHistory, getProjects } from '../lib/api';
import { sortProjects } from '../lib/utils';
import type { Project } from '../types';

function colorClass(color: string): string {
  switch (color.toUpperCase()) {
    case '#6366F1':
      return 'bg-indigo-500';
    case '#E86B5F':
      return 'bg-rose-400';
    case '#F4A442':
      return 'bg-amber-400';
    case '#6BCB8B':
      return 'bg-emerald-400';
    case '#A78BFA':
      return 'bg-violet-400';
    default:
      return 'bg-slate-400';
  }
}

interface ProjectSelectorProps {
  userId: string;
  selectedProjectIds: string[];
  onChange: (projectIds: string[]) => void;
}

export function ProjectSelector({ userId, selectedProjectIds, onChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [historyProjectIds, setHistoryProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [activeProjects, history] = await Promise.all([getProjects(), getActualHistory(userId)]);
        setProjects(sortProjects(activeProjects, history));

        const lastWeek = history[0];
        setHistoryProjectIds(Object.keys(lastWeek?.allocations ?? {}));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Klarte ikke å hente prosjekter.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [userId]);

  const selectedSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);

  const toggle = (projectId: string) => {
    if (selectedSet.has(projectId)) {
      onChange(selectedProjectIds.filter((id) => id !== projectId));
      return;
    }

    onChange([...selectedProjectIds, projectId]);
  };

  return (
    <section>
      <h3 className="mb-2 font-medium">Prosjekter</h3>
      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div className="h-8 animate-pulse rounded-md bg-gray-200" key={`skeleton-${index}`} />
            ))
          : projects.map((project) => (
              <label className="flex items-center gap-2 text-sm" key={project.id}>
                <input
                  checked={selectedSet.has(project.id)}
                  onChange={() => toggle(project.id)}
                  type="checkbox"
                />
                <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass(project.color)}`} />
                <span>{project.name}</span>
                {historyProjectIds.includes(project.id) ? (
                  <span className="ml-auto rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">Forrige uke</span>
                ) : null}
              </label>
            ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
