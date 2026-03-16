import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db';

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

function unauthorized(res: VercelResponse) {
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await sql<ProjectRow[]>`
        SELECT id, name, color, active
        FROM projects
        WHERE active = true
        ORDER BY name ASC
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized(res);
      }

      const { name, color } = req.body as { name?: string; color?: string };

      if (!name?.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }

      const [created] = await sql<ProjectRow[]>`
        INSERT INTO projects (name, color)
        VALUES (${name.trim()}, ${color?.trim() || '#6366F1'})
        RETURNING id, name, color, active
      `;

      return res.status(201).json(created);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: `Failed to handle projects: ${message}` });
  }
}
