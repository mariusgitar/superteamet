import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { getDashboard, getDashboardProjects, getDashboardWeek, getRecentEntries, getUsers } from '../lib/api';
import { getPreviousWeekStart } from '../lib/dashboard';
import { weekStart } from '../lib/utils';
import type { DashboardProjectsResponse, DashboardResponse, DashboardWeekResponse, User, WeekEntry } from '../types';
import { ExportButton } from './dashboard/ExportButton';
import { MeTab } from './dashboard/MeTab';
import { ProjectsTab } from './dashboard/ProjectsTab';
import { ThisWeekTab } from './dashboard/ThisWeekTab';

type DashboardTab = 'week' | 'projects' | 'me';
const TAB_KEY = 'ukespeil_dashboard_tab';
const EMPTY_WEEK: DashboardWeekResponse = { users: [], projects: [], entries: [] };
const EMPTY_PROJECTS: DashboardProjectsResponse = { projects: [], monthly: [] };
const EMPTY_TEAM: DashboardResponse = { weeks: [], projects: [], entries: [] };

export function Dashboard({ currentUser }: { currentUser: User }) {
  return <DashboardErrorBoundary><DashboardContent currentUser={currentUser} /></DashboardErrorBoundary>;
}

function DashboardContent({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<DashboardTab>(() => readTab());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(EMPTY_WEEK);
  const [previousWeek, setPreviousWeek] = useState(EMPTY_WEEK);
  const [projectData, setProjectData] = useState(EMPTY_PROJECTS);
  const [months, setMonths] = useState<number | undefined>(3);
  const [personalEntries, setPersonalEntries] = useState<WeekEntry[]>([]);
  const [teamData, setTeamData] = useState(EMPTY_TEAM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(TAB_KEY, tab); }, [tab]);
  useEffect(() => { void getUsers().then(setUsers).catch(() => setUsers([])); }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        if (tab === 'week') {
          const start = weekStart();
          const [current, previous] = await Promise.all([getDashboardWeek(start), getDashboardWeek(getPreviousWeekStart(start))]);
          if (active) {
            setCurrentWeek({ users: current.users ?? [], projects: current.projects ?? [], entries: current.entries ?? [] });
            setPreviousWeek({ users: previous.users ?? [], projects: previous.projects ?? [], entries: previous.entries ?? [] });
            if (!users.length) setUsers(current.users ?? []);
          }
        } else if (tab === 'projects') {
          const data = await getDashboardProjects(months);
          if (active) setProjectData({ projects: data.projects ?? [], monthly: data.monthly ?? [] });
        } else {
          const [entries, team] = await Promise.all([getRecentEntries(currentUser.id, 52), getDashboard(52)]);
          if (active) {
            setPersonalEntries((entries ?? []).filter((entry) => entry.type === 'actual'));
            setTeamData({ weeks: team.weeks ?? [], projects: team.projects ?? [], entries: team.entries ?? [] });
          }
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Klarte ikke å hente dashboard-data.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [tab, months, currentUser.id]);

  return <section className="space-y-5 px-0 md:px-0">
    <Header users={users} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} disabled={tab === 'me'} />
    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" aria-label="Dashboard-visninger">
      <div className="grid min-w-[360px] grid-cols-3 gap-1">{([{ id: 'week', label: 'Denne uka' }, { id: 'projects', label: 'Prosjekter' }, { id: 'me', label: 'Meg' }] as const).map((item) => <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === item.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`} key={item.id} onClick={() => setTab(item.id)} type="button">{item.label}</button>)}</div>
    </nav>
    {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
    {loading ? <LoadingSkeleton /> : null}
    {!loading && !error && tab === 'week' ? <ThisWeekTab current={currentWeek} previous={previousWeek} selectedUserId={selectedUserId} users={users} /> : null}
    {!loading && !error && tab === 'projects' ? <ProjectsTab data={projectData} months={months} onMonthsChange={setMonths} selectedUserId={selectedUserId} users={users} /> : null}
    {!loading && !error && tab === 'me' ? <MeTab currentUser={currentUser} entries={personalEntries} team={teamData} users={users} /> : null}
  </section>;
}

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dashboard rendering failed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-medium">Noe gikk galt med dashboardet. Prøv å laste siden på nytt.</p>
          <button className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800" onClick={() => window.location.reload()} type="button">
            Last på nytt
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

function Header({ users, selectedUserId, onSelectUser, disabled }: { users: User[]; selectedUserId: string | null; onSelectUser: (id: string | null) => void; disabled: boolean }) {
  const safeUsers = users ?? [];
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Vis teammedlem</p><div className={`flex flex-wrap gap-2 ${disabled ? 'opacity-45' : ''}`} title={disabled ? 'Meg-visningen viser alltid innlogget bruker' : undefined}><FilterButton active={selectedUserId === null} disabled={disabled} label="Alle" onClick={() => onSelectUser(null)} />{safeUsers.map((user) => <FilterButton active={selectedUserId === user.id} disabled={disabled} key={user.id} label={user.name} onClick={() => onSelectUser(user.id)} />)}</div>{disabled ? <p className="mt-2 text-xs text-slate-400">Meg viser alltid {safeUsers.find((user) => user.id === selectedUserId)?.name ?? 'deg'}.</p> : null}</div><ExportButton /></div></div>;
}

function FilterButton({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) { return <button className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`} disabled={disabled} onClick={onClick} type="button">{label}</button>; }
function LoadingSkeleton() { return <div className="space-y-4" aria-label="Laster dashboard"><div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" /><div className="grid gap-4 sm:grid-cols-2">{[1, 2].map((item) => <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" key={item} />)}</div></div>; }
function readTab(): DashboardTab { const value = localStorage.getItem(TAB_KEY); return value === 'projects' || value === 'me' ? value : 'week'; }
