import type { Project } from '../../types';
import { colorBgClass } from './colors';

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onToggleActive: (project: Project) => Promise<void>;
}

export function ProjectList({ projects, onEdit, onToggleActive }: ProjectListProps) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {projects.map((project) => (
        <li className="flex flex-wrap items-center gap-3 p-3" key={project.id}>
          <span className={`h-3 w-3 rounded-full ${colorBgClass(project.color)}`} />
          <span className="font-medium text-slate-900">{project.name}</span>
          {!project.active ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-gray-400">Arkivert</span>
          ) : null}

          <div className="ml-auto flex gap-2">
            <button
              className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              onClick={() => onEdit(project)}
              type="button"
            >
              Rediger
            </button>
            <button
              className="rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
              onClick={() => void onToggleActive(project)}
              type="button"
            >
              {project.active ? 'Arkiver' : 'Gjenopprett'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
