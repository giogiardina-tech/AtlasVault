import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { slide_id, game_id, image_prompt, slide_index } = await req.json();
  const openai = getOpenAI();
  const db = getDb();

  db.prepare("UPDATE slides SET image_status = 'generating' WHERE id = ?").run(slide_id);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: image_prompt,
      size: '1024x1792',
      quality: 'standard',
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL returned from DALL-E');
    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();

    const gameDir = path.join(process.cwd(), 'public', 'games', game_id);
    fs.mkdirSync(gameDir, { recursive: true });

    const filename = `slide_${String(slide_index).padStart(2, '0')}.png`;
    const filePath = path.join(gameDir, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));

    const imagePath = `/games/${game_id}/${filename}`;

    db.prepare(
      "UPDATE slides SET image_path = ?, image_status = 'ready' WHERE id = ?"
    ).run(imagePath, slide_id);

    db.prepare("UPDATE games SET status = 'ready' WHERE id = ?").run(game_id);

    return NextResponse.json({ success: true, image_path: imagePath });
  } catch (err: any) {
    db.prepare("UPDATE slides SET image_status = 'failed' WHERE id = ?").run(slide_id);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
