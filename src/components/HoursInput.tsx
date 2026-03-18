import { useMemo, useState } from 'react';
import { createProject } from '../lib/api';
import type { EntryType, Project } from '../types';
import { AddProjectModal } from './ProjectAdmin/AddProjectModal';

const FULL_WEEK_HOURS = 37.5;
const QUICK_HOURS = [0.5, 1, 2, 3, 4, 6, 8] as const;

interface HoursInputProps {
  hours: Record<string, number>;
  projects: Project[];
  selectedProjectIds: string[];
  submitting: boolean;
  type: EntryType;
  canSubmitAsPlanned: boolean;
  onAddProject: (projectId: string) => void;
  onBack: () => void;
  onHoursChange: (projectId: string, value: number) => void;
  onProjectCreated: (project: Project) => void;
  onRemoveProject: (projectId: string) => void;
  onSubmit: () => void;
  onSubmitAsPlanned: () => void;
}

function formatHours(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function closestQuickHour(value: number): number | null {
  return QUICK_HOURS.includes(value as (typeof QUICK_HOURS)[number]) ? value : null;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HoursInput({
  hours,
  projects,
  selectedProjectIds,
  submitting,
  type,
  canSubmitAsPlanned,
  onAddProject,
  onBack,
  onHoursChange,
  onProjectCreated,
  onRemoveProject,
  onSubmit,
  onSubmitAsPlanned,
}: HoursInputProps) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const selectedSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const availableProjects = useMemo(
    () => projects.filter((project) => !selectedSet.has(project.id)),
    [projects, selectedSet],
  );
  const totalHours = useMemo(
    () => selectedProjectIds.reduce((sum, projectId) => sum + (hours[projectId] ?? 0), 0),
    [hours, selectedProjectIds],
  );
  const remainingHours = Math.max(0, FULL_WEEK_HOURS - totalHours);
  const canSubmit = totalHours > 0;

  const openCustomInput = (projectId: string) => {
    setEditingProjectId(projectId);
    const currentValue = hours[projectId] ?? 0;
    setDraftValue(currentValue > 0 ? String(currentValue) : '');
  };

  const saveDraft = (projectId: string) => {
    const parsed = Number.parseFloat(draftValue);
    if (!Number.isFinite(parsed)) {
      setEditingProjectId(null);
      setDraftValue('');
      return;
    }

    const clamped = Math.max(0, Math.min(24, Math.round(parsed * 2) / 2));
    onHoursChange(projectId, clamped);
    setEditingProjectId(null);
    setDraftValue('');
  };

  const handleCreateProject = async (input: { name: string; color: string }) => {
    const created = await createProject(input);
    onProjectCreated(created);
    onAddProject(created.id);
    setShowAddModal(false);
    setAddOpen(false);
  };

  return (
    <section className="space-y-4">
      {canSubmitAsPlanned ? (
        <button
          className="w-full rounded-xl border border-indigo-300 bg-indigo-50/40 px-4 py-2.5 font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
          disabled={submitting}
          onClick={onSubmitAsPlanned}
          type="button"
        >
          Lever som planlagt
        </button>
      ) : null}

      <div className="space-y-3">
        {selectedProjectIds.map((projectId) => {
          const project = projectById.get(projectId);
          if (!project) return null;

          const value = hours[projectId] ?? 0;
          const activeQuickHour = closestQuickHour(value);
          const editing = editingProjectId === projectId;

          return (
            <article className="relative rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm" key={project.id}>
              <button
                aria-label={`Fjern ${project.name}`}
                className="absolute right-3 top-3 h-6 w-6 rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                onClick={() => onRemoveProject(project.id)}
                type="button"
              >
                ×
              </button>

              <div className="mb-3 flex items-center gap-2 pr-8">
                <span aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                <h3 className="text-sm font-semibold text-slate-900">{project.name}</h3>
              </div>

              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    inputMode="decimal"
                    max={24}
                    min={0}
                    onBlur={() => saveDraft(project.id)}
                    onChange={(event) => setDraftValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        saveDraft(project.id);
                      }
                    }}
                    placeholder="timer..."
                    step={0.5}
                    type="number"
                    value={draftValue}
                  />
                  <button
                    className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-500 transition hover:text-slate-700"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setEditingProjectId(null);
                      setDraftValue('');
                    }}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {QUICK_HOURS.map((quickHour) => {
                    const selected = activeQuickHour === quickHour;
                    return (
                      <button
                        className="rounded-xl border px-3 py-2 text-sm font-medium transition"
                        key={quickHour}
                        onClick={() => onHoursChange(project.id, selected ? 0 : quickHour)}
                        style={selected
                          ? {
                              borderColor: project.color,
                              backgroundColor: project.color,
                              color: '#fff',
                            }
                          : undefined}
                        type="button"
                      >
                        {`${formatHours(quickHour)}t`}
                      </button>
                    );
                  })}
                  <button
                    aria-label={`Skriv egendefinerte timer for ${project.name}`}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm transition hover:border-slate-400"
                    onClick={() => openCustomInput(project.id)}
                    style={value > 0 && activeQuickHour === null
                      ? {
                          borderColor: project.color,
                          backgroundColor: hexToRgba(project.color, 0.12),
                        }
                      : undefined}
                    type="button"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="relative">
        <button
          className="w-full rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-indigo-50/60"
          onClick={() => setAddOpen((current) => !current)}
          type="button"
        >
          + Legg til prosjekt
        </button>

        {addOpen ? (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-xl">
            <div className="max-h-52 overflow-y-auto">
              {availableProjects.length === 0 ? (
                <p className="px-2 py-2 text-sm text-slate-500">Ingen flere aktive prosjekter.</p>
              ) : (
                availableProjects.map((project) => (
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-50"
                    key={project.id}
                    onClick={() => {
                      onAddProject(project.id);
                      setAddOpen(false);
                    }}
                    type="button"
                  >
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                    <span>{project.name}</span>
                  </button>
                ))
              )}
            </div>
            <button
              className="mt-2 w-full rounded-lg border-t border-slate-200 px-2 py-2 text-left text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
              onClick={() => {
                setShowAddModal(true);
                setAddOpen(false);
              }}
              type="button"
            >
              Opprett nytt prosjekt
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
        <p className={totalHours > 0 ? 'font-medium text-emerald-700' : 'font-medium text-slate-500'}>
          {`Registrert: ${formatHours(totalHours)}t av ~${formatHours(FULL_WEEK_HOURS)}t`}
        </p>
        <p className="mt-1 text-slate-500">{`Ikke registrert: ~${formatHours(remainingHours)}t`}</p>
      </div>

      <button
        className="inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        onClick={onBack}
        type="button"
      >
        ← Tilbake
      </button>

      <button
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        disabled={submitting || !canSubmit}
        onClick={onSubmit}
        type="button"
      >
        {submitting ? 'Sender...' : type === 'plan' ? 'Lagre plan' : 'Lagre ukas arbeid'}
      </button>

      {showAddModal ? (
        <AddProjectModal
          existingProjects={projects}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateProject}
        />
      ) : null}
    </section>
  );
}
