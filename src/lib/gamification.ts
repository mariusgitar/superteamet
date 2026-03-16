import { accuracyScore, calculateStreak } from './utils';
import type { User, WeekEntry } from '../types';

export interface LeaderMetric {
  userId: string;
  value: number;
}

export interface LeaderboardData {
  streakLeaders: LeaderMetric[];
  bestAccuracyLeaders: LeaderMetric[];
  consistentLeaders: LeaderMetric[];
}

export interface BadgeItem {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
}

export function buildLeaderboard(allEntries: WeekEntry[], users: User[]): LeaderboardData {
  const entriesByUser = new Map<string, WeekEntry[]>();

  for (const user of users) {
    entriesByUser.set(user.id, allEntries.filter((entry) => entry.userId === user.id));
  }

  const streakRows: LeaderMetric[] = [];
  const consistentRows: LeaderMetric[] = [];
  const accuracyRows: LeaderMetric[] = [];

  for (const user of users) {
    const entries = entriesByUser.get(user.id) ?? [];
    const actualWeeks = new Set(entries.filter((entry) => entry.type === 'actual').map((entry) => entry.weekStart));
    const sortedActualWeeks = [...actualWeeks].sort((a, b) => b.localeCompare(a));
    const currentWeek = sortedActualWeeks[0];
    const streak = currentWeek ? calculateStreak(entries, currentWeek) : 0;

    streakRows.push({ userId: user.id, value: streak });
    consistentRows.push({ userId: user.id, value: actualWeeks.size });

    const recentWeeks = [...new Set(entries.map((entry) => entry.weekStart))].sort((a, b) => b.localeCompare(a)).slice(0, 4);
    const scores = recentWeeks
      .map((week) => {
        const plan = entries.find((entry) => entry.weekStart === week && entry.type === 'plan');
        const actual = entries.find((entry) => entry.weekStart === week && entry.type === 'actual');
        if (!plan || !actual) {
          return null;
        }

        return accuracyScore(plan.allocations, actual.allocations);
      })
      .filter((value): value is number => value !== null);

    if (scores.length >= 2) {
      accuracyRows.push({
        userId: user.id,
        value: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      });
    }
  }

  return {
    streakLeaders: leaderRows(streakRows),
    bestAccuracyLeaders: leaderRows(accuracyRows),
    consistentLeaders: leaderRows(consistentRows),
  };
}

function leaderRows(rows: LeaderMetric[]): LeaderMetric[] {
  if (rows.length === 0) {
    return [];
  }

  const highest = Math.max(...rows.map((row) => row.value));
  return rows.filter((row) => row.value === highest && row.value > 0);
}

export function avatarColorClass(name: string): string {
  const colors = [
    'bg-indigo-500',
    'bg-rose-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-sky-500',
  ];

  const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function buildBadges(entries: WeekEntry[]): BadgeItem[] {
  const actualEntries = entries.filter((entry) => entry.type === 'actual');
  const completeWeeks = completeWeekCount(entries);
  const bestStreak = longestStreak(entries);
  const hasPerfectWeek = hasPerfectAccuracy(entries);

  const usedProjects = new Set<string>();
  for (const entry of entries) {
    for (const projectId of Object.keys(entry.allocations)) {
      usedProjects.add(projectId);
    }
  }

  const badges: BadgeItem[] = [
    { id: 'first', icon: '🎉', label: 'Første uke', earned: actualEntries.length >= 1 },
    { id: 'streak5', icon: '🔥', label: '5 uker på rad', earned: bestStreak >= 5 },
    { id: 'streak10', icon: '🔥🔥', label: '10 uker på rad', earned: bestStreak >= 10 },
    { id: 'perfect', icon: '🎯', label: 'Perfekt uke', earned: hasPerfectWeek },
    { id: 'analyst', icon: '📊', label: 'Analytiker', earned: completeWeeks >= 10 },
    { id: 'explorer', icon: '🌱', label: 'Utforsker', earned: usedProjects.size >= 5 },
    { id: 'master', icon: '🏆', label: 'Mesteren', earned: false },
  ];

  const allCoreUnlocked = badges.slice(0, 6).every((badge) => badge.earned);
  badges[6].earned = allCoreUnlocked;

  return badges;
}

function completeWeekCount(entries: WeekEntry[]): number {
  const weekTypes = new Map<string, Set<WeekEntry['type']>>();

  for (const entry of entries) {
    const types = weekTypes.get(entry.weekStart) ?? new Set<WeekEntry['type']>();
    types.add(entry.type);
    weekTypes.set(entry.weekStart, types);
  }

  return [...weekTypes.values()].filter((types) => types.has('plan') && types.has('actual')).length;
}

function longestStreak(entries: WeekEntry[]): number {
  const actualWeeks = [...new Set(entries.filter((entry) => entry.type === 'actual').map((entry) => entry.weekStart))]
    .sort((a, b) => b.localeCompare(a));

  let best = 0;

  for (const week of actualWeeks) {
    best = Math.max(best, calculateStreak(entries, week));
  }

  return best;
}

function hasPerfectAccuracy(entries: WeekEntry[]): boolean {
  const weeks = [...new Set(entries.map((entry) => entry.weekStart))];

  for (const week of weeks) {
    const plan = entries.find((entry) => entry.weekStart === week && entry.type === 'plan');
    const actual = entries.find((entry) => entry.weekStart === week && entry.type === 'actual');

    if (plan && actual && accuracyScore(plan.allocations, actual.allocations) === 100) {
      return true;
    }
  }

  return false;
}
