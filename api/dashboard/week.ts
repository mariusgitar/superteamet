import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from '../_db.js';

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

interface UserRow {
  id: string;
  name: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const weekStart = String(req.query.weekStart ?? '');

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }

    const [users, projects, entries] = await Promise.all([
      sql<UserRow[]>`
        SELECT id, name
        FROM users
        ORDER BY name ASC
      `,
      sql<ProjectRow[]>`
        SELECT id, name, color, active
        FROM projects
        WHERE active = true
        ORDER BY name ASC
      `,
      sql<EntryRow[]>`
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
        WHERE week_start = ${weekStart}
        ORDER BY submitted_at ASC
      `,
    ]);

    return res.status(200).json({
      users,
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
