import { useEffect, useMemo, useState } from 'react';
import type { User, WeekEntry } from '../types';
import { getDashboard, getUsers } from '../lib/api';
import { aggregateWeeks, buildInsights } from '../lib/dashboard';
import { InsightPanel } from './InsightPanel';
import { ProjectTrendChart } from './ProjectTrendChart';
import { TeamWeekChart } from './TeamWeekChart';

const RANGE_OPTIONS = [
  { value: 4, label: 'Siste 4 uker' },
  { value: 12, label: 'Siste 12 uker' },
  { value: 26, label: 'Siste 26 uker' },
];

export function Dashboard() {
  const [range, setRange] = useState(12);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState({ weeks: [], projects: [], entries: [] as WeekEntry[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsers(await getUsers());
      } catch {
        setUsers([]);
      }
    };

    void loadUsers();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setDashboard(await getDashboard(range));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Klarte ikke å hente dashboard-data.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [range]);

  const filteredEntries = useMemo(
    () => (selectedUserId ? dashboard.entries.filter((entry) => entry.userId === selectedUserId) : dashboard.entries),
    [dashboard.entries, selectedUserId],
  );

  const aggregatedWeeks = useMemo(
    () => aggregateWeeks(dashboard.weeks, dashboard.projects, filteredEntries),
    [dashboard.projects, dashboard.weeks, filteredEntries],
  );

  const chartData = useMemo(
    () =>
      aggregatedWeeks.map((week) => ({
        weekLabel: week.weekLabel,
        averageUnregisteredHours: week.averageUnregisteredHours,
        ...week.byProject,
      })),
    [aggregatedWeeks],
  );

  const insights = useMemo(() => buildInsights(aggregatedWeeks, dashboard.projects), [aggregatedWeeks, dashboard.projects]);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="h-8 w-full animate-pulse rounded bg-gray-200" />
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3 h-6 w-56 animate-pulse rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded bg-gray-200" />
            <div className="h-10 animate-pulse rounded bg-gray-200" />
            <div className="h-10 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="mb-3 h-6 w-56 animate-pulse rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-8 animate-pulse rounded bg-gray-200" />
            <div className="h-8 animate-pulse rounded bg-gray-200" />
            <div className="h-8 animate-pulse rounded bg-gray-200" />
            <div className="h-8 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-white p-4 text-sm text-red-600 shadow-sm">{error}</p>;
  }

  return (
    <section className="space-y-4 px-4 md:px-0">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            {users.map((user) => (
              <button
                className={`rounded-full border px-3 py-1 text-sm ${
                  selectedUserId === user.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 hover:bg-slate-100'
                }`}
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                type="button"
              >
                {user.name}
              </button>
            ))}
          </div>

          <label className="flex w-full items-center gap-2 text-sm text-slate-700 md:w-auto">
            Periode
            <select
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 md:w-auto"
              onChange={(event) => setRange(Number(event.target.value))}
              value={range}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Teamfordeling per uke</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[40rem]">
            <TeamWeekChart data={chartData} projects={dashboard.projects} />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Prosjekttrend over tid</h2>
        <div className="overflow-x-auto">
          <div className="min-w-[40rem]">
            <ProjectTrendChart data={chartData} projects={dashboard.projects} />
          </div>
        </div>
      </div>

      <InsightPanel insights={insights} />
    </section>
  );
}
