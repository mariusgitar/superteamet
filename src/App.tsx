import { useState } from 'react';
import { ProjectAdmin } from './components/ProjectAdmin';
import { UserSelect } from './components/UserSelect';
import { WeekNav } from './components/WeekNav';
import { WeekView } from './components/WeekView';
import { useCurrentUser } from './hooks/useCurrentUser';
import { weekStart } from './lib/utils';

export default function App() {
  const { user, saveUser } = useCurrentUser();
  const [currentWeekStart, setCurrentWeekStart] = useState(weekStart());
  const [showProjectAdmin, setShowProjectAdmin] = useState(false);

  if (!user) {
    return <UserSelect onSelect={saveUser} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Ukespeil</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-slate-600">Hei, {user.name}</p>
            {!showProjectAdmin ? (
              <button
                className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                onClick={() => setShowProjectAdmin(true)}
                type="button"
              >
                Administrer prosjekter
              </button>
            ) : null}
          </div>
        </header>

        {showProjectAdmin ? (
          <>
            <button
              className="mb-3 text-sm text-slate-600 hover:text-slate-900"
              onClick={() => setShowProjectAdmin(false)}
              type="button"
            >
              ← Tilbake
            </button>
            <ProjectAdmin />
          </>
        ) : (
          <>
            <WeekNav currentWeekStart={currentWeekStart} onChangeWeek={setCurrentWeekStart} />
            <WeekView currentWeekStart={currentWeekStart} user={user} />
          </>
        )}
      </div>
    </main>
  );
}
