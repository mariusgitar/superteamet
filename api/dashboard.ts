import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db.js';

interface EntryRow {
  id: string;
  user_id: string;
  week_start: string;
  type: 'plan' | 'actual';
  allocations: Record<string, number>;
  hours: Record<string, number> | null;
  input_mode: 'slider' | 'hours';
  total_hours: number | null;
  submitted_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface WeekRow {
  week_start: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const weeks = Number(req.query.weeks ?? '12');
    const weekCount = Number.isInteger(weeks) && weeks > 0 ? weeks : 12;

    const rangeRows = await sql<WeekRow[]>`
      SELECT DISTINCT week_start
      FROM week_entries
      WHERE type = 'actual'
      ORDER BY week_start DESC
      LIMIT ${weekCount}
    `;

    const weekValues = rangeRows.map((row) => row.week_start).sort((a, b) => a.localeCompare(b));

    const projects = await sql<ProjectRow[]>`
      SELECT id, name, color, active
      FROM projects
      WHERE active = true
      ORDER BY name ASC
    `;

    if (weekValues.length === 0) {
      return res.status(200).json({
        weeks: [],
        projects,
        entries: [],
      });
    }

    const entries = await sql<EntryRow[]>`
      SELECT
        id,
        user_id,
        week_start,
        type,
        allocations,
        hours,
        input_mode,
        CASE
          WHEN input_mode = 'hours' AND hours IS NOT NULL THEN (
            SELECT COALESCE(SUM((value)::numeric), 0)::float8
            FROM jsonb_each_text(hours)
          )
          ELSE NULL
        END AS total_hours,
        submitted_at
      FROM week_entries
      WHERE type = 'actual' AND week_start IN ${sql(weekValues)}
      ORDER BY week_start ASC, submitted_at ASC
    `;

    return res.status(200).json({
      weeks: weekValues,
      projects,
      entries: entries.map((row) => ({
        id: row.id,
        userId: row.user_id,
        weekStart: row.week_start,
        type: row.type,
        allocations: row.allocations,
        hours: row.hours ?? undefined,
        inputMode: row.input_mode ?? 'slider',
        totalHours: row.total_hours,
        submittedAt: row.submitted_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
