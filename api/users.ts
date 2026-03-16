import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from './_db';

interface UserRow {
  id: string;
  name: string;
}

function unauthorized(res: VercelResponse) {
  return res.status(401).json({ error: 'Unauthorized' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const rows = await sql<UserRow[]>`SELECT id, name FROM users ORDER BY name ASC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
        return unauthorized(res);
      }

      const { name } = req.body as { name?: string };
      const trimmedName = name?.trim();

      if (!trimmedName) {
        return res.status(400).json({ error: 'name is required' });
      }

      const [created] = await sql<UserRow[]>`
        INSERT INTO users (name)
        VALUES (${trimmedName})
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name
      `;

      return res.status(200).json(created);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
