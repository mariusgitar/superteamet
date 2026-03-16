import { FormEvent, useEffect, useState } from 'react';
import { createUser, getUsers } from '../lib/api';
import type { User } from '../types';

interface UserSelectProps {
  onSelect: (user: User) => void;
}

export function UserSelect({ onSelect }: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setUsers(await getUsers());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Klarte ikke å hente brukere.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      setError(null);
      const created = await createUser(trimmed);
      onSelect(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å opprette bruker.');
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-semibold">Velkommen til Ukespeil</h1>
        <p className="mt-2 text-sm text-slate-600">Velg navnet ditt for å komme i gang.</p>

        {loading ? <p className="mt-4 text-sm">Laster...</p> : null}

        {users.length > 0 ? (
          <div className="mt-4 space-y-2">
            {users.map((user) => (
              <button
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                key={user.id}
                onClick={() => onSelect(user)}
                type="button"
              >
                {user.name}
              </button>
            ))}
          </div>
        ) : null}

        <form className="mt-6 space-y-2" onSubmit={(event) => void handleCreate(event)}>
          <label className="text-sm font-medium" htmlFor="name-input">
            Ny bruker
          </label>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            id="name-input"
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Skriv navnet ditt"
            value={newName}
          />
          <button
            className="w-full rounded-md bg-indigo-600 px-3 py-2 font-medium text-white disabled:opacity-40"
            disabled={!newName.trim()}
            type="submit"
          >
            Opprett og fortsett
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </main>
  );
}
