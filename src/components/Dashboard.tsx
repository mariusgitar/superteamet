import { useEffect, useMemo, useState } from 'react';
import type { User, WeekEntry } from '../types';
import { getDashboard, getUsers } from '../lib/api';
import { aggregateWeeks, buildInsights } from '../lib/dashboard';
import { accuracyScore, weekStart } from '../lib/utils';
import { InsightPanel } from './InsightPanel';
import { ProjectTrendChart } from './ProjectTrendChart';
import { TeamWeekChart } from './TeamWeekChart';

const RANGE_OPTIONS = [
  { value: 4, label: 'Siste 4 uker' },
  { value: 12, label: 'Siste 12 uker' },
  { value: 26, label: 'Siste 26 uker' },
];

const AVATAR_COLORS = [
  'bg-indigo-400',
  'bg-rose-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
  'bg-sky-400',
];

interface LeaderCard {
  label: string;
  leaders: LeaderData[];
  valueLabel: (leader: LeaderData) => string;
}

interface LeaderData {
  user: User;
  value: number;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColorClass(name: string): string {
  const hash = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function bestLeaders(values: LeaderData[]): LeaderData[] {
  if (values.length === 0) return [];
  const best = Math.max(...values.map((item) => item.value));
  return values.filter((item) => item.value === best && item.value > 0).sort((a, b) => a.user.name.localeCompare(b.user.name, 'nb'));
}

function longestStreak(entries: WeekEntry[]): number {
  const weekTypes = new Map<string, Set<WeekEntry['type']>>();

  for (const entry of entries) {
    const current = weekTypes.get(entry.weekStart) ?? new Set<WeekEntry['type']>();
    current.add(entry.type);
    weekTypes.set(entry.weekStart, current);
  }

  const completeWeeks = [...weekTypes.entries()]
    .filter(([, types]) => types.has('plan') && types.has('actual'))
    .map(([week]) => week)
    .sort((a, b) => a.localeCompare(b));

  if (completeWeeks.length === 0) {
    return 0;
  }

  let best = 0;
  let current = 0;
  let previous: string | null = null;

  for (const week of completeWeeks) {
    if (!previous) {
      current = 1;
      best = 1;
      previous = week;
      continue;
    }

    const previousDate = new Date(`${previous}T00:00:00`);
    previousDate.setDate(previousDate.getDate() + 7);
    const expectedWeek = weekStart(previousDate);

    if (week === expectedWeek) {
      current += 1;
    } else {
      current = 1;
    }

    best = Math.max(best, current);
    previous = week;
  }

  return best;
}

function leaderboardCards(users: User[], pairedEntries: WeekEntry[]): LeaderCard[] {
  const entriesByUser = new Map<string, WeekEntry[]>();

  for (const user of users) {
    entriesByUser.set(user.id, []);
  }

  for (const entry of pairedEntries) {
    const rows = entriesByUser.get(entry.userId) ?? [];
    rows.push(entry);
    entriesByUser.set(entry.userId, rows);
  }

  const streakValues: LeaderData[] = users.map((user) => ({
    user,
    value: longestStreak(entriesByUser.get(user.id) ?? []),
  }));

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 7 * 3);
  const minWeek = weekStart(fourWeeksAgo);

  const accuracyValues: LeaderData[] = users
    .map((user) => {
      const userEntries = entriesByUser.get(user.id) ?? [];
      const byWeek = new Map<string, { plan?: WeekEntry; actual?: WeekEntry }>();

      for (const entry of userEntries) {
        if (entry.weekStart < minWeek) continue;
        const current = byWeek.get(entry.weekStart) ?? {};
        if (entry.type === 'plan') current.plan = entry;
        if (entry.type === 'actual') current.actual = entry;
        byWeek.set(entry.weekStart, current);
      }

      const scores: number[] = [];
      for (const pair of byWeek.values()) {
        if (pair.plan && pair.actual) {
          scores.push(accuracyScore(pair.plan.allocations, pair.actual.allocations));
        }
      }

      if (scores.length < 2) {
        return null;
      }

      const avg = Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length);
      return { user, value: avg };
    })
    .filter((item): item is LeaderData => item !== null);

  const consistentValues: LeaderData[] = users.map((user) => ({
    user,
    value: (entriesByUser.get(user.id) ?? []).filter((entry) => entry.type === 'actual').length,
  }));

  return [
    {
      label: 'Lengst streak 🔥',
      leaders: bestLeaders(streakValues),
      valueLabel: (leader) => `${leader.value} uker på rad`,
    },
    {
      label: 'Best treffsikkerhet 👍',
      leaders: bestLeaders(accuracyValues),
      valueLabel: (leader) => `${leader.value}% snitt siste 4 uker`,
    },
    {
      label: 'Mest konsistent 📋',
      leaders: bestLeaders(consistentValues),
      valueLabel: (leader) => `${leader.value} uker levert`,
    },
  ];
}

export function Dashboard() {
  const [range, setRange] = useState(12);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState({ weeks: [], projects: [], entries: [] as WeekEntry[], pairedEntries: [] as WeekEntry[] });
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
        setDashboard(await getDashboard({ weeks: range }));
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
        ...week.byProject,
      })),
    [aggregatedWeeks],
  );

  const insights = useMemo(() => buildInsights(aggregatedWeeks, dashboard.projects), [aggregatedWeeks, dashboard.projects]);
  const leaderCards = useMemo(() => leaderboardCards(users, dashboard.pairedEntries), [users, dashboard.pairedEntries]);

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
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {leaderCards.map((card) => (
          <article className="rounded-xl border border-slate-200 bg-white p-4" key={card.label}>
            <p className="mb-3 text-sm font-medium text-slate-500">{card.label}</p>
            {card.leaders.length === 0 ? (
              <p className="text-sm text-slate-500">Ikke nok data ennå</p>
            ) : (
              <div className="space-y-3">
                {card.leaders.map((leader) => (
                  <div className="flex items-center gap-3" key={`${card.label}-${leader.user.id}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColorClass(leader.user.name)}`}>
                      {initials(leader.user.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {leader.user.name} <span className="ml-1">👑</span>
                      </p>
                      <p className="text-sm text-slate-600">{card.valueLabel(leader)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
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
