import { useMemo, useState } from 'react';
import { createProject } from '../lib/api';
import type { Project } from '../types';
import { AddProjectModal } from './ProjectAdmin/AddProjectModal';

interface ProjectSelectorProps {
  projects: Project[];
  visibleProjectIds: string[];
  sliderValues: Record<string, number>;
  totalSliderValue: number;
  onSliderChange: (projectId: string, value: number) => void;
  onAddProject: (projectId: string) => void;
  onRemoveProject: (projectId: string) => void;
  onProjectCreated: (project: Project) => void;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function ProjectSelector({
  projects,
  visibleProjectIds,
  sliderValues,
  totalSliderValue,
  onSliderChange,
  onAddProject,
  onRemoveProject,
  onProjectCreated,
}: ProjectSelectorProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const visibleSet = useMemo(() => new Set(visibleProjectIds), [visibleProjectIds]);

  const availableProjects = useMemo(
    () => projects.filter((project) => !visibleSet.has(project.id)),
    [projects, visibleSet],
  );

  const activeCount = useMemo(
    () => visibleProjectIds.filter((projectId) => (sliderValues[projectId] ?? 0) > 0).length,
    [sliderValues, visibleProjectIds],
  );

  const summaryText = totalSliderValue > 0
    ? `Totalt ca. 37.5t fordelt på ${activeCount} ${activeCount === 1 ? 'prosjekt' : 'prosjekter'}`
    : 'Totalt ca. 0t';

  const handleCreateProject = async (input: { name: string; color: string }) => {
    const created = await createProject(input);
    onProjectCreated(created);
    onAddProject(created.id);
    setShowAddModal(false);
    setAddOpen(false);
  };

  return (
    <section className="space-y-2">
      <div className="space-y-2">
        {visibleProjectIds.map((projectId) => {
          const project = projectById.get(projectId);
          if (!project) return null;

          const value = sliderValues[projectId] ?? 0;
          const isMuted = value === 0;
          const hours = totalSliderValue > 0 ? roundToOneDecimal((value / totalSliderValue) * 37.5) : null;

          return (
            <article
              className={`relative rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2 shadow-sm transition ${isMuted ? 'opacity-60' : 'opacity-100'}`}
              key={project.id}
            >
              <button
                aria-label={`Fjern ${project.name}`}
                className="absolute right-3 top-3 h-6 w-6 rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-600"
                onClick={() => onRemoveProject(project.id)}
                type="button"
              >
                ×
              </button>

              <div className="mb-3 flex items-center gap-2 pr-8">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                <p className="truncate text-sm font-semibold text-slate-900">{project.name}</p>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-500">{hours === null ? '—' : `ca. ${hours.toFixed(1)}t`}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex h-11 flex-1 items-center py-2">
                  <div className="absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 rounded-full bg-slate-100" />
                  <div
                    className="absolute left-0 top-1/2 h-7 -translate-y-1/2 rounded-full"
                    style={{
                      width: `${(value / 5) * 100}%`,
                      backgroundColor: project.color,
                      opacity: 0.8,
                    }}
                  />
                  <input
                    aria-label={`${project.name} slider`}
                    className="touch-slider absolute left-0 top-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
                    max={5}
                    min={0}
                    onChange={(event) => onSliderChange(project.id, Number(event.target.value))}
                    step={0.1}
                    type="range"
                    value={value}
                  />
                </div>
              </div>
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

      <p className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-500">{summaryText}</p>

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
