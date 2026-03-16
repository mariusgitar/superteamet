import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectAdmin } from './components/ProjectAdmin';
import { UserSelect } from './components/UserSelect';
import { WeekNav } from './components/WeekNav';
import { WeekView } from './components/WeekView';
import { useCurrentUser } from './hooks/useCurrentUser';
import { weekStart } from './lib/utils';

type AppView = 'week' | 'dashboard' | 'admin';

export default function App() {
  const { user, saveUser } = useCurrentUser();
  const [currentWeekStart, setCurrentWeekStart] = useState(weekStart());
  const [view, setView] = useState<AppView>('week');

  if (!user) {
    return <UserSelect onSelect={saveUser} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Ukespeil</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-slate-600">Hei, {user.name}</p>
            {view === 'week' ? (
              <div className="flex items-center gap-3">
                <button
                  className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  onClick={() => setView('dashboard')}
                  type="button"
                >
                  Dashboard
                </button>
                <button
                  className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                  onClick={() => setView('admin')}
                  type="button"
                >
                  Administrer prosjekter
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {view === 'week' ? (
          <>
            <WeekNav currentWeekStart={currentWeekStart} onChangeWeek={setCurrentWeekStart} />
            <WeekView currentWeekStart={currentWeekStart} user={user} />
          </>
        ) : null}

        {view === 'admin' ? (
          <>
            <button
              className="mb-3 text-sm text-slate-600 hover:text-slate-900"
              onClick={() => setView('week')}
              type="button"
            >
              ← Tilbake
            </button>
            <ProjectAdmin />
          </>
        ) : null}

        {view === 'dashboard' ? (
          <>
            <button
              className="mb-3 text-sm text-slate-600 hover:text-slate-900"
              onClick={() => setView('week')}
              type="button"
            >
              ← Tilbake
            </button>
            <Dashboard />
          </>
        ) : null}
      </div>
    </main>
  );
}
