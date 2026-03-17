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
    <div className="mb-6 flex items-center justify-between rounded-2xl border border-violet-200/20 bg-slate-900/70 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.45)]">
      <button
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200/20 bg-slate-900/70 text-slate-200 transition hover:border-violet-300/35 hover:bg-violet-500/10"
        onClick={() => stepWeek(-1)}
        type="button"
      >
        ←
      </button>
      <p className="font-semibold tracking-wide text-violet-100">{formatWeekLabel(currentWeekStart)}</p>
      <button
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-200/20 bg-slate-900/70 text-slate-200 transition hover:border-violet-300/35 hover:bg-violet-500/10"
        onClick={() => stepWeek(1)}
        type="button"
      >
        →
      </button>
    </div>
  );
}
