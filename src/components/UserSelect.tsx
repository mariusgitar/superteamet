import { useEffect, useState } from 'react';
import { getUsers } from '../lib/api';
import type { User } from '../types';

interface UserSelectProps {
  onSelect: (user: User) => void;
}

export function UserSelect({ onSelect }: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  const handleConfirm = () => {
    if (!selectedUser) return;
    onSelect(selectedUser);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_40px_-26px_rgba(79,70,229,0.65)] backdrop-blur">
        <h1 className="text-3xl font-semibold tracking-tight">Velkommen til Ukespeil</h1>
        <p className="mt-2 text-sm text-slate-500">Velg navnet ditt for å komme raskt i gang med ukespeilet ditt.</p>

        {loading ? <p className="mt-4 text-sm">Laster...</p> : null}

        {users.length > 0 ? (
          <div className="mt-4 space-y-2">
            {users.map((user) => {
              const isSelected = user.id === selectedUserId;

              return (
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50/90 text-indigo-900 shadow-sm'
                      : 'border-slate-200 bg-white/80 hover:bg-slate-50'
                  }`}
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  type="button"
                >
                  {user.name}
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          className="mt-6 w-full rounded-xl bg-slate-900 px-3 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
          disabled={!selectedUser}
          onClick={handleConfirm}
          type="button"
        >
          Fortsett
        </button>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>
    </main>
  );
}
