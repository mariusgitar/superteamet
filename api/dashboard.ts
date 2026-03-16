import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db.js';

interface EntryRow {
  id: string;
  user_id: string;
  week_start: string;
  type: 'plan' | 'actual';
  allocations: Record<string, number>;
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

interface DashboardQuery {
  weeks?: string;
  weekStart?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const query = req.query as DashboardQuery;
    const requestedWeekStart = query.weekStart ? String(query.weekStart) : undefined;

    let weekValues: string[] = [];

    if (requestedWeekStart) {
      weekValues = [requestedWeekStart];
    } else {
      const weeks = Number(query.weeks ?? '12');
      const weekCount = Number.isInteger(weeks) && weeks > 0 ? weeks : 12;

      const rangeRows = await sql<WeekRow[]>`
        SELECT DISTINCT week_start
        FROM week_entries
        WHERE type = 'actual'
        ORDER BY week_start DESC
        LIMIT ${weekCount}
      `;

      weekValues = rangeRows.map((row) => row.week_start).sort((a, b) => a.localeCompare(b));
    }

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
        pairedEntries: [],
      });
    }

    const entries = await sql<EntryRow[]>`
      SELECT id, user_id, week_start, type, allocations, submitted_at
      FROM week_entries
      WHERE type = 'actual' AND week_start IN ${sql(weekValues)}
      ORDER BY week_start ASC, submitted_at ASC
    `;

    const pairedEntries = await sql<EntryRow[]>`
      SELECT id, user_id, week_start, type, allocations, submitted_at
      FROM week_entries
      WHERE week_start IN ${sql(weekValues)}
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
        submittedAt: row.submitted_at,
      })),
      pairedEntries: pairedEntries.map((row) => ({
        id: row.id,
        userId: row.user_id,
        weekStart: row.week_start,
        type: row.type,
        allocations: row.allocations,
        submittedAt: row.submitted_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
