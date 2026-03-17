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
    <main className="min-h-screen px-4 py-8 text-slate-100">
      {toast ? (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-violet-300/30 bg-slate-950/85 px-4 py-2 text-sm font-medium text-violet-100 shadow-[0_10px_30px_rgba(124,58,237,0.35)] backdrop-blur transition-opacity duration-300 ${
            toast.visible ? 'opacity-100' : 'opacity-0'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl rounded-3xl border border-violet-200/15 bg-slate-950/55 p-5 shadow-[0_25px_70px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-6">
        <header className="mb-5">
          <h1 className="bg-gradient-to-r from-violet-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">Ukespeil</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-slate-300">Hei, {user.name}</p>
            {view === 'week' ? (
              <>
                <div className="hidden items-center gap-3 sm:flex">
                  <button
                    className="rounded-full border border-violet-200/20 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-violet-300/40 hover:text-violet-100"
                    onClick={() => switchView('dashboard')}
                    type="button"
                  >
                    Dashboard
                  </button>
                  <button
                    className="rounded-full border border-violet-200/20 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 transition hover:border-violet-300/40 hover:text-violet-100"
                    onClick={() => switchView('admin')}
                    type="button"
                  >
                    Administrer prosjekter
                  </button>
                </div>

                <div className="relative sm:hidden">
                  <button
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200/20 bg-slate-900/80 text-lg text-slate-200"
                    onClick={() => setMobileMenuOpen((current) => !current)}
                    type="button"
                  >
                    ≡
                  </button>
                  {mobileMenuOpen ? (
                    <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-violet-200/20 bg-slate-900/95 p-1 text-sm shadow-xl">
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-slate-200 hover:bg-violet-500/15"
                        onClick={() => switchView('dashboard')}
                        type="button"
                      >
                        Dashboard
                      </button>
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-slate-200 hover:bg-violet-500/15"
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
              className="mb-3 text-sm text-slate-300 hover:text-violet-100"
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
              className="mb-3 text-sm text-slate-300 hover:text-violet-100"
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
