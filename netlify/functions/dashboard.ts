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

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

interface WeekRow {
  week_start: string;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const requestedWeekStart = event.queryStringParameters?.weekStart
      ? String(event.queryStringParameters.weekStart)
      : undefined;

    let weekValues: string[] = [];

    if (requestedWeekStart) {
      weekValues = [requestedWeekStart];
    } else {
      const weeks = Number(event.queryStringParameters?.weeks ?? '12');
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
      return {
        statusCode: 200,
        body: JSON.stringify({
          weeks: [],
          projects,
          entries: [],
          pairedEntries: [],
        }),
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
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
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
