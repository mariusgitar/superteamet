import type { Project, WeekEntry } from '../types';
import { weekNumber } from './utils';

const FULL_WEEK_HOURS = 37.5;

export interface AggregatedWeek {
  weekStart: string;
  weekLabel: string;
  byProject: Record<string, number>;
  entries: WeekEntry[];
  averageUnregisteredHours: number | null;
}

export function aggregateWeeks(weeks: string[], projects: Project[], entries: WeekEntry[]): AggregatedWeek[] {
  const rows: AggregatedWeek[] = [];

  for (const week of weeks) {
    const weekEntries = entries.filter((entry) => entry.weekStart === week);
    if (weekEntries.length === 0) {
      continue;
    }

    const byProject = Object.fromEntries(projects.map((project) => [project.id, 0]));

    for (const entry of weekEntries) {
      for (const project of projects) {
        byProject[project.id] += entry.allocations[project.id] ?? 0;
      }
    }

    for (const project of projects) {
      byProject[project.id] = Math.round(byProject[project.id] / weekEntries.length);
    }

    rows.push({
      weekStart: week,
      weekLabel: toWeekLabel(week),
      byProject,
      entries: weekEntries,
      averageUnregisteredHours: averageUnregisteredHours(weekEntries),
    });
  }

  return rows;
}

export function buildInsights(aggregatedWeeks: AggregatedWeek[], projects: Project[]): string[] {
  const unregisteredInsight = buildUnregisteredInsight(aggregatedWeeks);

  if (aggregatedWeeks.length === 0 || projects.length === 0) {
    return [
      'Ikke nok data til å beregne innsikter ennå.',
      'Registrer faktiske uker for å se prosjektfordeling.',
      'Når flere uker er registrert vises spredning automatisk.',
      unregisteredInsight,
    ];
  }

  const totals = new Map<string, number>();
  for (const project of projects) {
    totals.set(project.id, 0);
  }

  for (const week of aggregatedWeeks) {
    for (const project of projects) {
      totals.set(project.id, (totals.get(project.id) ?? 0) + week.byProject[project.id]);
    }
  }

  const projectAverages = projects.map((project) => ({
    ...project,
    avg: Math.round((totals.get(project.id) ?? 0) / aggregatedWeeks.length),
  }));

  const mostTime = [...projectAverages].sort((a, b) => b.avg - a.avg)[0];
  const leastTime = [...projectAverages].sort((a, b) => a.avg - b.avg)[0];
  const spreadWeek = [...aggregatedWeeks]
    .map((week) => ({ week, spread: weekSpread(week.entries) }))
    .sort((a, b) => b.spread - a.spread)[0];

  return [
    `Mest tid gikk til ${mostTime.name} denne perioden (snitt ${mostTime.avg}%)`,
    `Prosjektet som fikk minst tid: ${leastTime.name} (snitt ${leastTime.avg}%)`,
    `Uka med mest spredning: ${spreadWeek.week.weekLabel}`,
    unregisteredInsight,
  ];
}

function buildUnregisteredInsight(aggregatedWeeks: AggregatedWeek[]): string {
  const unregisteredValues = aggregatedWeeks
    .map((week) => week.averageUnregisteredHours)
    .filter((value): value is number => value !== null);

  if (unregisteredValues.length === 0) {
    return 'Ikke nok data for tidsestimater ennå';
  }

  const average = Math.round(unregisteredValues.reduce((sum, value) => sum + value, 0) / unregisteredValues.length);
  return `Gjennomsnittlig uregistrert tid: ~${average} t/uke`;
}

function averageUnregisteredHours(entries: WeekEntry[]): number | null {
  const unregisteredValues = entries
    .filter((entry) => entry.inputMode === 'hours' && typeof entry.totalHours === 'number')
    .map((entry) => Math.max(0, FULL_WEEK_HOURS - entry.totalHours));

  if (unregisteredValues.length === 0) {
    return null;
  }

  return unregisteredValues.reduce((sum, value) => sum + value, 0) / unregisteredValues.length;
}

function weekSpread(entries: WeekEntry[]): number {
  if (entries.length < 2) {
    return 0;
  }

  let total = 0;
  let comparisons = 0;

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const entryA = entries[i];
      const entryB = entries[j];
      const keys = new Set([...Object.keys(entryA.allocations), ...Object.keys(entryB.allocations)]);
      let diff = 0;
      for (const key of keys) {
        diff += Math.abs((entryA.allocations[key] ?? 0) - (entryB.allocations[key] ?? 0));
      }
      total += diff / 2;
      comparisons += 1;
    }
  }

  return comparisons === 0 ? 0 : Math.round(total / comparisons);
}

function toWeekLabel(weekStartDate: string): string {
  const isoDate = weekStartDate.split('T')[0];
  return `Uke ${weekNumber(isoDate)}`;
}
