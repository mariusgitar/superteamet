import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getActualHistory, getProjects, getRecentEntries, upsertEntry } from '../lib/api';
import { calculateStreak, formatWeekLabel, sortProjects } from '../lib/utils';
import type { EntryType, Project, WeekEntry } from '../types';
import { ProjectSelector } from './ProjectSelector';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
  title?: string;
  existingPlan?: WeekEntry | null;
  onSubmitted?: () => void | Promise<void>;
  onStreakMilestone?: (streak: number) => void;
}

function clampToTenthStep(value: number): number {
  return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
}

function sliderValueFromPercent(percent: number): number {
  return clampToTenthStep((percent / 100) * 5);
}

function sliderMapToPercentages(values: Record<string, number>): Record<string, number> {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total === 0) return {};

  const weighted = entries.map(([projectId, value]) => {
    const rawPercent = (value / total) * 100;
    const flooredPercent = Math.floor(rawPercent);
    return {
      projectId,
      flooredPercent,
      fractionalPart: rawPercent - flooredPercent,
    };
  });

  let remainder = 100 - weighted.reduce((sum, item) => sum + item.flooredPercent, 0);
  weighted.sort((a, b) => b.fractionalPart - a.fractionalPart);

  let index = 0;
  while (remainder > 0 && weighted.length > 0) {
    weighted[index % weighted.length].flooredPercent += 1;
    remainder -= 1;
    index += 1;
  }

  return weighted.reduce<Record<string, number>>((acc, item) => {
    acc[item.projectId] = item.flooredPercent;
    return acc;
  }, {});
}

export function EntryForm({
  userId,
  weekStart,
  type,
  title,
  existingPlan = null,
  onSubmitted,
  onStreakMilestone,
}: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [activeProjects, history] = await Promise.all([getProjects(), getActualHistory(userId)]);
      const sortedProjects = sortProjects(activeProjects, history);
      setProjects(sortedProjects);

      const recentProjectIds: string[] = [];
      const seenRecentIds = new Set<string>();

      for (const entry of history) {
        for (const projectId of Object.keys(entry.allocations)) {
          if (seenRecentIds.has(projectId)) continue;
          seenRecentIds.add(projectId);
          recentProjectIds.push(projectId);
        }
      }

      const alphabeticalProjectIds = [...activeProjects]
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
        .map((project) => project.id);

      const defaultProjectIds = [...recentProjectIds];
      for (const projectId of alphabeticalProjectIds) {
        if (defaultProjectIds.length >= 6) break;
        if (seenRecentIds.has(projectId)) continue;
        defaultProjectIds.push(projectId);
      }

      const sortedRecentIds = defaultProjectIds.slice(0, 6);

      const lastWeekAllocations = history[0]?.allocations ?? {};

      const initialIds = type === 'actual' && existingPlan
        ? Array.from(new Set([...Object.keys(existingPlan.allocations), ...sortedRecentIds]))
        : sortedRecentIds;

      const nextValues = initialIds.reduce<Record<string, number>>((acc, projectId) => {
        if (type === 'actual' && existingPlan?.allocations[projectId] !== undefined) {
          acc[projectId] = sliderValueFromPercent(existingPlan.allocations[projectId]);
          return acc;
        }

        const lastWeekPercent = lastWeekAllocations[projectId] ?? 0;
        acc[projectId] = projectId in lastWeekAllocations ? sliderValueFromPercent(lastWeekPercent) : 0;
        return acc;
      }, {});

      setVisibleProjectIds(initialIds);
      setSliderValues(nextValues);
    };

    void load();
  }, [existingPlan, type, userId]);

  const totalSliderValue = useMemo(
    () => Object.values(sliderValues).reduce((sum, value) => sum + value, 0),
    [sliderValues],
  );

  const allocations = useMemo(() => sliderMapToPercentages(sliderValues), [sliderValues]);
  const canSubmit = Object.keys(allocations).length > 0;

  const handleSliderChange = (projectId: string, value: number) => {
    setSliderValues((current) => ({ ...current, [projectId]: clampToTenthStep(value) }));
  };

  const handleAddProject = (projectId: string) => {
    setVisibleProjectIds((current) => (current.includes(projectId) ? current : [...current, projectId]));
    setSliderValues((current) => ({ ...current, [projectId]: current[projectId] ?? 0 }));
  };

  const handleRemoveProject = (projectId: string) => {
    setVisibleProjectIds((current) => current.filter((id) => id !== projectId));
    setSliderValues((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
  };

  const handleProjectCreated = (project: Project) => {
    setProjects((current) => [...current, project]);
  };

  const handleReset = () => {
    setVisibleProjectIds([]);
    setSliderValues({});
    setSuccessMessage(null);
  };

  const submitEntry = async (submissionAllocations: Record<string, number>) => {
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await upsertEntry({ userId, weekStart, type, allocations: submissionAllocations });
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setSuccessMessage(`${type === 'plan' ? 'Plan' : 'Faktisk tid'} lagret for uke ${formatWeekLabel(weekStart)} 🎉`);

      if (type === 'actual' && onStreakMilestone) {
        const entries = await getRecentEntries(userId, 20);
        const streak = calculateStreak(entries, weekStart);
        if (streak > 0 && streak % 4 === 0) {
          onStreakMilestone(streak);
        }
      }

      await onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await submitEntry(allocations);
  };

  const handleSubmitAsPlanned = async () => {
    if (!existingPlan) return;
    await submitEntry(existingPlan.allocations);
  };

  return (
    <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_-34px_rgba(79,70,229,0.7)]">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title ?? `Registrer ${type === 'plan' ? 'plan' : 'faktisk tid'}`}</h2>

      {type === 'actual' && existingPlan ? (
        <button
          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/40 px-4 py-2.5 font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
          disabled={submitting}
          onClick={() => void handleSubmitAsPlanned()}
          type="button"
        >
          Lever som planlagt
        </button>
      ) : null}

      <ProjectSelector
        onAddProject={handleAddProject}
        onProjectCreated={handleProjectCreated}
        onRemoveProject={handleRemoveProject}
        onSliderChange={handleSliderChange}
        projects={projects}
        sliderValues={sliderValues}
        totalSliderValue={totalSliderValue}
        visibleProjectIds={visibleProjectIds}
      />

      {successMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-700">{successMessage}</p> : null}

      <button
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        disabled={submitting}
        onClick={handleReset}
        type="button"
      >
        Nullstill
      </button>

      <button
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        disabled={submitting || !canSubmit}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {submitting ? 'Sender...' : !canSubmit ? 'Dra minst én slider' : type === 'plan' ? 'Lagre plan' : 'Lagre faktisk tid'}
      </button>
    </section>
  );
}
