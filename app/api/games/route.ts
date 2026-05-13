import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const games = db.prepare('SELECT * FROM games ORDER BY created_at DESC').all();
  return NextResponse.json(games);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const db = getDb();
  db.prepare('DELETE FROM games WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
