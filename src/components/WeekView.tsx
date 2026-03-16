import { useEffect, useState } from 'react';
import type { User, WeekEntriesResponse } from '../types';
import { getWeekEntries } from '../lib/api';
import { AccuracyCard } from './AccuracyCard';
import { EntryForm } from './EntryForm';

interface WeekViewProps {
  user: User;
  currentWeekStart: string;
}

export function WeekView({ user, currentWeekStart }: WeekViewProps) {
  const [entries, setEntries] = useState<WeekEntriesResponse>({ plan: null, actual: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">Laster ukevisning...</p>;
  }

  if (error) {
    return <p className="rounded-lg bg-white p-4 text-sm text-red-600 shadow-sm">{error}</p>;
  }

  if (!entries.plan) {
    return (
      <EntryForm
        title="Registrer plan"
        type="plan"
        userId={user.id}
        weekStart={currentWeekStart}
        onSubmitted={loadEntries}
      />
    );
  }

  if (!entries.actual) {
    return (
      <EntryForm
        existingPlan={entries.plan}
        title="Hvordan gikk uka?"
        type="actual"
        userId={user.id}
        weekStart={currentWeekStart}
        onSubmitted={loadEntries}
      />
    );
  }

  return (
    <AccuracyCard
      actual={entries.actual}
      currentWeekStart={currentWeekStart}
      plan={entries.plan}
      userId={user.id}
    />
  );
}
