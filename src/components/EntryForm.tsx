import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getProjects, upsertEntry } from '../lib/api';
import { formatWeekLabel } from '../lib/utils';
import type { EntryType, Project } from '../types';
import { ProjectSelector } from './ProjectSelector';
import { TotalIndicator } from './TotalIndicator';
import { VerticalSlider } from './VerticalSlider';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
}

function distributeEvenlyInTens(ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};

  const base = Math.floor((100 / ids.length) / 10) * 10;
  let remainder = 100 - base * ids.length;

  const next = ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = base;
    return acc;
  }, {});

  let idx = 0;
  while (remainder > 0) {
    const id = ids[idx % ids.length];
    next[id] += 10;
    remainder -= 10;
    idx += 1;
  }

  return next;
}

function transferFromHighestOther(
  allocations: Record<string, number>,
  ids: string[],
  selectedId: string,
): string | null {
  const candidates = ids.filter((id) => id !== selectedId);
  if (candidates.length === 0) return null;

  let highestId: string | null = null;
  let highestValue = -1;
  for (const id of candidates) {
    const value = allocations[id] ?? 0;
    if (value > highestValue) {
      highestValue = value;
      highestId = id;
    }
  }

  return highestValue > 0 ? highestId : null;
}

function transferToLowestOther(
  allocations: Record<string, number>,
  ids: string[],
  selectedId: string,
): string | null {
  const candidates = ids.filter((id) => id !== selectedId);
  if (candidates.length === 0) return null;

  let lowestId: string | null = null;
  let lowestValue = Number.POSITIVE_INFINITY;
  for (const id of candidates) {
    const value = allocations[id] ?? 0;
    if (value < lowestValue) {
      lowestValue = value;
      lowestId = id;
    }
  }

  return lowestId;
}

function redistributeAllocations(
  current: Record<string, number>,
  ids: string[],
  projectId: string,
  requestedValue: number,
): Record<string, number> {
  if (ids.length <= 1) {
    return ids.length === 1 ? { [ids[0]]: 100 } : {};
  }

  const roundedTarget = Math.max(0, Math.min(100, Math.round(requestedValue / 10) * 10));
  const currentValue = current[projectId] ?? 0;
  const delta = roundedTarget - currentValue;
  if (delta === 0) return current;

  const next = { ...current };
  let remaining = Math.abs(delta);

  if (delta > 0) {
    while (remaining > 0) {
      const donorId = transferFromHighestOther(next, ids, projectId);
      if (!donorId) break;
      const transfer = Math.min(10, remaining, next[donorId]);
      next[donorId] -= transfer;
      next[projectId] = (next[projectId] ?? 0) + transfer;
      remaining -= transfer;
    }
  } else {
    while (remaining > 0 && (next[projectId] ?? 0) > 0) {
      const receiverId = transferToLowestOther(next, ids, projectId);
      if (!receiverId) break;
      const transfer = Math.min(10, remaining, next[projectId]);
      next[projectId] -= transfer;
      next[receiverId] = (next[receiverId] ?? 0) + transfer;
      remaining -= transfer;
    }
  }

  return next;
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
    setAllocations(distributeEvenlyInTens(nextProjectIds));
  };

  const handleSliderChange = (projectId: string, nextValue: number) => {
    setAllocations((current) => redistributeAllocations(current, selectedProjectIds, projectId, nextValue));
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

      <div className="overflow-x-auto">
        <div className="flex min-w-fit justify-center gap-4 pb-2">
          {selectedProjectIds.map((projectId) => {
            const project = projectById.get(projectId);
            return (
              <VerticalSlider
                key={projectId}
                color={project?.color ?? '#6366F1'}
                disabled={selectedProjectIds.length === 1}
                onChange={(value) => handleSliderChange(projectId, value)}
                projectName={project?.name ?? 'Prosjekt'}
                value={allocations[projectId] ?? 0}
              />
            );
          })}
        </div>
      </div>

      <TotalIndicator total={total} />

      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <button
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        disabled={submitting || selectedProjectIds.length === 0}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {submitting ? 'Sender...' : 'Lagre plan'}
      </button>
    </section>
  );
}
