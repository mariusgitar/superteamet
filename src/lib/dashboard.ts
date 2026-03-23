import type { AllocationMap, DashboardResponse, DashboardWeekResponse, Project, User, WeekEntry } from '../types';
import { accuracyScore, formatWeekLabel, weekNumber, weekStart as getWeekStart } from './utils';

const FULL_WEEK_HOURS = 37.5;
const DONUT_PROJECT_LIMIT = 5;
const LEGEND_PROJECT_LIMIT = 3;

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  deltaTone: 'positive' | 'negative' | 'neutral';
  sublabel?: string;
}

export interface DonutSlice {
  id: string;
  name: string;
  color: string;
  value: number;
}

export interface DonutCardData {
  user: User;
  totalHours: number | null;
  hasData: boolean;
  badge?: string;
  emptyMessage?: string;
  slices: DonutSlice[];
  legendItems: DonutSlice[];
}

export interface DonutSectionData {
  title: string;
  tableTitle: string;
  emptyMessage: string;
  cards: DonutCardData[];
  rows: ComparisonRow[];
}

export interface ComparisonRow {
  projectId: string;
  projectName: string;
  values: Record<string, number | null>;
  average: number;
}

export interface TopProjectBar {
  id: string;
  name: string;
  color: string;
  hours: number;
  percentage: number;
}

export interface AccuracyHistoryRow {
  weekStart: string;
  weekLabel: string;
  [userId: string]: number | string | null;
}

export function getPreviousWeekStart(weekStart: string): string {
  const cursor = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(cursor.getTime())) {
    return getWeekStart();
  }
  cursor.setDate(cursor.getDate() - 7);
  return getWeekStart(cursor);
}

export function calculateDashboardMetrics(params: {
  currentWeek: DashboardWeekResponse;
  previousWeek: DashboardWeekResponse;
  weekBeforePrevious: DashboardWeekResponse;
  selectedUserId: string | null;
  streakEntries: WeekEntry[];
  streakUsers: User[];
}): DashboardMetric[] {
  const { currentWeek, previousWeek, weekBeforePrevious, selectedUserId, streakEntries, streakUsers } = params;
  const currentUsers = selectedUserId
    ? currentWeek.users.filter((user) => user.id === selectedUserId)
    : currentWeek.users;
  const previousUsers = selectedUserId
    ? previousWeek.users.filter((user) => user.id === selectedUserId)
    : previousWeek.users;
  const weekBeforeUsers = selectedUserId
    ? weekBeforePrevious.users.filter((user) => user.id === selectedUserId)
    : weekBeforePrevious.users;

  const currentScope = filterEntriesByUsers(currentWeek.entries, currentUsers);
  const previousScope = filterEntriesByUsers(previousWeek.entries, previousUsers);
  const weekBeforeScope = filterEntriesByUsers(weekBeforePrevious.entries, weekBeforeUsers);

  const currentHasActual = currentScope.some((entry) => entry.type === 'actual');
  const previousHours = summarizeHours(previousScope);
  const weekBeforeHours = summarizeHours(weekBeforeScope);
  const previousAccuracy = summarizeAccuracy(previousScope);
  const weekBeforeAccuracy = summarizeAccuracy(weekBeforeScope);
  const previousProjects = summarizeActiveProjects(previousScope);
  const weekBeforeProjects = summarizeActiveProjects(weekBeforeScope);
  const previousUnregistered = summarizeUnregistered(previousScope);
  const weekBeforeUnregistered = summarizeUnregistered(weekBeforeScope);
  const streak = calculateTeamSubmissionStreak(streakEntries, streakUsers);
  const currentPlanSummary = summarizePlanHours(currentScope, currentUsers.length);

  return [
    {
      label: 'Timer registrert forrige uke',
      value: previousHours.total === null ? '—' : formatHours(previousHours.total),
      delta: formatDelta({ current: previousHours.total, previous: weekBeforeHours.total, unit: 'hours' }),
      deltaTone: getDeltaTone(previousHours.total, weekBeforeHours.total, 'higher-is-better'),
    },
    {
      label: 'Aktive prosjekter',
      value: previousHours.total === null ? '—' : String(previousProjects),
      delta: currentHasActual ? formatDelta({ current: previousProjects, previous: weekBeforeProjects, unit: 'count' }) : '—',
      deltaTone: currentHasActual ? getDeltaTone(previousProjects, weekBeforeProjects, 'higher-is-better') : 'neutral',
    },
    {
      label: 'Treffscore forrige uke',
      value: previousAccuracy === null ? '—' : `${previousAccuracy}%`,
      delta: formatDelta({ current: previousAccuracy, previous: weekBeforeAccuracy, unit: 'percent' }),
      deltaTone: getDeltaTone(previousAccuracy, weekBeforeAccuracy, 'higher-is-better'),
    },
    {
      label: 'Uregistrert tid',
      value: previousUnregistered === null ? '—' : formatHours(previousUnregistered),
      delta: formatDelta({ current: previousUnregistered, previous: weekBeforeUnregistered, unit: 'hours', invertTone: true }),
      deltaTone: getDeltaTone(previousUnregistered, weekBeforeUnregistered, 'lower-is-better'),
    },
    {
      label: 'Team streak',
      value: `🔥 ${streak}`,
      delta: 'Alle leverte faktisk ukeinnsikt',
      deltaTone: 'neutral',
    },
    {
      label: 'Planlagte timer denne uka',
      value: currentPlanSummary.totalHours === null ? '—' : formatHours(currentPlanSummary.totalHours),
      sublabel: currentPlanSummary.totalHours === null
        ? 'Ingen har lagt inn ukesplan ennå'
        : `${currentPlanSummary.plannedUsers} av ${currentPlanSummary.teamSize} teammedlemmer har planlagt`,
      delta: '—',
      deltaTone: 'neutral',
    },
  ];
}

export function buildDonutCards(week: DashboardWeekResponse, selectedUserId: string | null, options?: { entryType?: 'plan' | 'actual'; badge?: string; emptyMessage?: string }): DonutCardData[] {
  const weekUsers = Array.isArray(week.users) ? week.users : [];
  const weekEntries = Array.isArray(week.entries) ? week.entries : [];
  const weekProjects = Array.isArray(week.projects) ? week.projects : [];
  const users = selectedUserId ? weekUsers.filter((user) => user.id === selectedUserId) : weekUsers;
  const entryType = options?.entryType ?? 'actual';
  const emptyMessage = options?.emptyMessage ?? 'Ingen registreringer denne uka.';

  return users.map((user) => {
    const entry = weekEntries.find((weekEntry) => weekEntry.userId === user.id && weekEntry.type === entryType);
    const source = entryType === 'actual' ? entry?.hours : entry?.allocations;

    if (!entry || !source) {
      return {
        user,
        totalHours: null,
        hasData: false,
        badge: options?.badge,
        emptyMessage,
        slices: [{ id: 'empty', name: 'Ingen data', color: '#e2e8f0', value: 1 }],
        legendItems: [],
      };
    }

    const byProject = Object.entries(source)
      .filter(([, value]) => value > 0)
      .map(([projectId, value]) => ({
        id: projectId,
        name: weekProjects.find((project) => project.id === projectId)?.name ?? 'Ukjent prosjekt',
        color: weekProjects.find((project) => project.id === projectId)?.color ?? '#94a3b8',
        value: entryType === 'actual' ? value : percentToHours(value),
      }))
      .sort((a, b) => b.value - a.value);

    if (byProject.length === 0) {
      return {
        user,
        totalHours: 0,
        hasData: false,
        badge: options?.badge,
        emptyMessage,
        slices: [{ id: 'empty', name: 'Ingen data', color: '#e2e8f0', value: 1 }],
        legendItems: [],
      };
    }

    const topProjects = byProject.slice(0, DONUT_PROJECT_LIMIT);
    const otherHours = byProject.slice(DONUT_PROJECT_LIMIT).reduce((sum, item) => sum + item.value, 0);
    const slices = otherHours > 0
      ? [...topProjects, { id: 'other', name: 'Andre', color: '#cbd5e1', value: otherHours }]
      : topProjects;

    return {
      user,
      totalHours: entryType === 'actual' ? (entry.totalHours ?? sumAllocation(source)) : allocationPercentToHours(source),
      hasData: true,
      badge: options?.badge,
      emptyMessage,
      slices,
      legendItems: slices.slice(0, LEGEND_PROJECT_LIMIT),
    };
  });
}

export function buildCurrentWeekSection(params: {
  currentWeek: DashboardWeekResponse;
  previousWeek: DashboardWeekResponse;
  selectedUserId: string | null;
}): DonutSectionData {
  const { currentWeek, previousWeek, selectedUserId } = params;
  const currentEntries = currentWeek.entries ?? [];
  const currentWeekStart = currentEntries[0]?.weekStart ?? '';
  const previousWeekStart = (previousWeek.entries ?? [])[0]?.weekStart ?? '';
  const hasThisWeekActual = currentEntries.some((entry) => entry.type === 'actual');
  const hasThisWeekPlan = currentEntries.some((entry) => entry.type === 'plan');
  const hasPrevWeekActual = (previousWeek.entries ?? []).some((entry) => entry.type === 'actual');

  if (hasThisWeekActual) {
    return {
      title: `Ukas arbeid (${formatWeekShortLabel(currentWeekStart)})`,
      tableTitle: 'Team sammenligning denne uka',
      emptyMessage: 'Ingen registreringer ennå',
      cards: buildDonutCards(currentWeek, selectedUserId),
      rows: buildComparisonRows({
        entries: currentWeek.entries ?? [],
        projects: currentWeek.projects ?? [],
        users: currentWeek.users ?? [],
        selectedUserId,
        entryType: 'actual',
      }),
    };
  }

  if (hasThisWeekPlan) {
    return {
      title: `Ukesplan (${formatWeekShortLabel(currentEntries.find((entry) => entry.type === 'plan')?.weekStart ?? '')})`,
      tableTitle: 'Team sammenligning denne uka',
      emptyMessage: 'Ingen registreringer ennå',
      cards: buildDonutCards(currentWeek, selectedUserId, { entryType: 'plan', badge: 'Plan', emptyMessage: 'Ingen har lagt inn ukesplan ennå.' }),
      rows: buildComparisonRows({
        entries: currentWeek.entries ?? [],
        projects: currentWeek.projects ?? [],
        users: currentWeek.users ?? [],
        selectedUserId,
        entryType: 'plan',
      }),
    };
  }

  if (hasPrevWeekActual) {
    return {
      title: `Forrige uke (${formatWeekShortLabel(previousWeekStart)})`,
      tableTitle: 'Team sammenligning forrige uke',
      emptyMessage: 'Ingen registreringer ennå',
      cards: buildDonutCards(previousWeek, selectedUserId),
      rows: buildComparisonRows({
        entries: previousWeek.entries ?? [],
        projects: previousWeek.projects ?? [],
        users: previousWeek.users ?? [],
        selectedUserId,
        entryType: 'actual',
      }),
    };
  }

  return {
    title: 'Ingen registreringer ennå',
    tableTitle: 'Team sammenligning',
    emptyMessage: 'Ingen registreringer ennå',
    cards: [],
    rows: [],
  };
}

export function buildComparisonRows(params: {
  entries: WeekEntry[];
  projects: Project[];
  users: User[];
  selectedUserId: string | null;
  aggregateByPeriod?: boolean;
  entryType?: 'plan' | 'actual';
}): ComparisonRow[] {
  const users = params.selectedUserId ? (params.users ?? []).filter((user) => user.id === params.selectedUserId) : (params.users ?? []);
  const entryType = params.entryType ?? 'actual';
  const scopedEntries = filterEntriesByUsers(params.entries ?? [], users).filter((entry) => entry.type === entryType);
  const rowsByProject = new Map<string, Record<string, number>>();

  for (const entry of scopedEntries) {
    const source = entryType === 'actual' ? (entry.hours ?? {}) : entry.allocations;
    for (const [projectId, value] of Object.entries(source)) {
      if (value <= 0) continue;
      const row = rowsByProject.get(projectId) ?? {};
      const normalizedValue = entryType === 'actual' ? value : percentToHours(value);
      row[entry.userId] = (row[entry.userId] ?? 0) + normalizedValue;
      rowsByProject.set(projectId, row);
    }
  }

  return [...rowsByProject.entries()]
    .map(([projectId, values]) => {
      const registeredValues = Object.values(values).filter((value) => value > 0);
      return {
        projectId,
        projectName: (params.projects ?? []).find((project) => project.id === projectId)?.name ?? 'Ukjent prosjekt',
        values: Object.fromEntries(users.map((user) => [user.id, values[user.id] ?? null])),
        average: registeredValues.length === 0 ? 0 : registeredValues.reduce((sum, value) => sum + value, 0) / registeredValues.length,
      };
    })
    .sort((a, b) => b.average - a.average);
}

export function buildTopProjectBars(entries: WeekEntry[], projects: Project[], selectedUserId: string | null, users: User[]): TopProjectBar[] {
  const safeUsers = users ?? [];
  const safeProjects = projects ?? [];
  const scopedEntries = filterEntriesByUsers(entries ?? [], selectedUserId ? safeUsers.filter((user) => user.id === selectedUserId) : safeUsers)
    .filter((entry) => entry.type === 'actual');
  const totals = new Map<string, number>();

  for (const entry of scopedEntries) {
    for (const [projectId, value] of Object.entries(entry.hours ?? {})) {
      if (value <= 0) continue;
      totals.set(projectId, (totals.get(projectId) ?? 0) + value);
    }
  }

  const sorted = [...totals.entries()]
    .map(([projectId, hours]) => ({
      id: projectId,
      name: safeProjects.find((project) => project.id === projectId)?.name ?? 'Ukjent prosjekt',
      color: safeProjects.find((project) => project.id === projectId)?.color ?? '#94a3b8',
      hours,
    }))
    .sort((a, b) => b.hours - a.hours);

  const top = sorted.slice(0, 5);
  const otherHours = sorted.slice(5).reduce((sum, item) => sum + item.hours, 0);
  const totalHours = sorted.reduce((sum, item) => sum + item.hours, 0);
  const withOther = otherHours > 0 ? [...top, { id: 'other', name: 'Andre', color: '#cbd5e1', hours: otherHours }] : top;

  return withOther.map((item) => ({
    ...item,
    percentage: totalHours === 0 ? 0 : Math.round((item.hours / totalHours) * 100),
  }));
}

export function buildAccuracyHistory(response: DashboardResponse, users: User[], selectedUserId: string | null): AccuracyHistoryRow[] {
  const safeUsers = users ?? [];
  const safeWeeks = response.weeks ?? [];
  const safeEntries = response.entries ?? [];
  const scopedUsers = selectedUserId ? safeUsers.filter((user) => user.id === selectedUserId) : safeUsers;

  return safeWeeks
    .map((week) => {
      const row: AccuracyHistoryRow = {
        weekStart: week,
        weekLabel: formatWeekLabel(week),
      };
      let count = 0;

      for (const user of scopedUsers) {
        const plan = safeEntries.find((entry) => entry.weekStart === week && entry.userId === user.id && entry.type === 'plan');
        const actual = safeEntries.find((entry) => entry.weekStart === week && entry.userId === user.id && entry.type === 'actual');
        const value = plan && actual ? accuracyScore(plan.allocations, actual.allocations) : null;
        row[user.id] = value;
        if (value !== null) count += 1;
      }

      return count > 0 ? row : null;
    })
    .filter((row): row is AccuracyHistoryRow => row !== null);
}

function filterEntriesByUsers(entries: WeekEntry[], users: User[]): WeekEntry[] {
  const userIds = new Set((users ?? []).map((user) => user.id));
  return (entries ?? []).filter((entry) => userIds.has(entry.userId));
}

function summarizeHours(entries: WeekEntry[]): { total: number | null } {
  const hourEntries = entries.filter((entry) => entry.type === 'actual' && entry.inputMode === 'hours' && typeof entry.totalHours === 'number');
  if (hourEntries.length === 0) return { total: null };
  return { total: hourEntries.reduce((sum, entry) => sum + (entry.totalHours ?? 0), 0) };
}

function summarizeActiveProjects(entries: WeekEntry[]): number {
  const projectIds = new Set<string>();
  for (const entry of entries) {
    if (entry.type !== 'actual') continue;
    for (const [projectId, value] of Object.entries(entry.hours ?? {})) {
      if (value > 0) projectIds.add(projectId);
    }
  }
  return projectIds.size;
}

function summarizeAccuracy(entries: WeekEntry[]): number | null {
  const grouped = new Map<string, { plan?: WeekEntry; actual?: WeekEntry }>();
  for (const entry of entries) {
    const current = grouped.get(entry.userId) ?? {};
    if (entry.type === 'plan') current.plan = entry;
    if (entry.type === 'actual') current.actual = entry;
    grouped.set(entry.userId, current);
  }

  const values = [...grouped.values()]
    .map((group) => (group.plan && group.actual ? accuracyScore(group.plan.allocations, group.actual.allocations) : null))
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function summarizeUnregistered(entries: WeekEntry[]): number | null {
  const hourEntries = entries.filter((entry) => entry.type === 'actual' && entry.inputMode === 'hours' && typeof entry.totalHours === 'number');
  if (hourEntries.length === 0) return null;
  const totalRegistered = hourEntries.reduce((sum, entry) => sum + (entry.totalHours ?? 0), 0);
  return Math.max(0, FULL_WEEK_HOURS - totalRegistered / hourEntries.length);
}

function calculateTeamSubmissionStreak(entries: WeekEntry[], users: User[]): number {
  const teamSize = users.length;
  if (teamSize === 0) return 0;

  const byWeek = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (entry.type !== 'actual') continue;
    const current = byWeek.get(entry.weekStart) ?? new Set<string>();
    current.add(entry.userId);
    byWeek.set(entry.weekStart, current);
  }

  const fullWeeks = [...byWeek.entries()]
    .filter(([, userIds]) => userIds.size === teamSize)
    .map(([week]) => week)
    .sort((a, b) => String(b).localeCompare(String(a)));

  if (fullWeeks.length === 0) return 0;

  let streak = 0;
  let cursor = fullWeeks[0];
  const fullWeekSet = new Set(fullWeeks);

  while (fullWeekSet.has(cursor)) {
    streak += 1;
    cursor = getPreviousWeekStart(cursor);
  }

  return streak;
}

function formatDelta(params: { current: number | null; previous: number | null; unit: 'hours' | 'percent' | 'count'; invertTone?: boolean }): string {
  const { current, previous, unit, invertTone = false } = params;
  if (current === null || previous === null) {
    return '—';
  }

  const diff = Math.round((current - previous) * 10) / 10;
  if (diff === 0) {
    return '= Ingen endring fra forrige uke';
  }

  const improved = invertTone ? diff < 0 : diff > 0;
  const arrow = improved ? '↑' : '↓';
  const absValue = Math.abs(diff);
  const formattedValue = unit === 'percent'
    ? `${Math.round(absValue)}%`
    : unit === 'hours'
      ? formatHours(absValue)
      : `${Math.round(absValue)}`;

  return `${arrow} ${formattedValue} fra forrige uke`;
}

function getDeltaTone(current: number | null, previous: number | null, direction: 'higher-is-better' | 'lower-is-better'): 'positive' | 'negative' | 'neutral' {
  if (current === null || previous === null) return 'neutral';
  if (current === previous) return 'neutral';
  const improved = direction === 'higher-is-better' ? current > previous : current < previous;
  return improved ? 'positive' : 'negative';
}

function formatWeekShortLabel(weekStart: string): string {
  if (!weekStart) return 'uke 0';
  const date = new Date(`${weekStart}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'uke 0';
  return `uke ${weekNumber(weekStart)}`;
}

function summarizePlanHours(entries: WeekEntry[], teamSize: number): { totalHours: number | null; plannedUsers: number; teamSize: number } {
  const planEntries = entries.filter((entry) => entry.type === 'plan');
  if (planEntries.length === 0) {
    return { totalHours: null, plannedUsers: 0, teamSize };
  }

  const totalHours = planEntries.reduce((sum, entry) => sum + allocationPercentToHours(entry.allocations), 0);
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    plannedUsers: planEntries.length,
    teamSize,
  };
}

function allocationPercentToHours(allocations: AllocationMap): number {
  const totalPercent = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  return percentToHours(totalPercent);
}

function percentToHours(percent: number): number {
  return (percent / 100) * FULL_WEEK_HOURS;
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}t`;
}

function sumAllocation(hours: AllocationMap): number {
  return Object.values(hours).reduce((sum, value) => sum + value, 0);
}
