interface InsightPanelProps {
  insights: string[];
}

export function InsightPanel({ insights }: InsightPanelProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {insights.map((insight, index) => (
        <article
          className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${index === insights.length - 1 ? 'md:col-span-3' : ''}`}
          key={insight}
        >
          <p className="text-sm text-slate-700">{insight}</p>
        </article>
      ))}
    </section>
  );
}
