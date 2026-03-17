import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db.js';

interface ExportRow {
  week_start: string;
  week_label: string;
  user_name: string;
  project_name: string;
  percent: number;
  hours: number;
}

function unauthorized(res: VercelResponse) {
  return res.status(401).json({ error: 'Unauthorized' });
}

function weekLabelFromDate(weekStart: string): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  return `Uke ${isoWeek(date)} · ${date.getUTCFullYear()}`;
}

function isoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
      return unauthorized(res);
    }

    const weeks = Number(req.query.weeks ?? '52');
    const weekCount = Number.isInteger(weeks) && weeks > 0 ? weeks : 52;

    const rows = await sql<{
      week_start: string;
      user_name: string;
      project_name: string;
      percent: string;
    }[]>`
      WITH selected_weeks AS (
        SELECT DISTINCT week_start
        FROM week_entries
        WHERE type = 'actual'
        ORDER BY week_start DESC
        LIMIT ${weekCount}
      )
      SELECT
        we.week_start,
        u.name AS user_name,
        p.name AS project_name,
        allocation.value AS percent
      FROM week_entries we
      JOIN selected_weeks sw ON sw.week_start = we.week_start
      JOIN users u ON u.id = we.user_id
      JOIN LATERAL jsonb_each_text(we.allocations) AS allocation(project_id, value) ON true
      JOIN projects p ON p.id::text = allocation.project_id
      WHERE we.type = 'actual'
      ORDER BY we.week_start DESC, u.name ASC, p.name ASC
    `;

    const exportRows: ExportRow[] = rows.map((row) => {
      const percent = Number(row.percent);
      const hours = Math.round(((percent / 100) * 37.5) * 10) / 10;

      return {
        week_start: row.week_start,
        week_label: weekLabelFromDate(row.week_start),
        user_name: row.user_name,
        project_name: row.project_name,
        percent,
        hours,
      };
    });

    return res.status(200).json(exportRows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
