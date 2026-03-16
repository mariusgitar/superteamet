import { useEffect, useMemo, useState } from 'react';
import { createProject, getAllProjects, updateProject } from '../../lib/api';
import type { Project } from '../../types';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectList } from './ProjectList';

export function ProjectAdmin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      setProjects(await getAllProjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å hente prosjekter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name, 'nb');
      }),
    [projects],
  );

  const handleCreateProject = async (input: { name: string; color: string }) => {
    await createProject(input);
    await loadProjects();
  };

  const handleUpdateProject = async (projectId: string, input: { name: string; color: string }) => {
    await updateProject(projectId, input);
    await loadProjects();
  };

  const handleToggleActive = async (project: Project) => {
    try {
      setError(null);
      await updateProject(project.id, { active: !project.active });
      await loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å oppdatere prosjekt.');
    }
  };

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">Laster prosjekter...</p>;
  }

  return (
    <section className="space-y-4 rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Prosjektadministrasjon</h2>
        <button
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setShowAddModal(true)}
          type="button"
        >
          Legg til prosjekt
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ProjectList projects={sortedProjects} onEdit={setEditingProject} onToggleActive={handleToggleActive} />

      {showAddModal ? (
        <AddProjectModal
          existingProjects={projects}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateProject}
        />
      ) : null}

      {editingProject ? (
        <EditProjectModal
          existingProjects={projects}
          onClose={() => setEditingProject(null)}
          onSubmit={handleUpdateProject}
          project={editingProject}
        />
      ) : null}
    </section>
  );
}
