import { useEffect, useMemo, useState } from 'react';
import { formatWeekLabel, weekStart } from '../lib/utils';
import type { EntryType, User, WeekEntriesResponse } from '../types';
import { getWeekEntries } from '../lib/api';
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
      className="flex h-full w-full flex-col items-start rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40"
      onClick={onClick}
      type="button"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-base font-semibold tracking-tight text-slate-900">{title}</span>
        {submitted ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Levert</span>
        ) : null}
      </div>
      <span className="mt-2 text-sm text-slate-500">{subtitle}</span>
    </button>
  );
}

export function WeekView({ user, currentWeekStart, onStreakMilestone }: WeekViewProps) {
  const [entries, setEntries] = useState<WeekEntriesResponse>({ plan: null, actual: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<EntryType | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      setEntries(await getWeekEntries(user.id, currentWeekStart));
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
    const oneWeekAgo = new Date(`${thisWeek}T12:00:00`);
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
      <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(79,70,229,0.75)]">
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
    return <p className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-700 shadow-sm">{error}</p>;
  }

  if (isTooFarInPastWithoutPlan) {
    return (
      <section className="rounded-3xl border border-white/80 bg-white/80 p-8 text-center shadow-[0_20px_50px_-36px_rgba(79,70,229,0.75)]">
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
      <div className="space-y-3">
        <button
          className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
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
    <section className="space-y-4 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_50px_-36px_rgba(79,70,229,0.75)]">
      {entries.actual && !entries.plan ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Arbeid registrert for {formatWeekLabel(currentWeekStart)} ✓
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionButton
          onClick={() => setActiveForm('plan')}
          submitted={Boolean(entries.plan)}
          subtitle="Hva ønsker du å prioritere denne uka?"
          title={entries.plan ? '✏️ Juster ukesplan' : '📅 Legg inn ukesplan'}
        />
        <ActionButton
          onClick={() => setActiveForm('actual')}
          submitted={Boolean(entries.actual)}
          subtitle="Hvordan ble uka i praksis?"
          title={entries.actual ? '✏️ Juster ukas arbeid' : '✅ Registrer ukas arbeid'}
        />
      </div>
    </section>
  );
}
