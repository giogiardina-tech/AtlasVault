import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(params.id);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(game);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();
  const allowed = ['title', 'hook', 'status'];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => body[f]);
  db.prepare(`UPDATE games SET ${setClause} WHERE id = ?`).run(...values, params.id);
  return NextResponse.json({ success: true });
}
