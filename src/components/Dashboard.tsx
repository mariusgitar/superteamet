import { useEffect, useMemo, useState } from 'react';
import type { User, WeekEntry } from '../types';
import { getDashboard, getExportRows, getUsers } from '../lib/api';
import { aggregateWeeks, buildInsights } from '../lib/dashboard';
import { InsightPanel } from './InsightPanel';
import { ProjectTrendChart } from './ProjectTrendChart';
import { TeamWeekChart } from './TeamWeekChart';

const RANGE_OPTIONS = [
  { value: 4, label: 'Siste 4 uker' },
  { value: 12, label: 'Siste 12 uker' },
  { value: 26, label: 'Siste 26 uker' },
];

const EXPORT_RANGE_OPTIONS = [
  { value: 12, label: 'Siste 12 uker' },
  { value: 26, label: 'Siste 26 uker' },
  { value: 52, label: 'Siste 52 uker' },
  { value: 999, label: 'Alt' },
];

function toCSV(
  rows: Array<{ week_label: string; week_start: string; user_name: string; project_name: string; percent: number; hours: number }>,
): string {
  const headers = ['Uke', 'Ukesdatoer', 'Bruker', 'Prosjekt', 'Prosent', 'Timer'];
  const lines = rows.map((row) => [row.week_label, row.week_start, row.user_name, row.project_name, row.percent, row.hours].join(';'));
  return [headers.join(';'), ...lines].join('\n');
}

export function Dashboard() {
  const [range, setRange] = useState(12);
  const [exportRange, setExportRange] = useState(52);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState({ weeks: [], projects: [], entries: [] as WeekEntry[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setExportSuccess(false);
      const rows = await getExportRows(exportRange);
      const csv = toCSV(rows);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ukespeil-export-${new Date().toISOString().split('T')[0]}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      window.setTimeout(() => setExportSuccess(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å eksportere CSV.');
    } finally {
      setExportLoading(false);
    }
  };

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
    <section className="space-y-4">
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Periode
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
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

            <label className="flex items-center gap-2 text-sm text-slate-700">
              Eksport
              <select
                className="rounded border border-slate-300 bg-white px-2 py-1"
                onChange={(event) => setExportRange(Number(event.target.value))}
                value={exportRange}
              >
                {EXPORT_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={exportLoading}
              onClick={() => void handleExport()}
              type="button"
            >
              {exportLoading ? 'Eksporterer...' : 'Eksporter til CSV'}
            </button>

            {exportSuccess ? <p className="text-sm text-emerald-600">Lastet ned ✓</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Teamfordeling per uke</h2>
        <TeamWeekChart data={chartData} projects={dashboard.projects} />
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Prosjekttrend over tid</h2>
        <ProjectTrendChart data={chartData} projects={dashboard.projects} />
      </div>

      <InsightPanel insights={insights} />
    </section>
  );
}
