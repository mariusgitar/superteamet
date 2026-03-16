import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectAdmin } from './components/ProjectAdmin';
import { UserSelect } from './components/UserSelect';
import { WeekNav } from './components/WeekNav';
import { WeekView } from './components/WeekView';
import { useCurrentUser } from './hooks/useCurrentUser';
import { weekNumber, weekStart } from './lib/utils';

type AppView = 'week' | 'dashboard' | 'admin';

interface ToastState {
  id: number;
  message: string;
  visible: boolean;
}

export default function App() {
  const { user, saveUser } = useCurrentUser();
  const [currentWeekStart, setCurrentWeekStart] = useState(weekStart());
  const [view, setView] = useState<AppView>('week');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (view === 'week') {
      document.title = `Uke ${weekNumber(currentWeekStart)} · Ukespeil`;
      return;
    }

    if (view === 'dashboard') {
      document.title = 'Dashboard · Ukespeil';
      return;
    }

    document.title = 'Prosjekter · Ukespeil';
  }, [view, currentWeekStart]);

  if (!user) {
    return <UserSelect onSelect={saveUser} />;
  }

  const showStreakMilestone = (streak: number) => {
    const id = Date.now();
    setToast({ id, message: `🔥 ${streak} uker på rad! Imponerende.`, visible: true });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? { ...current, visible: false } : current));
    }, 2600);

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  };

  const switchView = (nextView: AppView) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      {toast ? (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity duration-300 ${
            toast.visible ? 'opacity-100' : 'opacity-0'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Ukespeil</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-slate-600">Hei, {user.name}</p>
            {view === 'week' ? (
              <>
                <div className="hidden items-center gap-3 sm:flex">
                  <button
                    className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                    onClick={() => switchView('dashboard')}
                    type="button"
                  >
                    Dashboard
                  </button>
                  <button
                    className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                    onClick={() => switchView('admin')}
                    type="button"
                  >
                    Administrer prosjekter
                  </button>
                </div>

                <div className="relative sm:hidden">
                  <button
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-lg text-slate-700"
                    onClick={() => setMobileMenuOpen((current) => !current)}
                    type="button"
                  >
                    ≡
                  </button>
                  {mobileMenuOpen ? (
                    <div className="absolute right-0 top-12 z-20 w-52 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                        onClick={() => switchView('dashboard')}
                        type="button"
                      >
                        Dashboard
                      </button>
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
                        onClick={() => switchView('admin')}
                        type="button"
                      >
                        Administrer prosjekter
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </header>

        {view === 'week' ? (
          <>
            <WeekNav currentWeekStart={currentWeekStart} onChangeWeek={setCurrentWeekStart} />
            <WeekView
              currentWeekStart={currentWeekStart}
              onStreakMilestone={showStreakMilestone}
              user={user}
            />
          </>
        ) : null}

        {view === 'admin' ? (
          <>
            <button
              className="mb-3 text-sm text-slate-600 hover:text-slate-900"
              onClick={() => switchView('week')}
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
              onClick={() => switchView('week')}
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
