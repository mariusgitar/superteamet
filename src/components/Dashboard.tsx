import { useEffect, useMemo, useState } from 'react';
import { getDashboard, getDashboardWeek, getUsers } from '../lib/api';
import {
  buildAccuracyHistory,
  buildComparisonRows,
  buildCurrentWeekSection,
  buildTopProjectBars,
  calculateDashboardMetrics,
  getPreviousWeekStart,
} from '../lib/dashboard';
import { weekStart } from '../lib/utils';
import type { DashboardResponse, DashboardWeekResponse, User, WeekEntry } from '../types';
import { AccuracyHistoryChart } from './dashboard/AccuracyHistoryChart';
import { ComparisonTable } from './dashboard/ComparisonTable';
import { ExportButton } from './dashboard/ExportButton';
import { HistoricalBars } from './dashboard/HistoricalBars';
import { KpiCards } from './dashboard/KpiCards';
import { WeeklyDonuts } from './dashboard/WeeklyDonuts';

const PERIOD_OPTIONS = [
  { value: 1, label: 'Denne uka' },
  { value: 4, label: 'Siste 4 uker' },
  { value: 12, label: 'Siste 12 uker' },
] as const;

const EMPTY_WEEK: DashboardWeekResponse = {
  users: [],
  projects: [],
  entries: [],
};

const EMPTY_PERIOD: DashboardResponse = {
  weeks: [],
  projects: [],
  entries: [],
};

export function Dashboard() {
  const currentWeekStart = weekStart();
  const previousWeekStart = getPreviousWeekStart(currentWeekStart);
  const [range, setRange] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState<DashboardWeekResponse>(EMPTY_WEEK);
  const [previousWeek, setPreviousWeek] = useState<DashboardWeekResponse>(EMPTY_WEEK);
  const [weekBeforePrevious, setWeekBeforePrevious] = useState<DashboardWeekResponse>(EMPTY_WEEK);
  const [periodData, setPeriodData] = useState<DashboardResponse>(EMPTY_PERIOD);
  const [streakEntries, setStreakEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const weekBeforePreviousStart = getPreviousWeekStart(previousWeekStart);
        const [userList, weekData, prevWeekData, weekBeforePrevData, selectedPeriodData, streakData] = await Promise.all([
          getUsers(),
          getDashboardWeek(currentWeekStart),
          getDashboardWeek(previousWeekStart),
          getDashboardWeek(weekBeforePreviousStart),
          getDashboard(range === 1 ? 1 : range),
          getDashboard(52),
        ]);
        setUsers(userList);
        setCurrentWeek(weekData);
        setPreviousWeek(prevWeekData);
        setWeekBeforePrevious(weekBeforePrevData);
        setPeriodData(selectedPeriodData);
        setStreakEntries(Array.isArray(streakData.entries) ? streakData.entries : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Klarte ikke å hente dashboard-data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentWeekStart, previousWeekStart, range]);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeCurrentWeekUsers = Array.isArray(currentWeek.users) ? currentWeek.users : [];
  const safeCurrentWeekEntries = Array.isArray(currentWeek.entries) ? currentWeek.entries : [];
  const safeCurrentWeekProjects = Array.isArray(currentWeek.projects) ? currentWeek.projects : [];
  const safePeriodEntries = Array.isArray(periodData.entries) ? periodData.entries : [];
  const safePeriodProjects = Array.isArray(periodData.projects) ? periodData.projects : [];
  const headerUsers = safeUsers.length > 0 ? safeUsers : safeCurrentWeekUsers;
  const scopedUsers = useMemo(
    () => (selectedUserId ? headerUsers.filter((user) => user.id === selectedUserId) : headerUsers),
    [headerUsers, selectedUserId],
  );

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics({
        currentWeek: { ...currentWeek, users: safeCurrentWeekUsers, entries: safeCurrentWeekEntries, projects: safeCurrentWeekProjects },
        previousWeek: {
          ...previousWeek,
          users: Array.isArray(previousWeek.users) ? previousWeek.users : [],
          entries: Array.isArray(previousWeek.entries) ? previousWeek.entries : [],
          projects: Array.isArray(previousWeek.projects) ? previousWeek.projects : [],
        },
        weekBeforePrevious: {
          ...weekBeforePrevious,
          users: Array.isArray(weekBeforePrevious.users) ? weekBeforePrevious.users : [],
          entries: Array.isArray(weekBeforePrevious.entries) ? weekBeforePrevious.entries : [],
          projects: Array.isArray(weekBeforePrevious.projects) ? weekBeforePrevious.projects : [],
        },
        selectedUserId,
        streakEntries: Array.isArray(streakEntries) ? streakEntries : [],
        streakUsers: headerUsers,
      }),
    [currentWeek, previousWeek, weekBeforePrevious, selectedUserId, streakEntries, headerUsers, safeCurrentWeekUsers, safeCurrentWeekEntries, safeCurrentWeekProjects],
  );

  const currentWeekSection = useMemo(
    () => buildCurrentWeekSection({
      currentWeek: { ...currentWeek, users: safeCurrentWeekUsers, entries: safeCurrentWeekEntries, projects: safeCurrentWeekProjects },
      previousWeek: {
        ...previousWeek,
        users: Array.isArray(previousWeek.users) ? previousWeek.users : [],
        entries: Array.isArray(previousWeek.entries) ? previousWeek.entries : [],
        projects: Array.isArray(previousWeek.projects) ? previousWeek.projects : [],
      },
      selectedUserId,
    }),
    [currentWeek, previousWeek, selectedUserId, safeCurrentWeekUsers, safeCurrentWeekEntries, safeCurrentWeekProjects],
  );
  const historicalBars = useMemo(
    () => buildTopProjectBars(safePeriodEntries, safePeriodProjects, selectedUserId, headerUsers),
    [safePeriodEntries, safePeriodProjects, selectedUserId, headerUsers],
  );
  const historyRows = useMemo(
    () => buildComparisonRows({ entries: safePeriodEntries, projects: safePeriodProjects, users: headerUsers, selectedUserId, aggregateByPeriod: true }),
    [safePeriodEntries, safePeriodProjects, headerUsers, selectedUserId],
  );
  const accuracyHistory = useMemo(
    () => buildAccuracyHistory({ ...periodData, weeks: Array.isArray(periodData.weeks) ? periodData.weeks : [], projects: safePeriodProjects, entries: safePeriodEntries }, headerUsers, selectedUserId),
    [periodData, headerUsers, selectedUserId, safePeriodProjects, safePeriodEntries],
  );

  const hasAnyData = safeCurrentWeekEntries.length > 0 || safePeriodEntries.length > 0;

  if (loading) {
    return (
      <section className="space-y-6 px-4 md:px-0">
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-sm" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return <p className="rounded-2xl bg-white p-4 text-sm text-red-600 shadow-sm">{error}</p>;
  }

  if (!hasAnyData) {
    return (
      <section className="space-y-6 px-4 md:px-0">
        <Header
          range={range}
          selectedUserId={selectedUserId}
          setRange={setRange}
          setSelectedUserId={setSelectedUserId}
          users={headerUsers}
        />
        <KpiCards metrics={metrics} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
          Ingen registreringer ennå. Start ved å registrere ukas arbeid.
        </div>
      </section>
    );
  }

  try {
    return (
      <section className="space-y-6 px-4 md:px-0">
        <Header
          range={range}
          selectedUserId={selectedUserId}
          setRange={setRange}
          setSelectedUserId={setSelectedUserId}
          users={headerUsers}
        />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Nøkkeltall</h2>
          <KpiCards metrics={metrics} />
        </div>

        {range === 1 ? (
          <>
            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{currentWeekSection.title}</h2>
              {currentWeekSection.cards.length > 0 ? (
                <WeeklyDonuts cards={currentWeekSection.cards} />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm">
                  {currentWeekSection.emptyMessage}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">{currentWeekSection.tableTitle}</h3>
              <ComparisonTable rows={currentWeekSection.rows} users={scopedUsers} />
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Historisk</h2>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Topp 5 prosjekter</h3>
              <HistoricalBars data={historicalBars} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Treffscore-historikk per person</h3>
              <AccuracyHistoryChart data={accuracyHistory} users={scopedUsers} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Sammenligningstabell</h3>
              <ComparisonTable rows={historyRows} users={scopedUsers} />
            </div>
          </>
        )}
      </section>
    );
  } catch {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm text-red-600 shadow-sm">
        Noe gikk galt med dashboardet. Prøv å laste siden på nytt.
      </p>
    );
  }
}

interface HeaderProps {
  users: User[];
  selectedUserId: string | null;
  range: number;
  setSelectedUserId: (value: string | null) => void;
  setRange: (value: number) => void;
}

function Header({ users, selectedUserId, range, setSelectedUserId, setRange }: HeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-sm ${
              selectedUserId === null ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 hover:bg-slate-100'
            }`}
            onClick={() => setSelectedUserId(null)}
            type="button"
          >
            Alle
          </button>
          {(users ?? []).map((user) => (
            <button
              className={`rounded-full border px-3 py-1 text-sm ${
                selectedUserId === user.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 hover:bg-slate-100'
              }`}
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              type="button"
            >
              {user.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Periode
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              onChange={(event) => setRange(Number(event.target.value))}
              value={range}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ExportButton />
        </div>
      </div>
    </div>
  );
}
