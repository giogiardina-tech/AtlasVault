import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, buildGamePrompt } from '@/lib/openai';
import { getDb } from '@/lib/db';
import { GeneratedGame } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { category, format_type, template_id, title, hook } = await req.json();
  const openai = getOpenAI();
  const db = getDb();

  const prompt = buildGamePrompt(category, format_type, title, hook);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const generated: GeneratedGame = JSON.parse(response.choices[0].message.content!);

  const gameId = uuidv4();

  db.prepare(`
    INSERT INTO games (id, template_id, title, hook, category, format_type, status)
    VALUES (?, ?, ?, ?, ?, ?, 'draft')
  `).run(gameId, template_id || null, generated.title, generated.hook, category, format_type);

  const insertSlide = db.prepare(`
    INSERT INTO slides (id, game_id, slide_index, slide_type, content, image_prompt, image_status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    for (const slide of generated.slides) {
      insertSlide.run(
        uuidv4(),
        gameId,
        slide.slide_index,
        slide.slide_type,
        JSON.stringify(slide.content),
        slide.image_prompt
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const savedSlides = db
    .prepare('SELECT * FROM slides WHERE game_id = ? ORDER BY slide_index')
    .all(gameId) as any[];

  const slides = savedSlides.map((s) => ({ ...s, content: JSON.parse(s.content) }));

  return NextResponse.json({
    game: db.prepare('SELECT * FROM games WHERE id = ?').get(gameId),
    slides,
    scoring_system: generated.scoring_system,
  });
}
