import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { slide_id, game_id, image_prompt, slide_index, copy_to_slide_id } = await req.json();
  const openai = getOpenAI();
  const db = getDb();

  db.prepare("UPDATE slides SET image_status = 'generating' WHERE id = ?").run(slide_id);

  try {
    // Check if this is a flag game slide — use CDN instead of OpenAI
    const slideRow = db.prepare('SELECT content FROM slides WHERE id = ?').get(slide_id) as any;
    const slideContent = slideRow ? JSON.parse(slideRow.content) : {};
    const countryCode = slideContent.country_code as string | undefined;

    let buffer: Buffer;

    if (countryCode) {
      const flagUrl = `https://flagcdn.com/w1280/${countryCode.toLowerCase()}.png`;
      const flagRes = await fetch(flagUrl);
      if (!flagRes.ok) throw new Error(`Flag not found for country code: ${countryCode}`);
      buffer = Buffer.from(await flagRes.arrayBuffer());
    } else {
      const response = await openai.images.generate({
        model: 'gpt-image-1' as any,
        prompt: image_prompt,
        size: '1024x1024' as any,
        quality: 'low' as any,
        n: 1,
      });

      const b64 = (response.data?.[0] as any)?.b64_json;
      if (!b64) throw new Error('No image data returned from API');
      buffer = Buffer.from(b64, 'base64');
    }

    const gameDir = path.join(process.cwd(), 'public', 'games', game_id);
    fs.mkdirSync(gameDir, { recursive: true });

    const filename = `slide_${String(slide_index).padStart(2, '0')}.png`;
    const filePath = path.join(gameDir, filename);
    fs.writeFileSync(filePath, buffer);

    const imagePath = `/games/${game_id}/${filename}`;

    db.prepare(
      "UPDATE slides SET image_path = ?, image_status = 'ready' WHERE id = ?"
    ).run(imagePath, slide_id);

    // Copy the same image to the paired reveal slide (if provided)
    if (copy_to_slide_id) {
      db.prepare(
        "UPDATE slides SET image_path = ?, image_status = 'ready' WHERE id = ?"
      ).run(imagePath, copy_to_slide_id);
    }

    db.prepare("UPDATE games SET status = 'ready' WHERE id = ?").run(game_id);

    return NextResponse.json({ success: true, image_path: imagePath });
  } catch (err: any) {
    db.prepare("UPDATE slides SET image_status = 'failed' WHERE id = ?").run(slide_id);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
