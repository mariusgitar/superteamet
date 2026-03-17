import { useMemo, useState } from 'react';
import type { Project } from '../../types';
import { colorBgClass, PROJECT_COLOR_PRESETS } from './colors';

interface AddProjectModalProps {
  existingProjects: Project[];
  onClose: () => void;
  onSubmit: (input: { name: string; color: string }) => Promise<void>;
}

export function AddProjectModal({ existingProjects, onClose, onSubmit }: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PROJECT_COLOR_PRESETS[0]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeNameSet = useMemo(
    () => new Set(existingProjects.filter((project) => project.active).map((project) => project.name.toLowerCase().trim())),
    [existingProjects],
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
      await onSubmit({ name: trimmedName, color });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å opprette prosjekt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold">Legg til prosjekt</h3>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-700">Prosjektnavn</span>
            <input
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
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

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-gray-200 px-3 py-2 text-sm" onClick={onClose} type="button">
            Avbryt
          </button>
          <button
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 text-sm font-medium tracking-wide text-white disabled:opacity-40"
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
