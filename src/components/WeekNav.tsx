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
    <div className="mb-6 flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm">
      <button className="flex items-center justify-center rounded-xl border border-gray-200 p-3 transition-colors duration-150 hover:bg-gray-100" onClick={() => stepWeek(-1)} type="button">
        ←
      </button>
      <p className="text-lg font-semibold">{formatWeekLabel(currentWeekStart)}</p>
      <button className="flex items-center justify-center rounded-xl border border-gray-200 p-3 transition-colors duration-150 hover:bg-gray-100" onClick={() => stepWeek(1)} type="button">
        →
      </button>
    </div>
  );
}
