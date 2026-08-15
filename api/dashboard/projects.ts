import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from '../_db.js';

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface MonthlyRow {
  month: string;
  project_id: string;
  user_id: string;
  total_hours: number;
  total_percent: number;
  days_absent: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const rawMonths = req.query.months ? Number(req.query.months) : undefined;
    if (rawMonths !== undefined && (!Number.isInteger(rawMonths) || rawMonths < 1)) {
      return res.status(400).json({ error: 'months must be a positive integer' });
    }

    const projects = await sql<ProjectRow[]>`
      SELECT id, name, color, active
      FROM projects
      ORDER BY name ASC
    `;
    const monthly = rawMonths
      ? await sql<MonthlyRow[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', entry.week_start), 'YYYY-MM') AS month,
            hour_item.key AS project_id,
            entry.user_id,
            SUM((hour_item.value)::numeric)::float8 AS total_hours,
            SUM(COALESCE((entry.allocations ->> hour_item.key)::numeric, 0))::float8 AS total_percent,
            SUM(entry.days_absent)::float8 AS days_absent
          FROM week_entries entry
          CROSS JOIN LATERAL jsonb_each_text(entry.hours) hour_item
          WHERE entry.type = 'actual'
            AND entry.input_mode = 'hours'
            AND entry.hours IS NOT NULL
            AND entry.week_start >= DATE_TRUNC('month', CURRENT_DATE) - (${rawMonths - 1} * INTERVAL '1 month')
          GROUP BY 1, 2, 3
          ORDER BY 1, 2, 3
        `
      : await sql<MonthlyRow[]>`
          SELECT
            TO_CHAR(DATE_TRUNC('month', entry.week_start), 'YYYY-MM') AS month,
            hour_item.key AS project_id,
            entry.user_id,
            SUM((hour_item.value)::numeric)::float8 AS total_hours,
            SUM(COALESCE((entry.allocations ->> hour_item.key)::numeric, 0))::float8 AS total_percent,
            SUM(entry.days_absent)::float8 AS days_absent
          FROM week_entries entry
          CROSS JOIN LATERAL jsonb_each_text(entry.hours) hour_item
          WHERE entry.type = 'actual' AND entry.input_mode = 'hours' AND entry.hours IS NOT NULL
          GROUP BY 1, 2, 3
          ORDER BY 1, 2, 3
        `;

    return res.status(200).json({
      projects,
      monthly: monthly.map((row) => ({
        month: row.month,
        projectId: row.project_id,
        userId: row.user_id,
        totalHours: Number(row.total_hours),
        totalPercent: Number(row.total_percent),
        daysAbsent: Number(row.days_absent ?? 0),
      })),
    });
  } catch (err) {
    console.error('Dashboard projects error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
