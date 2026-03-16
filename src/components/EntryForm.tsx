import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getProjects, upsertEntry } from '../lib/api';
import { formatWeekLabel } from '../lib/utils';
import type { EntryType, Project, WeekEntry } from '../types';
import { ProjectSelector } from './ProjectSelector';
import { TotalIndicator } from './TotalIndicator';
import { VerticalSlider } from './VerticalSlider';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
  title?: string;
  existingPlan?: WeekEntry | null;
  onSubmitted?: () => void | Promise<void>;
}

function distributeEvenly(ids: string[]): Record<string, number> {
  if (ids.length === 0) return {};

  const base = Math.floor(100 / ids.length);
  let remainder = 100 - base * ids.length;

  const next = ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = base;
    return acc;
  }, {});

  let idx = 0;
  while (remainder > 0) {
    const id = ids[idx % ids.length];
    next[id] += 1;
    remainder -= 1;
    idx += 1;
  }

  return next;
}

function redistributeAllocations(
  current: Record<string, number>,
  selectedProjectIds: string[],
  lockedProjectIds: Record<string, boolean>,
  projectId: string,
  requestedValue: number,
): Record<string, number> {
  const next = selectedProjectIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = current[id] ?? 0;
    return acc;
  }, {});

  if (lockedProjectIds[projectId]) return current;

  const roundedTarget = Math.max(0, Math.min(100, Math.round(requestedValue)));
  const currentValue = current[projectId] ?? 0;
  const delta = roundedTarget - currentValue;
  if (delta === 0) return current;

  const adjustableIds = selectedProjectIds.filter((id) => id !== projectId && !lockedProjectIds[id]);
  if (adjustableIds.length === 0) return current;

  next[projectId] = roundedTarget;

  const totalAdjustable = adjustableIds.reduce((sum, id) => sum + (next[id] ?? 0), 0);

  if (totalAdjustable === 0) {
    const share = Math.round(-delta / adjustableIds.length);
    for (const id of adjustableIds) {
      next[id] = Math.max(0, (next[id] ?? 0) + share);
    }
  } else {
    for (const id of adjustableIds) {
      const value = next[id] ?? 0;
      next[id] = Math.max(0, Math.min(100, Math.round(value - delta * (value / totalAdjustable))));
    }
  }

  const lockedSum = selectedProjectIds
    .filter((id) => lockedProjectIds[id])
    .reduce((sum, id) => sum + (next[id] ?? 0), 0);
  const adjustableSum = adjustableIds.reduce((sum, id) => sum + (next[id] ?? 0), 0);
  const remainder = 100 - lockedSum - (next[projectId] ?? 0) - adjustableSum;

  if (remainder !== 0) {
    let highestAdjustableId = adjustableIds[0];
    for (const id of adjustableIds) {
      if ((next[id] ?? 0) > (next[highestAdjustableId] ?? 0)) {
        highestAdjustableId = id;
      }
    }
    next[highestAdjustableId] = Math.max(0, Math.min(100, (next[highestAdjustableId] ?? 0) + remainder));
  }

  return next;
}

export function EntryForm({ userId, weekStart, type, title, existingPlan = null, onSubmitted }: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [lockedProjectIds, setLockedProjectIds] = useState<Record<string, boolean>>({});
  const [blockedProjectId, setBlockedProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setProjects(await getProjects());
    };

    void loadProjects();
  }, []);

  useEffect(() => {
    if (type === 'actual' && existingPlan) {
      const projectIds = Object.keys(existingPlan.allocations);
      setSelectedProjectIds(projectIds);
      setAllocations(existingPlan.allocations);
      setLockedProjectIds({});
      setBlockedProjectId(null);
    }
  }, [type, existingPlan]);

  const total = useMemo(() => Object.values(allocations).reduce((sum, value) => sum + value, 0), [allocations]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const handleProjectChange = (nextProjectIds: string[]) => {
    setSelectedProjectIds(nextProjectIds);
    setAllocations(distributeEvenly(nextProjectIds));
    setLockedProjectIds({});
    setBlockedProjectId(null);
  };

  const handleSliderChange = (projectId: string, nextValue: number) => {
    if (lockedProjectIds[projectId]) {
      setBlockedProjectId(projectId);
      return;
    }

    const unlockedOthers = selectedProjectIds.filter((id) => id !== projectId && !lockedProjectIds[id]);
    if (unlockedOthers.length === 0) {
      setBlockedProjectId(projectId);
      return;
    }

    setBlockedProjectId(null);
    setAllocations((current) => redistributeAllocations(current, selectedProjectIds, lockedProjectIds, projectId, nextValue));
  };

  const handleToggleLock = (projectId: string) => {
    setLockedProjectIds((current) => {
      if (current[projectId]) {
        const next = { ...current };
        delete next[projectId];
        return next;
      }

      return { ...current, [projectId]: true };
    });
    setBlockedProjectId(null);
  };

  const handleResetLocks = () => {
    setLockedProjectIds({});
    setBlockedProjectId(null);
    setAllocations(distributeEvenly(selectedProjectIds));
  };

  const submitEntry = async (submissionAllocations: Record<string, number>) => {
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await upsertEntry({ userId, weekStart, type, allocations: submissionAllocations });
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setSuccessMessage(`${type === 'plan' ? 'Plan' : 'Faktisk tid'} lagret for uke ${formatWeekLabel(weekStart)} 🎉`);
      await onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (total !== 100 || selectedProjectIds.length === 0) return;
    await submitEntry(allocations);
  };

  const handleSubmitAsPlanned = async () => {
    if (!existingPlan) return;
    await submitEntry(existingPlan.allocations);
  };

  return (
    <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{title ?? `Registrer ${type === 'plan' ? 'plan' : 'faktisk tid'}`}</h2>

      {type === 'actual' && existingPlan ? (
        <button
          className="w-full rounded-md border border-indigo-600 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"
          disabled={submitting}
          onClick={() => void handleSubmitAsPlanned()}
          type="button"
        >
          Lever som planlagt
        </button>
      ) : null}

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
                blocked={blockedProjectId === projectId}
                color={project?.color ?? '#6366F1'}
                disabled={selectedProjectIds.length === 1}
                locked={Boolean(lockedProjectIds[projectId])}
                onChange={(value) => handleSliderChange(projectId, value)}
                onToggleLock={() => handleToggleLock(projectId)}
                projectName={project?.name ?? 'Prosjekt'}
                value={allocations[projectId] ?? 0}
              />
            );
          })}
        </div>
      </div>

      {selectedProjectIds.length > 0 ? (
        <div className="-mt-1 flex justify-center">
          <button
            className="text-xs text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
            onClick={handleResetLocks}
            type="button"
          >
            Nullstill låser
          </button>
        </div>
      ) : null}

      <TotalIndicator total={total} />

      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <button
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        disabled={submitting || selectedProjectIds.length === 0}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {submitting ? 'Sender...' : type === 'plan' ? 'Lagre plan' : 'Lagre faktisk tid'}
      </button>
    </section>
  );
}
