import type { Handler } from '@netlify/functions';
import sql from './_db.js';

interface UserRow {
  id: string;
  name: string;
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
      const rows = await sql<UserRow[]>`SELECT id, name FROM users ORDER BY name ASC`;

      if (rows.length === 0) {
        await sql`
          INSERT INTO users (name)
          VALUES ('Marius'), ('Vibeke'), ('Kristian')
          ON CONFLICT (name) DO NOTHING
        `;

        const seededRows = await sql<UserRow[]>`SELECT id, name FROM users ORDER BY name ASC`;
        return {
          statusCode: 200,
          body: JSON.stringify(seededRows),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(rows),
      };
    }

    if (event.httpMethod === 'POST') {
      if (event.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized();
      }

      const { name } = JSON.parse(event.body ?? '{}') as { name?: string };
      const trimmedName = name?.trim();

      if (!trimmedName) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'name is required' }),
        };
      }

      const [created] = await sql<UserRow[]>`
        INSERT INTO users (name)
        VALUES (${trimmedName})
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name
      `;

      return {
        statusCode: 200,
        body: JSON.stringify(created),
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
