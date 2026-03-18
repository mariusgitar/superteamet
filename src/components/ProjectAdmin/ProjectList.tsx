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
        <li className="flex flex-wrap items-start gap-3 p-3" key={project.id}>
          <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colorBgClass(project.color)}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-words font-medium text-slate-900">{project.name}</span>
              {!project.active ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Arkivert</span>
              ) : null}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
              onClick={() => onEdit(project)}
              type="button"
            >
              Rediger
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
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
