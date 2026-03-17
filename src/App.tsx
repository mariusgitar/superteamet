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

  const navItems: Array<{ key: AppView; label: string }> = [
    { key: 'week', label: 'Hjem' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'admin', label: 'Administrer prosjekter' }
  ];

  const activeItemClass = 'font-medium text-indigo-700';
  const inactiveItemClass = 'text-slate-700';

  return (
    <main className="min-h-screen px-4 py-8 text-slate-900">
      {toast ? (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl bg-slate-900/95 px-4 py-2 text-sm font-medium text-white shadow-xl ring-1 ring-white/20 transition-opacity duration-300 ${
            toast.visible ? 'opacity-100' : 'opacity-0'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl animate-fade-up">
        <header className="relative z-40 mb-5 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_50px_-32px_rgba(79,70,229,0.45)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight">Ukespeil</h1>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-sm text-slate-500">Hei, {user.name} ✨</p>
            <>
              <div className="hidden items-center gap-3 sm:flex">
                {navItems.map((item) => {
                  const isActive = view === item.key;

                  return (
                    <button
                      key={item.key}
                      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs transition hover:border-indigo-200 hover:text-indigo-700 ${
                        isActive ? activeItemClass : 'font-medium text-slate-600'
                      }`}
                      onClick={() => switchView(item.key)}
                      type="button"
                    >
                      {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> : null}
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative sm:hidden">
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-lg text-slate-600 shadow-sm"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  type="button"
                >
                  ≡
                </button>
                {mobileMenuOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-slate-200 bg-white/95 p-1.5 text-sm shadow-xl">
                    {navItems.map((item) => {
                      const isActive = view === item.key;

                      return (
                        <button
                          key={item.key}
                          className={`flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 ${
                            isActive ? activeItemClass : `${inactiveItemClass} font-normal`
                          }`}
                          onClick={() => switchView(item.key)}
                          type="button"
                        >
                          {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> : null}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </>
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
              className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 transition hover:text-slate-900"
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
              className="mb-3 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm text-slate-600 transition hover:text-slate-900"
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
