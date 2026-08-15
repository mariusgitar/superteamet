import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db.js';

interface ExportRow {
  week_label: string;
  week_start: string;
  user_name: string;
  project_name: string;
  hours: number;
  percent: number;
  available_hours: number;
  unregistered_hours: number;
  days_absent: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isMonday(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCDay() === 1;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || !isMonday(from) || !isMonday(to) || from > to) {
      return res.status(400).json({ error: 'from and to must be ISO Monday dates in a valid range' });
    }

    const rows = await sql<ExportRow[]>`
      WITH entries AS (
        SELECT
          entry.*,
          COALESCE(entry.days_absent, 0)::float8 AS normalized_days_absent,
          (SELECT COALESCE(SUM(value::numeric), 0) FROM jsonb_each_text(entry.hours))::float8 AS total_hours
        FROM week_entries entry
        WHERE entry.type = 'actual'
          AND entry.input_mode = 'hours'
          AND entry.hours IS NOT NULL
          AND entry.week_start BETWEEN ${from} AND ${to}
      )
      SELECT
        'Uke ' || TO_CHAR(entries.week_start, 'IW IYYY') AS week_label,
        entries.week_start,
        users.name AS user_name,
        projects.name AS project_name,
        hour_item.value::numeric::float8 AS hours,
        ROUND((hour_item.value::numeric / NULLIF(entries.total_hours, 0) * 100), 1)::float8 AS percent,
        ((5 - entries.normalized_days_absent) * 7.5)::float8 AS available_hours,
        GREATEST(0, (5 - entries.normalized_days_absent) * 7.5 - entries.total_hours)::float8 AS unregistered_hours,
        entries.normalized_days_absent AS days_absent
      FROM entries
      CROSS JOIN LATERAL jsonb_each_text(entries.hours) hour_item
      INNER JOIN users ON users.id = entries.user_id
      INNER JOIN projects ON projects.id::text = hour_item.key
      WHERE hour_item.value::numeric > 0
      ORDER BY entries.week_start, users.name, projects.name
    `;

    return res.status(200).json({
      rows: rows.map((row) => ({
        weekLabel: row.week_label,
        weekStart: row.week_start,
        userName: row.user_name,
        projectName: row.project_name,
        hours: Number(row.hours),
        percent: Number(row.percent),
        availableHours: Number(row.available_hours),
        unregisteredHours: Number(row.unregistered_hours),
        daysAbsent: Number(row.days_absent),
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
