import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getProjects, upsertEntry } from '../lib/api';
import { formatWeekLabel } from '../lib/utils';
import type { EntryType, Project } from '../types';
import { AllocationSlider } from './AllocationSlider';
import { ProjectSelector } from './ProjectSelector';
import { TotalIndicator } from './TotalIndicator';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
}

function distributeEvenly(total: number, ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};

  const base = Math.floor(total / ids.length);
  let remainder = total - base * ids.length;

  return ids.reduce<Record<string, number>>((acc, id) => {
    const bonus = remainder > 0 ? 1 : 0;
    acc[id] = base + bonus;
    remainder -= bonus;
    return acc;
  }, {});
}

function normalizeToHundred(input: Record<string, number>, ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};

  const normalized: Record<string, number> = {};
  for (const id of ids) {
    normalized[id] = Math.max(0, Math.min(100, Math.round(input[id] ?? 0)));
  }

  let delta = 100 - ids.reduce((sum, id) => sum + normalized[id], 0);
  let idx = 0;
  while (delta !== 0 && ids.length > 0) {
    const id = ids[idx % ids.length];
    if (delta > 0 && normalized[id] < 100) {
      normalized[id] += 1;
      delta -= 1;
    } else if (delta < 0 && normalized[id] > 0) {
      normalized[id] -= 1;
      delta += 1;
    }
    idx += 1;
  }

  return normalized;
}

function nextAllocations(
  currentIds: string[],
  nextIds: string[],
  currentAllocations: Record<string, number>,
): Record<string, number> {
  if (nextIds.length === 0) return {};

  if (currentIds.length === 0) {
    return distributeEvenly(100, nextIds);
  }

  const added = nextIds.filter((id) => !currentIds.includes(id));
  if (added.length > 0) {
    const kept = currentIds.filter((id) => nextIds.includes(id));
    const used = kept.reduce((sum, id) => sum + (currentAllocations[id] ?? 0), 0);
    const remaining = Math.max(0, 100 - used);
    return normalizeToHundred({ ...currentAllocations, ...distributeEvenly(remaining, added) }, nextIds);
  }

  const removed = currentIds.filter((id) => !nextIds.includes(id));
  if (removed.length > 0) {
    const removedTotal = removed.reduce((sum, id) => sum + (currentAllocations[id] ?? 0), 0);
    const kept = nextIds;
    const redistributed = distributeEvenly(removedTotal, kept);
    const merged = kept.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (currentAllocations[id] ?? 0) + (redistributed[id] ?? 0);
      return acc;
    }, {});
    return normalizeToHundred(merged, nextIds);
  }

  return normalizeToHundred(currentAllocations, nextIds);
}

export function EntryForm({ userId, weekStart, type }: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    const loadProjects = async () => {
      setProjects(await getProjects());
    };

    void loadProjects();
  }, []);

  const total = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + value, 0), [allocations]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const handleProjectChange = (nextProjectIds: string[]) => {
    setSelectedProjectIds(nextProjectIds);
    setAllocations((current) => nextAllocations(selectedProjectIds, nextProjectIds, current));
  };

  const handleSliderChange = (projectId: string, nextValue: number) => {
    setAllocations((current) => ({ ...current, [projectId]: Math.round(nextValue) }));
  };

  const handleSubmit = async () => {
    if (total !== 100 || selectedProjectIds.length === 0) return;

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const payloadType: EntryType = 'plan';
      await upsertEntry({ userId, weekStart, type: payloadType, allocations });
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setSuccessMessage(`Plan lagret for uke ${formatWeekLabel(weekStart)} 🎉`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Registrer {type === 'plan' ? 'plan' : 'faktisk tid'}</h2>

      <ProjectSelector
        onChange={handleProjectChange}
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

      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <button
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        disabled={submitting || total !== 100 || selectedProjectIds.length === 0}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {submitting ? 'Sender...' : 'Lagre plan'}
      </button>
    </section>
  );
}
