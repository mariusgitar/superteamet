import { useMemo, useState } from 'react';
import { createProject } from '../lib/api';
import type { EntryType, Project } from '../types';
import { AddProjectModal } from './ProjectAdmin/AddProjectModal';

interface ProjectPickerProps {
  projects: Project[];
  defaultProjectIds: string[];
  selectedProjectIds: string[];
  type: EntryType;
  onToggleProject: (projectId: string) => void;
  onContinue: () => void;
  onProjectCreated: (project: Project) => void;
}

function titleForType(type: EntryType): string {
  return type === 'plan'
    ? 'Hvilke prosjekter planlegger du å bruke tid på?'
    : 'Hvilke prosjekter brukte du mest tid på?';
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

export function ProjectPicker({
  projects,
  defaultProjectIds,
  selectedProjectIds,
  type,
  onToggleProject,
  onContinue,
  onProjectCreated,
}: ProjectPickerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const selectedSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);

  const displayedProjectIds = useMemo(() => {
    const ids = new Set(defaultProjectIds);
    for (const projectId of selectedProjectIds) {
      ids.add(projectId);
    }
    return [...ids].filter((projectId) => projectById.has(projectId));
  }, [defaultProjectIds, projectById, selectedProjectIds]);

  const availableProjects = useMemo(
    () => projects.filter((project) => !displayedProjectIds.includes(project.id)),
    [displayedProjectIds, projects],
  );

  const selectedCount = selectedProjectIds.length;

  const handleCreateProject = async (input: { name: string; color: string }) => {
    const created = await createProject(input);
    onProjectCreated(created);
    onToggleProject(created.id);
    setShowAddModal(false);
    setAddOpen(false);
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{titleForType(type)}</h3>
        <p className="text-sm text-slate-500">Velg ett eller flere prosjekter for å fortsette.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayedProjectIds.map((projectId) => {
          const project = projectById.get(projectId);
          if (!project) return null;

          const selected = selectedSet.has(projectId);

          return (
            <button
              className="rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              key={project.id}
              onClick={() => onToggleProject(project.id)}
              style={selected
                ? {
                    borderColor: project.color,
                    backgroundColor: hexToRgba(project.color, 0.12),
                  }
                : undefined}
              type="button"
            >
              <div className={`flex items-center gap-2 ${selected ? 'text-slate-900' : 'text-slate-700'}`}>
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="line-clamp-2 text-sm font-medium">{project.name}</span>
              </div>
              {!selected ? <div className="mt-3 h-px w-full bg-slate-100" /> : null}
            </button>
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
                      onToggleProject(project.id);
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

      <button
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
        disabled={selectedCount === 0}
        onClick={onContinue}
        type="button"
      >
        {`Fortsett →${selectedCount > 0 ? ` (${selectedCount} valgt)` : ''}`}
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
