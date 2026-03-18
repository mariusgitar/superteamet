import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db.js';

interface ExportRow {
  id: string;
  user_name: string;
  week_start: string;
  type: 'plan' | 'actual';
  allocations: Record<string, number>;
  hours: Record<string, number> | null;
  input_mode: 'slider' | 'hours' | null;
  submitted_at: string;
}

const CSV_HEADERS = [
  'Bruker',
  'Uke',
  'Type',
  'Fordeling',
  'Timer registrert',
  'Inputmetode',
  'Innsendt',
] as const;

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function formatAllocations(allocations: Record<string, number>): string {
  return JSON.stringify(allocations);
}

function sumHours(hours: Record<string, number> | null): string {
  if (!hours) {
    return '';
  }

  const total = Object.values(hours).reduce((sum, value) => sum + value, 0);
  return Number.isInteger(total) ? String(total) : String(total);
}

function toInputMethod(inputMode: ExportRow['input_mode']): 'slider' | 'timer' {
  return inputMode === 'hours' ? 'timer' : 'slider';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const rows = await sql<ExportRow[]>`
      SELECT
        week_entries.id,
        users.name AS user_name,
        week_entries.week_start,
        week_entries.type,
        week_entries.allocations,
        week_entries.hours,
        week_entries.input_mode,
        week_entries.submitted_at
      FROM week_entries
      INNER JOIN users ON users.id = week_entries.user_id
      ORDER BY week_entries.week_start DESC, users.name ASC, week_entries.type ASC
    `;

    const csvRows = [
      CSV_HEADERS.join(','),
      ...rows.map((row) =>
        [
          row.user_name,
          row.week_start,
          row.type,
          formatAllocations(row.allocations),
          row.input_mode === 'hours' && row.hours ? sumHours(row.hours) : '',
          toInputMethod(row.input_mode),
          row.submitted_at,
        ]
          .map((value) => escapeCsv(String(value)))
          .join(','),
      ),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ukespeil-export.csv"');

    return res.status(200).send(csvRows.join('\n'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
