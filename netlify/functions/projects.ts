import type { Handler } from '@netlify/functions';
import sql from './_db.js';

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
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
      const [countRow] = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count
        FROM projects
      `;

      if (Number(countRow?.count ?? '0') === 0) {
        await sql`
          INSERT INTO projects (name, color)
          VALUES
            ('LLP-kortdekk', '#6366F1'),
            ('TemAi', '#E86B5F'),
            ('PersonWerner', '#F4A442'),
            ('Strategiarbeid', '#6BCB8B'),
            ('Administrasjon', '#A78BFA')
          ON CONFLICT DO NOTHING
        `;
      }

      const includeArchived = String(event.queryStringParameters?.includeArchived ?? 'false') === 'true';
      const rows = includeArchived
        ? await sql<ProjectRow[]>`
            SELECT id, name, color, active
            FROM projects
            ORDER BY active DESC, name ASC
          `
        : await sql<ProjectRow[]>`
            SELECT id, name, color, active
            FROM projects
            WHERE active = true
            ORDER BY name ASC
          `;

      return {
        statusCode: 200,
        body: JSON.stringify(rows),
      };
    }

    if (event.httpMethod === 'POST') {
      if (event.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized();
      }

      const { name, color } = JSON.parse(event.body ?? '{}') as { name?: string; color?: string };

      if (!name?.trim()) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'name is required' }),
        };
      }

      const [created] = await sql<ProjectRow[]>`
        INSERT INTO projects (name, color)
        VALUES (${name.trim()}, ${color?.trim() || '#6366F1'})
        RETURNING id, name, color, active
      `;

      return {
        statusCode: 201,
        body: JSON.stringify(created),
      };
    }

    if (event.httpMethod === 'PATCH') {
      if (event.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized();
      }

      const projectId = String(event.queryStringParameters?.id ?? event.path.split('/').pop() ?? '');
      if (!projectId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'id is required' }),
        };
      }

      const { name, color, active } = JSON.parse(event.body ?? '{}') as {
        name?: string;
        color?: string;
        active?: boolean;
      };

      const updates: string[] = [];
      const values: Array<string | boolean> = [];

      if (typeof name === 'string') {
        if (!name.trim()) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'name cannot be empty' }),
          };
        }
        updates.push(`name = $${updates.length + 1}`);
        values.push(name.trim());
      }

      if (typeof color === 'string') {
        updates.push(`color = $${updates.length + 1}`);
        values.push(color.trim() || '#6366F1');
      }

      if (typeof active === 'boolean') {
        updates.push(`active = $${updates.length + 1}`);
        values.push(active);
      }

      if (updates.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      const [updated] = await sql.unsafe<ProjectRow[]>(
        `
          UPDATE projects
          SET ${updates.join(', ')}
          WHERE id = $${updates.length + 1}
          RETURNING id, name, color, active
        `,
        [...values, projectId],
      );

      if (!updated) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Project not found' }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(updated),
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
