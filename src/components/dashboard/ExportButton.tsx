import { useState } from 'react';
import { getExport } from '../../lib/api';
import { weekStart } from '../../lib/utils';
import type { ExportRow } from '../../types';

const HEADERS = ['Uke', 'Uke start', 'Bruker', 'Prosjekt', 'Timer', 'Prosent', 'Tilgjengelige timer', 'Uregistrert', 'Dager borte'];

function mondayToWeek(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604800000);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function weekToMonday(value: string): string {
  const [yearText, weekText] = value.split('-W');
  const year = Number(yearText);
  const week = Number(weekText);
  const fourthJanuary = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(fourthJanuary);
  monday.setUTCDate(fourthJanuary.getUTCDate() - ((fourthJanuary.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowValues(row: ExportRow): Array<string | number> {
  return [row.weekLabel, row.weekStart, row.userName, row.projectName, row.hours, row.percent, row.availableHours, row.unregisteredHours, row.daysAbsent];
}

export function ExportButton() {
  const currentMonday = weekStart();
  const initialFrom = new Date(`${currentMonday}T12:00:00`);
  initialFrom.setDate(initialFrom.getDate() - 12 * 7);
  const [open, setOpen] = useState(false);
  const [fromWeek, setFromWeek] = useState(mondayToWeek(weekStart(initialFrom)));
  const [toWeek, setToWeek] = useState(mondayToWeek(currentMonday));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCsv = async () => {
    const from = weekToMonday(fromWeek);
    const to = weekToMonday(toWeek);
    if (from > to) { setError('Fra uke må være før til uke.'); return; }
    setExporting(true);
    setError(null);
    try {
      const { rows } = await getExport(from, to);
      const csv = `\uFEFF${[HEADERS, ...rows.map(rowValues)].map((row) => row.map(escapeCsv).join(';')).join('\r\n')}`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      link.download = `ukespeil-export-${from}-${to}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Eksporten mislyktes.');
    } finally { setExporting(false); }
  };

  return <>
    <button className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900" onClick={() => setOpen(true)} type="button">Eksporter CSV</button>
    {open ? <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-slate-900">Eksporter data</h2>
        <div className="mt-5 space-y-4">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Fra uke<input className="rounded-xl border border-slate-300 px-3 py-2" onChange={(event) => setFromWeek(event.target.value)} type="week" value={fromWeek} /></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">Til uke<input className="rounded-xl border border-slate-300 px-3 py-2" onChange={(event) => setToWeek(event.target.value)} type="week" value={toWeek} /></label>
          <p className="text-sm text-slate-500">Standard: siste 12 uker</p>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-between gap-3"><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium" onClick={() => setOpen(false)} type="button">Avbryt</button><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={exporting} onClick={() => void exportCsv()} type="button">{exporting ? 'Eksporterer…' : 'Eksporter CSV'}</button></div>
      </div>
    </div> : null}
  </>;
}
