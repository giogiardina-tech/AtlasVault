import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM templates ORDER BY category, name').all();
  return NextResponse.json(templates);
}
