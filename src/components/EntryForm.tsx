import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getProjects, upsertEntry } from '../lib/api';
import type { EntryType, Project } from '../types';
import { AllocationSlider } from './AllocationSlider';
import { ProjectSelector } from './ProjectSelector';
import { TotalIndicator } from './TotalIndicator';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
}

function distributeEvenly(projectIds: string[]): Record<string, number> {
  if (projectIds.length === 0) return {};

  const base = Math.floor(100 / projectIds.length);
  let remainder = 100 - base * projectIds.length;

  return projectIds.reduce<Record<string, number>>((acc, id) => {
    const bonus = remainder > 0 ? 1 : 0;
    acc[id] = base + bonus;
    remainder -= bonus;
    return acc;
  }, {});
}

export function EntryForm({ userId, weekStart, type }: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      setProjects(await getProjects());
    };

    void loadProjects();
  }, []);

  useEffect(() => {
    setAllocations(distributeEvenly(selectedProjectIds));
  }, [selectedProjectIds]);

  const total = useMemo(
    () => Math.round(Object.values(allocations).reduce((sum, value) => sum + value, 0)),
    [allocations],
  );

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const handleSliderChange = (projectId: string, nextValue: number) => {
    setAllocations((current) => ({ ...current, [projectId]: Math.round(nextValue) }));
  };

  const handleSubmit = async () => {
    if (total !== 100 || selectedProjectIds.length === 0) return;

    setSubmitting(true);
    try {
      await upsertEntry({ userId, weekStart, type, allocations });
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Registrer {type === 'plan' ? 'plan' : 'faktisk tid'}</h2>

      <ProjectSelector
        onChange={setSelectedProjectIds}
        selectedProjectIds={selectedProjectIds}
        userId={userId}
      />

      <div className="space-y-3">
        {selectedProjectIds.map((projectId) => (
          <AllocationSlider
            key={projectId}
            label={projectById.get(projectId)?.name ?? 'Prosjekt'}
            onChange={(value) => handleSliderChange(projectId, value)}
            value={allocations[projectId] ?? 0}
          />
        ))}
      </div>

      <TotalIndicator total={total} />

      <button
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        disabled={submitting || total !== 100 || selectedProjectIds.length === 0}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {submitting ? 'Sender...' : 'Lagre'}
      </button>
    </section>
  );
}
