import { useMemo } from 'react';
import type { DashboardWeekResponse, User } from '../../types';
import { buildComparisonRows, buildDonutCards } from '../../lib/dashboard';
import { ComparisonTable } from './ComparisonTable';
import { WeeklyDonuts } from './WeeklyDonuts';

interface ThisWeekTabProps {
  current: DashboardWeekResponse;
  previous: DashboardWeekResponse;
  selectedUserId: string | null;
  users: User[];
}

export function ThisWeekTab({ current, previous, selectedUserId, users }: ThisWeekTabProps) {
  const safeUsers = users ?? [];
  const currentEntries = current.entries ?? [];
  const displayedUsers = selectedUserId ? safeUsers.filter((user) => user.id === selectedUserId) : safeUsers;
  const cards = useMemo(() => buildDonutCards({ ...current, users }, selectedUserId), [current, selectedUserId, users]);
  const rows = useMemo(() => buildComparisonRows({
    entries: currentEntries,
    projects: current.projects ?? [],
    users: safeUsers,
    selectedUserId,
  }), [current, selectedUserId, users]);
  const actualUserIds = new Set(currentEntries.filter((entry) => entry.type === 'actual').map((entry) => entry.userId));
  const currentMissing = averageMissing(current, displayedUsers);
  const previousMissing = averageMissing(previous, displayedUsers);
  const delta = currentMissing !== null && previousMissing !== null ? currentMissing - previousMissing : null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Registreringsstatus</h2>
        <div className="flex flex-wrap gap-2">
          {safeUsers.map((user) => {
            const registered = actualUserIds.has(user.id);
            return (
              <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${registered ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} key={user.id}>
                {user.name}: {registered ? '✓ Registrert' : '— Ikke registrert'}
              </span>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Denne uka</h2>
        <WeeklyDonuts cards={cards} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Uregistrert tid</h2>
          {delta !== null ? <span className={`text-sm font-semibold ${delta <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta <= 0 ? '↓' : '↑'} {formatHours(Math.abs(delta))}</span> : null}
        </div>
        <div className="mt-5 grid grid-cols-2 divide-x divide-slate-200">
          <Metric label="Denne uka" value={currentMissing} />
          <Metric label="Forrige uke" value={previousMissing} />
        </div>
        <p className="mt-4 text-xs text-slate-400">Gjennomsnitt for brukere som registrerer timer.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Team sammenligning denne uka</h2>
        <ComparisonTable rows={rows} users={displayedUsers} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return <div className="px-4 first:pl-0"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value === null ? '—' : `~${formatHours(value)} uregistrert`}</p></div>;
}

function averageMissing(data: DashboardWeekResponse, users: User[]): number | null {
  const ids = new Set((users ?? []).map((user) => user.id));
  const totals = (data.entries ?? [])
    .filter((entry) => entry.type === 'actual' && entry.inputMode === 'hours' && ids.has(entry.userId))
    .map((entry) => Object.values(entry.hours ?? {}).reduce((sum, value) => sum + value, 0));
  return totals.length === 0 ? null : totals.reduce((sum, total) => sum + Math.max(0, 37.5 - total), 0) / totals.length;
}

function formatHours(value: number) {
  return `${(Math.round(value * 10) / 10).toLocaleString('nb-NO')} t`;
}
