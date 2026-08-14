import type { Project, WeekEntry } from '../types';

export function weekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function sortProjects(projects: Project[], history: WeekEntry[]): Project[] {
  if (history.length === 0) {
    return [...projects].sort((a, b) => String(a.name).localeCompare(String(b.name), 'nb'));
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
    return String(a.name).localeCompare(String(b.name), 'nb');
  });
}

export function formatWeekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) {
    return 'Ukjent uke';
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 4);

  const weekNo = isoWeek(start);
  const monthFormatter = new Intl.DateTimeFormat('nb-NO', { month: 'long' });
  const month = monthFormatter.format(end);

  return `Uke ${weekNo} · ${start.getDate()}–${end.getDate()} ${month}`;
}

export function weekNumber(weekStartDate: string): number {
  const date = new Date(`${weekStartDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }
  return isoWeek(date);
}

function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
