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

function unauthorized(res: VercelResponse) {
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const userId = String(req.query.userId ?? '');
      const weekStart = req.query.weekStart ? String(req.query.weekStart) : undefined;
      const type = req.query.type ? String(req.query.type) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (weekStart) {
        const rows = await sql<EntryRow[]>`
          SELECT id, user_id, week_start, type, allocations, submitted_at
          FROM week_entries
          WHERE user_id = ${userId} AND week_start = ${weekStart}
        `;

        const plan = rows.find((row) => row.type === 'plan') ?? null;
        const actual = rows.find((row) => row.type === 'actual') ?? null;

        return res.status(200).json({
          plan: toWeekEntry(plan),
          actual: toWeekEntry(actual),
        });
      }

      if (type === 'actual' && limit) {
        const rows = await sql<EntryRow[]>`
          SELECT id, user_id, week_start, type, allocations, submitted_at
          FROM week_entries
          WHERE user_id = ${userId} AND type = 'actual'
          ORDER BY week_start DESC
          LIMIT ${limit}
        `;

        return res.status(200).json(rows.map(toWeekEntry).filter((entry) => entry !== null));
      }

      return res.status(400).json({ error: 'weekStart or type+limit query is required' });
    }

    if (req.method === 'POST') {
      if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized(res);
      }

      const { userId, weekStart, type, allocations } = req.body as {
        userId?: string;
        weekStart?: string;
        type?: 'plan' | 'actual';
        allocations?: Record<string, number>;
      };

      if (!userId || !weekStart || !type || !allocations) {
        return res.status(400).json({ error: 'userId, weekStart, type and allocations are required' });
      }

      const [upserted] = await sql<EntryRow[]>`
        INSERT INTO week_entries (user_id, week_start, type, allocations)
        VALUES (${userId}, ${weekStart}, ${type}, ${sql.json(allocations)})
        ON CONFLICT (user_id, week_start, type)
        DO UPDATE SET allocations = EXCLUDED.allocations, submitted_at = NOW()
        RETURNING id, user_id, week_start, type, allocations, submitted_at
      `;

      return res.status(200).json(toWeekEntry(upserted));
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}

function toWeekEntry(row: EntryRow | null) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    weekStart: row.week_start,
    type: row.type,
    allocations: row.allocations,
    submittedAt: row.submitted_at,
  };
}
