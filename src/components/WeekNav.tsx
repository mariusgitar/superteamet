import { formatWeekLabel, weekStart } from '../lib/utils';

interface WeekNavProps {
  currentWeekStart: string;
  onChangeWeek: (weekStartDate: string) => void;
}

export function WeekNav({ currentWeekStart, onChangeWeek }: WeekNavProps) {
  const stepWeek = (delta: number) => {
    const date = new Date(`${currentWeekStart}T00:00:00`);
    date.setDate(date.getDate() + delta * 7);
    onChangeWeek(weekStart(date));
  };

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
      <button className="rounded border px-3 py-1 hover:bg-slate-50" onClick={() => stepWeek(-1)} type="button">
        ←
      </button>
      <p className="font-semibold">{formatWeekLabel(currentWeekStart)}</p>
      <button className="rounded border px-3 py-1 hover:bg-slate-50" onClick={() => stepWeek(1)} type="button">
        →
      </button>
    </div>
  );
}
