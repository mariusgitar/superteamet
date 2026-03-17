import { formatWeekLabel, weekStart } from '../lib/utils';

interface WeekNavProps {
  currentWeekStart: string;
  onChangeWeek: (weekStartDate: string) => void;
}

export function WeekNav({ currentWeekStart, onChangeWeek }: WeekNavProps) {
  const stepWeek = (delta: number) => {
    const date = new Date(`${currentWeekStart}T12:00:00`);
    date.setDate(date.getDate() + delta * 7);
    onChangeWeek(weekStart(date));
  };

  return (
    <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_14px_40px_-28px_rgba(79,70,229,0.6)] backdrop-blur">
      <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600" onClick={() => stepWeek(-1)} type="button">
        ←
      </button>
      <p className="rounded-full border border-indigo-100 bg-indigo-50/70 px-4 py-1.5 text-sm font-semibold tracking-wide text-indigo-700">{formatWeekLabel(currentWeekStart)}</p>
      <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600" onClick={() => stepWeek(1)} type="button">
        →
      </button>
    </div>
  );
}
