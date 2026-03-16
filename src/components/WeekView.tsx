import { useEffect, useMemo, useState } from 'react';
import { getDashboard, getWeekEntries } from '../lib/api';
import { accuracyScore, formatWeekLabel, weekStart } from '../lib/utils';
import type { DashboardResponse, EntryType, User, WeekEntriesResponse } from '../types';
import { AccuracyCard } from './AccuracyCard';
import { EntryForm } from './EntryForm';

interface WeekViewProps {
  user: User;
  currentWeekStart: string;
  onStreakMilestone?: (streak: number) => void;
}

interface ActionButtonProps {
  title: string;
  subtitle: string;
  onClick: () => void;
  submitted?: boolean;
}

function ActionButton({ title, subtitle, onClick, submitted = false }: ActionButtonProps) {
  return (
    <button
      className="flex h-full w-full flex-col items-start rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-base font-semibold text-slate-900">{title}</span>
        {submitted ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Levert</span>
        ) : null}
      </div>
      <span className="mt-2 text-sm text-slate-500">{subtitle}</span>
    </button>
  );
}

function WeeklyRecap({ dashboard }: { dashboard: DashboardResponse }) {
  const actualEntries = dashboard.allEntries.filter((entry) => entry.type === 'actual');

  if (actualEntries.length < 2) {
    return null;
  }

  const projectTotals = new Map<string, number>();
  for (const entry of actualEntries) {
    for (const [projectId, value] of Object.entries(entry.allocations)) {
      projectTotals.set(projectId, (projectTotals.get(projectId) ?? 0) + value);
    }
  }

  const topProjectId = [...projectTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topProject = dashboard.projects.find((project) => project.id === topProjectId);
  const averageTime = topProjectId ? Math.round((projectTotals.get(topProjectId) ?? 0) / actualEntries.length) : 0;

  const bestAccuracyRows = dashboard.users
    .map((person) => {
      const plan = dashboard.allEntries.find((entry) => entry.userId === person.id && entry.type === 'plan');
      const actual = dashboard.allEntries.find((entry) => entry.userId === person.id && entry.type === 'actual');

      if (!plan || !actual) {
        return null;
      }

      return {
        name: person.name,
        score: accuracyScore(plan.allocations, actual.allocations),
      };
    })
    .filter((row): row is { name: string; score: number } => row !== null)
    .sort((a, b) => b.score - a.score);

  const bestAccuracy = bestAccuracyRows[0] ?? null;
  const submittedCount = new Set(actualEntries.map((entry) => entry.userId)).size;
  const totalUsers = dashboard.users.length;
  const filledSegments = totalUsers > 0 ? Math.round((submittedCount / totalUsers) * 10) : 0;

  return (
    <section className="rounded-xl bg-blue-50 p-4">
      <h3 className="mb-3 text-base font-medium text-slate-800">Ukens oppsummering 📋</h3>
      <div className="space-y-2 text-sm text-slate-700">
        <p>📌 Teamet brukte mest tid på {topProject?.name ?? 'ukjent prosjekt'} denne uka (snitt ca. {averageTime}t)</p>
        {bestAccuracy ? <p>🎯 {bestAccuracy.name} var mest treffsikker denne uka ({bestAccuracy.score}%)</p> : null}
        <p>👥 {submittedCount} av {totalUsers} teammedlemmer har registrert uka</p>
      </div>
      <div className="mt-3 grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            className={`h-2 rounded-full ${index < filledSegments ? 'bg-blue-500' : 'bg-blue-100'}`}
            key={`segment-${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export function WeekView({ user, currentWeekStart, onStreakMilestone }: WeekViewProps) {
  const [entries, setEntries] = useState<WeekEntriesResponse>({ plan: null, actual: null });
  const [weekDashboard, setWeekDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<EntryType | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const weekEntries = await getWeekEntries(user.id, currentWeekStart);
      setEntries(weekEntries);

      if (currentWeekStart === weekStart() && weekEntries.actual) {
        const recapDashboard = await getDashboard(1, currentWeekStart);
        setWeekDashboard(recapDashboard);
      } else {
        setWeekDashboard(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Klarte ikke å hente ukeinnslag.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, [user.id, currentWeekStart]);

  useEffect(() => {
    setActiveForm(null);
  }, [currentWeekStart, user.id]);

  const isTooFarInPastWithoutPlan = useMemo(() => {
    if (entries.plan) return false;
    const thisWeek = weekStart();
    const oneWeekAgo = new Date(`${thisWeek}T00:00:00`);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStart = weekStart(oneWeekAgo);
    return currentWeekStart < oneWeekAgoStart;
  }, [currentWeekStart, entries.plan]);

  const handleSubmitted = async () => {
    await loadEntries();
    setActiveForm(null);
  };

  if (loading) {
    return (
      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-10 animate-pulse rounded-md bg-gray-200" />
        </div>
      </section>
    );
  }

  if (error) {
    return <p className="rounded-lg bg-white p-4 text-sm text-red-600 shadow-sm">{error}</p>;
  }

  if (isTooFarInPastWithoutPlan) {
    return (
      <section className="rounded-lg bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 w-20 text-slate-400" aria-hidden>
          <svg fill="none" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="20" width="90" height="82" rx="10" className="fill-slate-100 stroke-slate-300" strokeWidth="4" />
            <path d="M15 42H105" className="stroke-slate-300" strokeWidth="4" />
            <path d="M36 12V30M84 12V30" className="stroke-slate-400" strokeLinecap="round" strokeWidth="6" />
            <text x="60" y="82" textAnchor="middle" className="fill-slate-500 text-4xl font-semibold">?</text>
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-700">Ingen registreringer for denne uka.</p>
      </section>
    );
  }

  if (activeForm) {
    const isActual = activeForm === 'actual';

    return (
      <div className="space-y-2">
        <button
          className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          onClick={() => setActiveForm(null)}
          type="button"
        >
          ← Tilbake
        </button>
        <EntryForm
          existingPlan={isActual ? entries.plan : null}
          title={isActual ? 'Registrer ukas arbeid' : 'Legg inn ukesplan'}
          type={activeForm}
          userId={user.id}
          weekStart={currentWeekStart}
          onSubmitted={handleSubmitted}
          onStreakMilestone={onStreakMilestone}
        />
      </div>
    );
  }

  if (entries.plan && entries.actual) {
    return (
      <div className="space-y-3">
        <AccuracyCard
          actual={entries.actual}
          currentWeekStart={currentWeekStart}
          plan={entries.plan}
          userId={user.id}
        />
        {weekDashboard ? <WeeklyRecap dashboard={weekDashboard} /> : null}
        <div className="text-center text-sm text-slate-600">
          <button className="underline-offset-2 hover:text-slate-900 hover:underline" onClick={() => setActiveForm('plan')} type="button">
            Juster ukesplan
          </button>
          <span className="mx-2 text-slate-400">·</span>
          <button className="underline-offset-2 hover:text-slate-900 hover:underline" onClick={() => setActiveForm('actual')} type="button">
            Juster ukas arbeid
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
      {entries.actual && !entries.plan ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Arbeid registrert for {formatWeekLabel(currentWeekStart)} ✓
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionButton
          onClick={() => setActiveForm('plan')}
          submitted={Boolean(entries.plan)}
          subtitle="Hva planlegger du å bruke tid på?"
          title={entries.plan ? '✏️ Juster ukesplan' : '📅 Legg inn ukesplan'}
        />
        <ActionButton
          onClick={() => setActiveForm('actual')}
          submitted={Boolean(entries.actual)}
          subtitle="Hva brukte du faktisk tid på?"
          title={entries.actual ? '✏️ Juster ukas arbeid' : '✅ Registrer ukas arbeid'}
        />
      </div>
    </section>
  );
}
