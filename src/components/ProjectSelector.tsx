import { useEffect, useMemo, useState } from 'react';
import { getActualHistory, getProjects } from '../lib/api';
import { sortProjects } from '../lib/utils';
import type { Project } from '../types';

interface ProjectSelectorProps {
  userId: string;
  selectedProjectIds: string[];
  onChange: (projectIds: string[]) => void;
}

export function ProjectSelector({ userId, selectedProjectIds, onChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [historyProjectIds, setHistoryProjectIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [activeProjects, history] = await Promise.all([getProjects(), getActualHistory(userId)]);
        const sorted = sortProjects(activeProjects, history);
        setProjects(sorted);

        const lastWeek = history[0];
        if (lastWeek && selectedProjectIds.length === 0) {
          const preselected = Object.keys(lastWeek.allocations);
          onChange(preselected);
        }

        setHistoryProjectIds(Object.keys(lastWeek?.allocations ?? {}));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Klarte ikke å hente prosjekter.');
      }
    };

    void load();
  }, [onChange, selectedProjectIds.length, userId]);

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
        {projects.map((project) => (
          <label className="flex items-center gap-2 text-sm" key={project.id}>
            <input
              checked={selectedSet.has(project.id)}
              onChange={() => toggle(project.id)}
              type="checkbox"
            />
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
