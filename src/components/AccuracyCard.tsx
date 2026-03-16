import confetti from 'canvas-confetti';
import { useEffect, useMemo, useState } from 'react';
import { getProjects, getRecentEntries } from '../lib/api';
import { accuracyScore, calculateStreak } from '../lib/utils';
import type { Project, WeekEntry } from '../types';

interface AccuracyCardProps {
  plan: WeekEntry;
  actual: WeekEntry;
  userId: string;
  currentWeekStart: string;
}

const celebratedActualEntries = new Set<string>();

function colorClass(color: string): string {
  switch (color.toUpperCase()) {
    case '#6366F1':
      return 'accent-indigo-500';
    case '#E86B5F':
      return 'accent-rose-400';
    case '#F4A442':
      return 'accent-amber-400';
    case '#6BCB8B':
      return 'accent-emerald-400';
    case '#A78BFA':
      return 'accent-violet-400';
    default:
      return 'accent-slate-400';
  }
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Presist! 🎯';
  if (score >= 70) return 'Ganske treffsikker 👍';
  if (score >= 50) return 'En del avvik denne uka';
  return 'Uka tok en annen retning';
}

export function AccuracyCard({ plan, actual, userId, currentWeekStart }: AccuracyCardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentEntries, setRecentEntries] = useState<WeekEntry[]>([]);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const [projectData, entriesData] = await Promise.all([
        getProjects(),
        getRecentEntries(userId, 20),
      ]);
      setProjects(projectData);
      setRecentEntries(entriesData);
    };

    void loadData();
  }, [userId]);

  const score = accuracyScore(plan.allocations, actual.allocations);

  useEffect(() => {
    const durationMs = 800;
    const startTime = performance.now();

    const tick = (time: number) => {
      const elapsed = Math.min((time - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setAnimatedScore(Math.round(score * eased));

      if (elapsed < 1) {
        requestAnimationFrame(tick);
      }
    };

    setAnimatedScore(0);
    const frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [score]);

  useEffect(() => {
    if (score < 90 || celebratedActualEntries.has(actual.id)) {
      return;
    }

    celebratedActualEntries.add(actual.id);
    void confetti({ particleCount: 140, spread: 80, origin: { y: 0.55 } });
  }, [actual.id, score]);

  const comparisonRows = useMemo(() => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const allProjectIds = new Set([...Object.keys(plan.allocations), ...Object.keys(actual.allocations)]);

    return [...allProjectIds]
      .map((id) => ({
        id,
        project: projectById.get(id),
        planned: plan.allocations[id] ?? 0,
        actual: actual.allocations[id] ?? 0,
      }))
      .sort((a, b) => (a.project?.name ?? '').localeCompare(b.project?.name ?? '', 'nb'));
  }, [projects, plan.allocations, actual.allocations]);

  const streak = calculateStreak(recentEntries, currentWeekStart);

  return (
    <section className="space-y-5 rounded-lg bg-white p-5 shadow-sm">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">Treffscore</p>
        <p className="text-5xl font-bold text-indigo-600">{animatedScore}</p>
        <p className="mt-1 text-base text-slate-700">{scoreLabel(score)}</p>
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-center text-lg font-semibold text-orange-700">
        🔥 {streak} uker på rad
      </div>

      <div className="space-y-3">
        {comparisonRows.map((row) => {
          const color = colorClass(row.project?.color ?? '#6366F1');
          return (
            <div className="rounded-md border border-slate-200 p-3" key={row.id}>
              <p className="mb-2 text-sm font-medium text-slate-800">{row.project?.name ?? 'Ukjent prosjekt'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs text-slate-500">Plan {row.planned}%</p>
                  <progress className={`h-2 w-full rounded ${color}`} max={100} value={row.planned} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Fasit {row.actual}%</p>
                  <progress className={`h-2 w-full rounded ${color}`} max={100} value={row.actual} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
