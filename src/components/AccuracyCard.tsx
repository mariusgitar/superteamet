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

function colorClasses(color: string): {
  actualFill: string;
  planFill: string;
  leftBorder: string;
} {
  switch (color.toUpperCase()) {
    case '#6366F1':
      return {
        actualFill: 'bg-indigo-500',
        planFill: 'bg-indigo-500/70',
        leftBorder: 'border-l-indigo-500/60',
      };
    case '#E86B5F':
      return {
        actualFill: 'bg-rose-400',
        planFill: 'bg-rose-400/70',
        leftBorder: 'border-l-rose-400/60',
      };
    case '#F4A442':
      return {
        actualFill: 'bg-amber-400',
        planFill: 'bg-amber-400/70',
        leftBorder: 'border-l-amber-400/60',
      };
    case '#6BCB8B':
      return {
        actualFill: 'bg-emerald-400',
        planFill: 'bg-emerald-400/70',
        leftBorder: 'border-l-emerald-400/60',
      };
    case '#A78BFA':
      return {
        actualFill: 'bg-violet-400',
        planFill: 'bg-violet-400/70',
        leftBorder: 'border-l-violet-400/60',
      };
    default:
      return {
        actualFill: 'bg-slate-400',
        planFill: 'bg-slate-400/70',
        leftBorder: 'border-l-slate-400/60',
      };
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
  const [barsAnimatedIn, setBarsAnimatedIn] = useState(false);

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

  useEffect(() => {
    setBarsAnimatedIn(false);
    const timer = window.setTimeout(() => setBarsAnimatedIn(true), 50);

    return () => window.clearTimeout(timer);
  }, [plan.id, actual.id]);

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
    <section className="space-y-5 rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_20px_50px_-34px_rgba(79,70,229,0.7)]">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500">Treffscore</p>
        <p className="text-5xl font-bold text-indigo-600">{animatedScore}</p>
        <p className="mt-1 text-base text-slate-700">{scoreLabel(score)}</p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 text-center text-lg font-semibold text-orange-700">
        🔥 {streak} uker på rad
      </div>

      <div className="space-y-3">
        {comparisonRows.map((row) => {
          const colors = colorClasses(row.project?.color ?? '#6366F1');
          return (
            <div className={`rounded-2xl border border-slate-200 border-l-[3px] bg-white p-4 ${colors.leftBorder}`} key={row.id}>
              <p className="mb-2 w-full text-[15px] font-medium text-slate-800">{row.project?.name ?? 'Ukjent prosjekt'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs text-gray-400">Plan {row.planned}%</p>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${colors.planFill}`}
                      style={{ width: `${barsAnimatedIn ? row.planned : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-gray-400">Fasit {row.actual}%</p>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${colors.actualFill}`}
                      style={{ width: `${barsAnimatedIn ? row.actual : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
