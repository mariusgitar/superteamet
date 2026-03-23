import type { DashboardMetric } from '../../lib/dashboard';

interface KpiCardsProps {
  metrics: DashboardMetric[];
}

const DELTA_TONE_CLASS: Record<DashboardMetric['deltaTone'], string> = {
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  neutral: 'text-slate-500',
};

export function KpiCards({ metrics }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {metrics.map((metric) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={metric.label}>
          <p className="text-sm text-slate-500">{metric.label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
          <p className={`mt-2 text-sm ${DELTA_TONE_CLASS[metric.deltaTone]}`}>{metric.delta}</p>
        </article>
      ))}
    </div>
  );
}
