import { useEffect, useMemo, useState } from 'react';
import { formatWeekLabel, weekStart } from '../lib/utils';
import type { User, WeekEntriesResponse } from '../types';
import { getWeekEntries } from '../lib/api';
import { EntryForm } from './EntryForm';

interface WeekViewProps {
  user: User;
  currentWeekStart: string;
}

const CELEBRATION_MESSAGES = [
  'Uka er loggført! 🎉',
  'Ryddig uke, ryddig hode. ✨',
  'Registrert og glemt — på den gode måten. 🚀',
  'Nok en uke i boks! 💪',
  'Data er makt. Du har makt. 📊',
  'Teamet takker deg. 🙌',
  'Uka dokumentert. Helgen fortjent. 🌅',
  'Imponerende konsistens! 💡',
];

export function WeekView({ user, currentWeekStart }: WeekViewProps) {
  const [entries, setEntries] = useState<WeekEntriesResponse>({ actual: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(CELEBRATION_MESSAGES[0]);

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
    setShowConfirmation(false);
    void loadEntries();
  }, [user.id, currentWeekStart]);

  const isTooFarInPastWithoutActual = useMemo(() => {
    if (entries.actual) return false;
    const oneWeekAgo = new Date(`${weekStart()}T12:00:00`);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return currentWeekStart < weekStart(oneWeekAgo);
  }, [currentWeekStart, entries.actual]);

  const handleSubmitted = async () => {
    await loadEntries();
    setConfirmationMessage(CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]);
    setShowConfirmation(true);
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

  if (isTooFarInPastWithoutActual) {
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
        <p className="text-lg font-medium text-slate-700">Ingen registreringer for denne uka</p>
      </section>
    );
  }

  if (showConfirmation) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-white/85 p-6 shadow-[0_20px_50px_-34px_rgba(79,70,229,0.7)]">
        <h2 className="text-xl font-semibold text-slate-900">✓ Ukas arbeid registrert</h2>
        <p className="mt-2 text-slate-700">{confirmationMessage}</p>
        <p className="mt-1 text-slate-500">{formatWeekLabel(currentWeekStart)}</p>
        <button
          className="mt-6 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          onClick={() => setShowConfirmation(false)}
          type="button"
        >
          Juster registrering
        </button>
      </section>
    );
  }

  return (
    <EntryForm
      existingEntry={entries.actual}
      onSubmitted={handleSubmitted}
      userId={user.id}
      weekStart={currentWeekStart}
    />
  );
}
