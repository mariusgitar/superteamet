import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getActualHistory, getProjects, getRecentEntries, upsertEntry } from '../lib/api';
import { calculateStreak, formatWeekLabel, sortProjects } from '../lib/utils';
import type { EntryType, Project, WeekEntry } from '../types';
import { HoursInput } from './HoursInput';
import { ProjectPicker } from './ProjectPicker';
import { ProjectSelector } from './ProjectSelector';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  type: EntryType;
  title?: string;
  existingEntry?: WeekEntry | null;
  existingPlan?: WeekEntry | null;
  onCancel?: () => void;
  onSubmitted?: () => void | Promise<void>;
  onStreakMilestone?: (streak: number) => void;
}

interface InitialState {
  defaultProjectIds: string[];
  visibleProjectIds: string[];
  sliderValues: Record<string, number>;
  selectedProjectIds: string[];
  hoursValues: Record<string, number>;
  step: 'pick' | 'hours';
  skipProjectPicker: boolean;
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

function computeHoursAllocations(hours: Record<string, number>): Record<string, number> {
  const entries = Object.entries(hours).filter(([, value]) => value > 0);
  const totalHours = entries.reduce((sum, [, value]) => sum + value, 0);

  if (totalHours === 0) {
    return {};
  }

  const allocations = entries.reduce<Record<string, number>>((acc, [projectId, value]) => {
    acc[projectId] = Math.round((value / totalHours) * 100);
    return acc;
  }, {});

  const sum = Object.values(allocations).reduce((acc, value) => acc + value, 0);
  const diff = 100 - sum;

  if (diff !== 0) {
    const highestId = Object.entries(allocations).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (highestId) {
      allocations[highestId] += diff;
    }
  }

  return allocations;
}

function isHoursEntry(entry?: WeekEntry | null): entry is WeekEntry {
  return Boolean(entry && entry.inputMode === 'hours' && entry.hours);
}

function buildInitialState(params: {
  activeProjects: Project[];
  existingEntry: WeekEntry | null;
  existingPlan: WeekEntry | null;
  history: WeekEntry[];
  type: EntryType;
}): InitialState {
  const { activeProjects, existingEntry, existingPlan, history, type } = params;
  const sortedProjects = sortProjects(activeProjects, history);

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

  const fallbackProjectIds = [...recentProjectIds];
  for (const projectId of alphabeticalProjectIds) {
    if (fallbackProjectIds.length >= 6) break;
    if (seenRecentIds.has(projectId)) continue;
    fallbackProjectIds.push(projectId);
  }

  const sortedRecentIds = fallbackProjectIds.slice(0, 6);
  const lastWeekAllocations = history[0]?.allocations ?? {};

  const prefilledHoursSource = isHoursEntry(existingEntry)
    ? existingEntry
    : type === 'actual' && !existingEntry && isHoursEntry(existingPlan)
      ? existingPlan
      : null;

  const sliderPrefillEntry = existingEntry?.inputMode === 'slider'
    ? existingEntry
    : type === 'actual' && !existingEntry && existingPlan?.inputMode === 'slider'
      ? existingPlan
      : null;

  if (prefilledHoursSource?.hours) {
    const prefilledProjectIds = Object.keys(prefilledHoursSource.hours);
    const prefilledHours = prefilledProjectIds.reduce<Record<string, number>>((acc, projectId) => {
      acc[projectId] = prefilledHoursSource.hours?.[projectId] ?? 0;
      return acc;
    }, {});

    return {
      defaultProjectIds: sortedRecentIds,
      visibleProjectIds: sortedRecentIds,
      sliderValues: {},
      selectedProjectIds: prefilledProjectIds,
      hoursValues: prefilledHours,
      step: 'hours',
      skipProjectPicker: true,
    };
  }

  const selectedProjectIds = sliderPrefillEntry ? Object.keys(sliderPrefillEntry.allocations) : [];
  const initialIds = sliderPrefillEntry
    ? Array.from(new Set([...selectedProjectIds, ...sortedRecentIds]))
    : type === 'actual' && existingPlan
      ? Array.from(new Set([...Object.keys(existingPlan.allocations), ...sortedRecentIds]))
      : sortedRecentIds;

  const sliderValues = initialIds.reduce<Record<string, number>>((acc, projectId) => {
    if (sliderPrefillEntry?.allocations[projectId] !== undefined) {
      acc[projectId] = sliderValueFromPercent(sliderPrefillEntry.allocations[projectId]);
      return acc;
    }

    if (type === 'actual' && existingPlan?.allocations[projectId] !== undefined) {
      acc[projectId] = sliderValueFromPercent(existingPlan.allocations[projectId]);
      return acc;
    }

    const lastWeekPercent = lastWeekAllocations[projectId] ?? 0;
    acc[projectId] = projectId in lastWeekAllocations ? sliderValueFromPercent(lastWeekPercent) : 0;
    return acc;
  }, {});

  const hoursValues = selectedProjectIds.reduce<Record<string, number>>((acc, projectId) => {
    acc[projectId] = 0;
    return acc;
  }, {});

  return {
    defaultProjectIds: sortedRecentIds,
    visibleProjectIds: initialIds,
    sliderValues,
    selectedProjectIds,
    hoursValues,
    step: 'pick',
    skipProjectPicker: false,
  };
}

export function EntryForm({
  userId,
  weekStart,
  type,
  title,
  existingEntry = null,
  existingPlan = null,
  onCancel,
  onSubmitted,
  onStreakMilestone,
}: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [defaultProjectIds, setDefaultProjectIds] = useState<string[]>([]);
  const [visibleProjectIds, setVisibleProjectIds] = useState<string[]>([]);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>({});
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [hoursValues, setHoursValues] = useState<Record<string, number>>({});
  const [step, setStep] = useState<'pick' | 'hours'>('pick');
  const [skipProjectPicker, setSkipProjectPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inputMode = 'hours'; // TODO: replace with toggle in PR 3

  useEffect(() => {
    const load = async () => {
      const [activeProjects, history] = await Promise.all([getProjects(), getActualHistory(userId)]);
      const sortedProjects = sortProjects(activeProjects, history);
      const initialState = buildInitialState({
        activeProjects,
        existingEntry,
        existingPlan,
        history,
        type,
      });

      setProjects(sortedProjects);
      setDefaultProjectIds(initialState.defaultProjectIds);
      setVisibleProjectIds(initialState.visibleProjectIds);
      setSliderValues(initialState.sliderValues);
      setSelectedProjectIds(initialState.selectedProjectIds);
      setHoursValues(initialState.hoursValues);
      setStep(initialState.step);
      setSkipProjectPicker(initialState.skipProjectPicker);
      setSuccessMessage(null);
    };

    void load();
  }, [existingEntry, existingPlan, type, userId]);

  const totalSliderValue = useMemo(
    () => Object.values(sliderValues).reduce((sum, value) => sum + value, 0),
    [sliderValues],
  );

  const allocations = useMemo(() => sliderMapToPercentages(sliderValues), [sliderValues]);
  const selectedHoursValues = useMemo(() => selectedProjectIds.reduce<Record<string, number>>((acc, projectId) => {
    acc[projectId] = hoursValues[projectId] ?? 0;
    return acc;
  }, {}), [hoursValues, selectedProjectIds]);
  const hoursAllocations = useMemo(() => computeHoursAllocations(selectedHoursValues), [selectedHoursValues]);
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

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((current) => (
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
    ));
    setHoursValues((current) => ({ ...current, [projectId]: current[projectId] ?? 0 }));
  };

  const handleAddHoursProject = (projectId: string) => {
    setSelectedProjectIds((current) => (current.includes(projectId) ? current : [...current, projectId]));
    setHoursValues((current) => ({ ...current, [projectId]: current[projectId] ?? 0 }));
  };

  const handleRemoveHoursProject = (projectId: string) => {
    setSelectedProjectIds((current) => current.filter((id) => id !== projectId));
    setHoursValues((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
  };

  const handleHoursChange = (projectId: string, value: number) => {
    setHoursValues((current) => ({ ...current, [projectId]: value }));
  };

  const handleProjectCreated = (project: Project) => {
    setProjects((current) => [...current, project]);
    setDefaultProjectIds((current) => [...current, project.id]);
  };

  const handleReset = () => {
    setVisibleProjectIds([]);
    setSliderValues({});
    setSelectedProjectIds([]);
    setHoursValues({});
    setStep(skipProjectPicker ? 'hours' : inputMode === 'hours' ? 'pick' : 'hours');
    setSuccessMessage(null);
  };

  const submitEntry = async (submissionAllocations: Record<string, number>, submissionHours?: Record<string, number>, submissionInputMode?: 'slider' | 'hours') => {
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await upsertEntry({
        userId,
        weekStart,
        type,
        allocations: submissionAllocations,
        hours: submissionHours,
        inputMode: submissionInputMode,
      });
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
    if (inputMode === 'hours') {
      if (Object.keys(hoursAllocations).length === 0) return;

      const submissionHours = Object.entries(selectedHoursValues).reduce<Record<string, number>>((acc, [projectId, value]) => {
        if (value > 0) {
          acc[projectId] = value;
        }
        return acc;
      }, {});

      await submitEntry(hoursAllocations, submissionHours, 'hours');
      return;
    }

    if (!canSubmit) return;
    await submitEntry(allocations, undefined, 'slider');
  };

  const handleSubmitAsPlanned = async () => {
    if (!existingPlan) return;
    await submitEntry(existingPlan.allocations, existingPlan.hours, existingPlan.inputMode === 'hours' ? 'hours' : 'slider');
  };

  const handleBack = () => {
    if (skipProjectPicker) {
      onCancel?.();
      return;
    }

    setStep('pick');
  };

  return (
    <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_-34px_rgba(79,70,229,0.7)]">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title ?? `Registrer ${type === 'plan' ? 'plan' : 'faktisk tid'}`}</h2>

      {inputMode === 'hours' ? (
        step === 'pick' ? (
          <ProjectPicker
            defaultProjectIds={defaultProjectIds}
            onContinue={() => setStep('hours')}
            onProjectCreated={handleProjectCreated}
            onToggleProject={handleToggleProject}
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            type={type}
          />
        ) : (
          <HoursInput
            canSubmitAsPlanned={type === 'actual' && !existingEntry && existingPlan?.inputMode === 'hours' && Boolean(existingPlan.hours)}
            hours={selectedHoursValues}
            onAddProject={handleAddHoursProject}
            onBack={handleBack}
            onHoursChange={handleHoursChange}
            onProjectCreated={handleProjectCreated}
            onRemoveProject={handleRemoveHoursProject}
            onSubmit={() => void handleSubmit()}
            onSubmitAsPlanned={() => void handleSubmitAsPlanned()}
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            submitting={submitting}
            type={type}
          />
        )
      ) : (
        <>
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
        </>
      )}

      {successMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm font-medium text-emerald-700">{successMessage}</p> : null}

      <button
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        disabled={submitting}
        onClick={handleReset}
        type="button"
      >
        Nullstill
      </button>

      {inputMode !== 'hours' ? (
        <button
          className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
          disabled={submitting || !canSubmit}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {submitting ? 'Sender...' : !canSubmit ? 'Dra minst én slider' : type === 'plan' ? 'Lagre plan' : 'Lagre faktisk tid'}
        </button>
      ) : null}
    </section>
  );
}
