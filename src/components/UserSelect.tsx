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
      <section className="w-full max-w-md rounded-2xl border border-violet-200/20 bg-slate-950/70 p-6 text-slate-100 shadow-[0_25px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <h1 className="bg-gradient-to-r from-violet-100 to-indigo-200 bg-clip-text text-2xl font-semibold text-transparent">Velkommen til Ukespeil</h1>
        <p className="mt-2 text-sm text-slate-300">Velg navnet ditt for å komme i gang.</p>

        {loading ? <p className="mt-4 text-sm text-slate-300">Laster...</p> : null}

        {users.length > 0 ? (
          <div className="mt-4 space-y-2">
            {users.map((user) => {
              const isSelected = user.id === selectedUserId;

              return (
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left ${
                    isSelected
                      ? 'border-violet-300/40 bg-violet-500/20 text-violet-100'
                      : 'border-violet-200/20 bg-slate-900/70 text-slate-200 hover:bg-violet-500/10'
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
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-3 py-2 font-medium text-white shadow-[0_8px_24px_rgba(79,70,229,0.45)] disabled:opacity-40"
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
