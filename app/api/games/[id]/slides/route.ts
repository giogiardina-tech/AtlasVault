import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Slide } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM slides WHERE game_id = ? ORDER BY slide_index')
    .all(params.id) as any[];

  const slides: Slide[] = rows.map((r) => ({
    ...r,
    content: JSON.parse(r.content),
  }));

  return NextResponse.json(slides);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { slide_id, content, image_prompt } = await req.json();
  const db = getDb();

  if (content !== undefined) {
    db.prepare('UPDATE slides SET content = ? WHERE id = ? AND game_id = ?').run(
      JSON.stringify(content),
      slide_id,
      params.id
    );
  }
  if (image_prompt !== undefined) {
    db.prepare('UPDATE slides SET image_prompt = ? WHERE id = ? AND game_id = ?').run(
      image_prompt,
      slide_id,
      params.id
    );
  }

  return NextResponse.json({ success: true });
}
