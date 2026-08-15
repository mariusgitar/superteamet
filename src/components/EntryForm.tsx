import { useEffect, useMemo, useState } from 'react';
import { getActualHistory, getProjects, upsertEntry } from '../lib/api';
import { sortProjects } from '../lib/utils';
import type { Project, WeekEntry } from '../types';
import { HoursInput } from './HoursInput';

interface EntryFormProps {
  userId: string;
  weekStart: string;
  existingEntry?: WeekEntry | null;
  onSubmitted?: () => void | Promise<void>;
}

function computeHoursAllocations(hours: Record<string, number>): Record<string, number> {
  const entries = Object.entries(hours).filter(([, value]) => value > 0);
  const totalHours = entries.reduce((sum, [, value]) => sum + value, 0);
  if (totalHours === 0) return {};

  const allocations = entries.reduce<Record<string, number>>((result, [projectId, value]) => {
    result[projectId] = Math.round((value / totalHours) * 100);
    return result;
  }, {});
  const difference = 100 - Object.values(allocations).reduce((sum, value) => sum + value, 0);
  const largestProjectId = Object.entries(allocations).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (largestProjectId) allocations[largestProjectId] += difference;
  return allocations;
}

function recentProjectIds(history: WeekEntry[], projects: Project[]): string[] {
  const activeIds = new Set(projects.map((project) => project.id));
  const ids: string[] = [];
  for (const entry of history) {
    for (const projectId of Object.keys(entry.allocations)) {
      if (activeIds.has(projectId) && !ids.includes(projectId)) ids.push(projectId);
      if (ids.length === 6) return ids;
    }
  }
  return ids.length > 0 ? ids : projects.slice(0, 6).map((project) => project.id);
}

export function EntryForm({ userId, weekStart, existingEntry = null, onSubmitted }: EntryFormProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [hoursValues, setHoursValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [daysAbsent, setDaysAbsent] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [activeProjects, history] = await Promise.all([getProjects(), getActualHistory(userId)]);
      const sortedProjects = sortProjects(activeProjects, history);
      const existingHours = existingEntry?.inputMode === 'hours' ? (existingEntry.hours ?? {}) : {};
      const initialProjectIds = Object.keys(existingHours).length > 0
        ? Object.keys(existingHours)
        : recentProjectIds(history, sortedProjects);

      setProjects(sortedProjects);
      setSelectedProjectIds(initialProjectIds);
      setHoursValues(Object.fromEntries(initialProjectIds.map((projectId) => [projectId, existingHours[projectId] ?? 0])));
      setDaysAbsent(existingEntry?.daysAbsent ?? 0);
    };
    void load();
  }, [existingEntry, userId]);

  const selectedHours = useMemo(() => Object.fromEntries(
    selectedProjectIds.map((projectId) => [projectId, hoursValues[projectId] ?? 0]),
  ), [hoursValues, selectedProjectIds]);

  const handleSubmit = async () => {
    const hours = Object.fromEntries(Object.entries(selectedHours).filter(([, value]) => value > 0));
    const allocations = computeHoursAllocations(hours);
    if (Object.keys(allocations).length === 0) return;

    setSubmitting(true);
    try {
      await upsertEntry({ userId, weekStart, type: 'actual', allocations, hours, inputMode: 'hours', daysAbsent });
      await onSubmitted?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProject = (projectId: string) => {
    setSelectedProjectIds((current) => current.includes(projectId) ? current : [...current, projectId]);
    setHoursValues((current) => ({ ...current, [projectId]: current[projectId] ?? 0 }));
  };

  const handleRemoveProject = (projectId: string) => {
    setSelectedProjectIds((current) => current.filter((id) => id !== projectId));
    setHoursValues((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
  };

  const handleProjectCreated = (project: Project) => setProjects((current) => [...current, project]);

  return (
    <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_20px_50px_-34px_rgba(79,70,229,0.7)]">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Registrer ukas arbeid</h2>
      <HoursInput
        daysAbsent={daysAbsent}
        editMode={Boolean(existingEntry)}
        hours={selectedHours}
        onAddProject={handleAddProject}
        onHoursChange={(projectId, value) => setHoursValues((current) => ({ ...current, [projectId]: value }))}
        onDaysAbsentChange={setDaysAbsent}
        onProjectCreated={handleProjectCreated}
        onRemoveProject={handleRemoveProject}
        onSubmit={() => void handleSubmit()}
        projects={projects}
        selectedProjectIds={selectedProjectIds}
        submitting={submitting}
      />
      <button
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        disabled={submitting}
        onClick={() => setHoursValues(Object.fromEntries(selectedProjectIds.map((projectId) => [projectId, 0])))}
        type="button"
      >
        Nullstill
      </button>
    </section>
  );
}
