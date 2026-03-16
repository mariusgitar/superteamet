import type { VercelRequest, VercelResponse } from '@vercel/node';
import sql from '../_db.js';

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
    if (req.method !== 'PATCH') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
      return unauthorized(res);
    }

    const projectId = String(req.query.id ?? '');
    if (!projectId) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { name, color, active } = req.body as {
      name?: string;
      color?: string;
      active?: boolean;
    };

    const updates: string[] = [];
    const values: Array<string | boolean> = [];

    if (typeof name === 'string') {
      if (!name.trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
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
      return res.status(400).json({ error: 'No valid fields to update' });
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
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
