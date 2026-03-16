import { useMemo, useState } from 'react';
import type { Project } from '../../types';
import { colorBgClass, PROJECT_COLOR_PRESETS } from './colors';

interface EditProjectModalProps {
  existingProjects: Project[];
  project: Project;
  onClose: () => void;
  onSubmit: (projectId: string, input: { name: string; color: string }) => Promise<void>;
}

export function EditProjectModal({ existingProjects, project, onClose, onSubmit }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [color, setColor] = useState(project.color);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeNameSet = useMemo(
    () =>
      new Set(
        existingProjects
          .filter((item) => item.active && item.id !== project.id)
          .map((item) => item.name.toLowerCase().trim()),
      ),
    [existingProjects, project.id],
  );

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Prosjektnavn er påkrevd.');
      return;
    }

    if (activeNameSet.has(trimmedName.toLowerCase())) {
      setError('Et aktivt prosjekt med dette navnet finnes allerede.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(project.id, { name: trimmedName, color });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å oppdatere prosjekt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-[400px] rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">Rediger prosjekt</h3>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Prosjektnavn</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              onChange={(event) => setName(event.target.value)}
              type="text"
              value={name}
            />
          </label>

          <div>
            <span className="mb-2 block text-sm text-slate-700">Farge</span>
            <div className="flex gap-2">
              {PROJECT_COLOR_PRESETS.map((preset) => {
                const selected = color === preset;
                return (
                  <button
                    aria-label={`Velg farge ${preset}`}
                    className={`h-8 w-8 rounded-full ${colorBgClass(preset)} ${selected ? 'ring-2 ring-slate-500 ring-offset-2' : ''}`}
                    key={preset}
                    onClick={() => setColor(preset)}
                    type="button"
                  />
                );
              })}
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={onClose} type="button">
            Avbryt
          </button>
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {submitting ? 'Lagrer...' : 'Lagre'}
          </button>
        </div>
      </div>
    </div>
  );
}
