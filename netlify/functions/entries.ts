import type { Handler } from '@netlify/functions';
import sql from './_db.js';

interface EntryRow {
  id: string;
  user_id: string;
  week_start: string;
  type: 'plan' | 'actual';
  allocations: Record<string, number>;
  submitted_at: string;
}

function unauthorized() {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: 'Unauthorized' }),
  };
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const userId = String(event.queryStringParameters?.userId ?? '');
      const weekStart = event.queryStringParameters?.weekStart ? String(event.queryStringParameters.weekStart) : undefined;
      const type = event.queryStringParameters?.type ? String(event.queryStringParameters.type) : undefined;
      const limit = event.queryStringParameters?.limit ? Number(event.queryStringParameters.limit) : undefined;

      if (!userId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'userId is required' }),
        };
      }

      if (weekStart) {
        const rows = await sql<EntryRow[]>`
          SELECT id, user_id, week_start, type, allocations, submitted_at
          FROM week_entries
          WHERE user_id = ${userId} AND week_start = ${weekStart}
        `;

        const plan = rows.find((row) => row.type === 'plan') ?? null;
        const actual = rows.find((row) => row.type === 'actual') ?? null;

        return {
          statusCode: 200,
          body: JSON.stringify({
            plan: toWeekEntry(plan),
            actual: toWeekEntry(actual),
          }),
        };
      }

      if (limit && Number.isInteger(limit) && limit > 0) {
        if (type === 'actual') {
          const rows = await sql<EntryRow[]>`
            SELECT id, user_id, week_start, type, allocations, submitted_at
            FROM week_entries
            WHERE user_id = ${userId} AND type = 'actual'
            ORDER BY week_start DESC, submitted_at DESC
            LIMIT ${limit}
          `;

          return {
            statusCode: 200,
            body: JSON.stringify(rows.map(toWeekEntry).filter((entry) => entry !== null)),
          };
        }

        const rows = await sql<EntryRow[]>`
          SELECT id, user_id, week_start, type, allocations, submitted_at
          FROM week_entries
          WHERE user_id = ${userId}
          ORDER BY week_start DESC, submitted_at DESC
          LIMIT ${limit}
        `;

        return {
          statusCode: 200,
          body: JSON.stringify(rows.map(toWeekEntry).filter((entry) => entry !== null)),
        };
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'weekStart or limit query is required' }),
      };
    }

    if (event.httpMethod === 'POST') {
      if (event.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized();
      }

      const { userId, weekStart, type, allocations } = JSON.parse(event.body ?? '{}') as {
        userId?: string;
        weekStart?: string;
        type?: 'plan' | 'actual';
        allocations?: Record<string, number>;
      };

      if (!userId || !weekStart || !type || !allocations) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'userId, weekStart, type and allocations are required' }),
        };
      }

      const [upserted] = await sql<EntryRow[]>`
        INSERT INTO week_entries (user_id, week_start, type, allocations)
        VALUES (${userId}, ${weekStart}, ${type}, ${sql.json(allocations)})
        ON CONFLICT (user_id, week_start, type)
        DO UPDATE SET allocations = EXCLUDED.allocations, submitted_at = NOW()
        RETURNING id, user_id, week_start, type, allocations, submitted_at
      `;

      return {
        statusCode: 200,
        body: JSON.stringify(toWeekEntry(upserted)),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};

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
