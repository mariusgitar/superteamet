export function ExportButton() {
  return (
    <a
      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      href="/api/export"
    >
      Eksporter CSV
    </a>
  );
}
