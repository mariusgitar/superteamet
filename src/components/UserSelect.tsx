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
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-semibold">Velkommen til Ukespeil</h1>
        <p className="mt-2 text-sm text-gray-400">Velg navnet ditt for å komme i gang.</p>

        {loading ? <p className="mt-4 text-sm">Laster...</p> : null}

        {users.length > 0 ? (
          <div className="mt-4 space-y-2">
            {users.map((user) => {
              const isSelected = user.id === selectedUserId;

              return (
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 hover:bg-gray-50'
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
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 font-medium tracking-wide text-white disabled:opacity-40"
          disabled={!selectedUser}
          onClick={handleConfirm}
          type="button"
        >
          Fortsett
        </button>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>
    </main>
  );
}
