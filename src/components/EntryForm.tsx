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

function redistributeDecreaseRecursively(
  values: Record<string, number>,
  ids: string[],
  decreaseBy: number,
) {
  if (decreaseBy <= 0 || ids.length === 0) return;

  const total = ids.reduce((sum, id) => sum + (values[id] ?? 0), 0);
  if (total <= 0) return;

  let remainder = 0;
  const stillPositive: string[] = [];

  for (const id of ids) {
    const current = values[id] ?? 0;
    const nextValue = current - decreaseBy * (current / total);
    if (nextValue < 0) {
      values[id] = 0;
      remainder += -nextValue;
    } else {
      values[id] = nextValue;
      if (nextValue > 0) stillPositive.push(id);
    }
  }

  if (remainder > 0) {
    redistributeDecreaseRecursively(values, stillPositive, remainder);
  }
}

function normalizeToHundred(values: Record<string, number>, ids: string[]): Record<string, number> {
  const rounded = ids.reduce<Record<string, number>>((acc, id) => {
    const clamped = Math.max(0, Math.min(100, values[id] ?? 0));
    acc[id] = Math.round(clamped);
    return acc;
  }, {});

  const sum = ids.reduce((total, id) => total + rounded[id], 0);
  const remainder = 100 - sum;

  if (remainder !== 0 && ids.length > 0) {
    let targetId = ids[0];
    for (const id of ids) {
      if (rounded[id] > rounded[targetId]) {
        targetId = id;
      }
    }

    rounded[targetId] = Math.max(0, Math.min(100, rounded[targetId] + remainder));
  }

  return rounded;
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

  const roundedTarget = Math.max(0, Math.min(100, Math.round(requestedValue)));
  const currentValue = current[projectId] ?? 0;
  const delta = roundedTarget - currentValue;
  if (delta === 0) return current;

  const next = ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = current[id] ?? 0;
    return acc;
  }, {});
  const otherIds = ids.filter((id) => id !== projectId);
  const totalOthers = otherIds.reduce((sum, id) => sum + (next[id] ?? 0), 0);

  if (delta > 0) {
    if (totalOthers === 0) {
      const evenDecrease = delta / otherIds.length;
      for (const id of otherIds) {
        next[id] = Math.max(0, (next[id] ?? 0) - evenDecrease);
      }
    } else {
      redistributeDecreaseRecursively(next, otherIds, delta);
    }
  } else {
    const increaseBy = -delta;
    if (totalOthers === 0) {
      const evenIncrease = increaseBy / otherIds.length;
      for (const id of otherIds) {
        next[id] = (next[id] ?? 0) + evenIncrease;
      }
    } else {
      for (const id of otherIds) {
        const currentOther = next[id] ?? 0;
        next[id] = currentOther - delta * (currentOther / totalOthers);
      }
    }
  }

  const updatedOthersTotal = otherIds.reduce((sum, id) => sum + (next[id] ?? 0), 0);
  next[projectId] = Math.max(0, Math.min(100, 100 - updatedOthersTotal));

  return normalizeToHundred(next, ids);
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
    setAllocations(distributeEvenly(nextProjectIds));
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
