import type { Project, WeekEntry } from '../types';

export function weekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function accuracyScore(
  plan: Record<string, number>,
  actual: Record<string, number>,
): number {
  const allKeys = new Set([...Object.keys(plan), ...Object.keys(actual)]);
  let totalDiff = 0;

  for (const key of allKeys) {
    totalDiff += Math.abs((plan[key] ?? 0) - (actual[key] ?? 0));
  }

  return Math.round(100 - totalDiff / 2);
}

export function calculateStreak(entries: WeekEntry[], currentWeekStart: string): number {
  const weekTypes = new Map<string, Set<WeekEntry['type']>>();

  for (const entry of entries) {
    const current = weekTypes.get(entry.weekStart) ?? new Set<WeekEntry['type']>();
    current.add(entry.type);
    weekTypes.set(entry.weekStart, current);
  }

  const completeWeeks = [...weekTypes.entries()]
    .filter(([, types]) => types.has('plan') && types.has('actual'))
    .map(([week]) => week)
    .sort((a, b) => b.localeCompare(a));

  const completeWeekSet = new Set(completeWeeks);
  let streak = 0;
  let cursor = currentWeekStart;

  while (completeWeekSet.has(cursor)) {
    streak += 1;
    const cursorDate = new Date(`${cursor}T12:00:00`);
    cursorDate.setDate(cursorDate.getDate() - 7);
    cursor = weekStart(cursorDate);
  }

  return streak;
}

export function sortProjects(projects: Project[], history: WeekEntry[]): Project[] {
  if (history.length === 0) {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }

  const lastWeekUsed = new Set(Object.keys(history[0]?.allocations ?? {}));
  const freq = new Map<string, number>();

  for (const entry of history) {
    for (const projectId of Object.keys(entry.allocations)) {
      freq.set(projectId, (freq.get(projectId) ?? 0) + 1);
    }
  }

  const rank = (project: Project): number => {
    if (lastWeekUsed.has(project.id)) return 0;
    if ((freq.get(project.id) ?? 0) >= 3) return 1;
    return 2;
  };

  return [...projects].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, 'nb');
  });
}

export function formatWeekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 4);

  const weekNo = isoWeek(start);
  const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
  const month = monthFormatter.format(end);

  return `Uke ${weekNo} · ${start.getDate()}–${end.getDate()} ${month}`;
}

export function weekNumber(weekStartDate: string): number {
  return isoWeek(new Date(`${weekStartDate}T12:00:00`));
}

function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
