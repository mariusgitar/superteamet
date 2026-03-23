import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { DonutCardData } from '../../lib/dashboard';

interface WeeklyDonutsProps {
  cards: DonutCardData[];
}

export function WeeklyDonuts({ cards }: WeeklyDonutsProps) {
  const safeCards = Array.isArray(cards) ? cards : [];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {safeCards.map((card) => (
          <article className="w-40 min-w-40 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:w-48 md:min-w-48" key={card.user.id}>
            <div className="relative h-40 w-full">
              {card.badge ? (
                <span className="absolute right-2 top-2 z-10 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  {card.badge}
                </span>
              ) : null}
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={card.slices} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                    {(card.slices ?? []).map((slice) => (
                      <Cell fill={slice.color} key={slice.id} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-slate-900">{card.user.name}</p>
                <p className="text-sm text-slate-500">{card.hasData && card.totalHours !== null ? `${formatHours(card.totalHours)}` : 'Ingen data'}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              {(card.legendItems ?? []).length > 0 ? (
                (card.legendItems ?? []).map((item) => (
                  <div className="flex items-center justify-between gap-2" key={item.id}>
                    <span className="truncate">{item.name}</span>
                    <span className="font-medium text-slate-900">{formatHours(item.value)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">{card.emptyMessage ?? 'Ingen registreringer denne uka.'}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}t`;
}
