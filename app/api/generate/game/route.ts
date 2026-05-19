import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, buildGamePrompt } from '@/lib/openai';
import { getDb } from '@/lib/db';
import { GeneratedGame } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { scrambleAnswer, validateScramble } from '@/lib/scramble';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
  const { category, format_type, template_id, title, hook, difficulty = 'medium' } = await req.json();
  const openai = getOpenAI();
  const db = getDb();

  // Collect subjects used in previous games of the same format so the AI avoids repeating them
  const pastGames = db
    .prepare('SELECT id FROM games WHERE format_type = ? ORDER BY created_at DESC LIMIT 30')
    .all(format_type) as { id: string }[];

  const usedSubjects: string[] = [];

  for (const g of pastGames) {
    const slides = db
      .prepare('SELECT slide_type, content FROM slides WHERE game_id = ?')
      .all(g.id) as { slide_type: string; content: string }[];

    for (const s of slides) {
      const c = JSON.parse(s.content);
      if (s.slide_type === 'reveal') {
        // Most formats: correct_answer is the subject
        if (c.correct_answer) usedSubjects.push(c.correct_answer);
        // Historical order: collect individual event names
        if (c.correct_order) {
          c.correct_order.forEach((item: { event: string }) => usedSubjects.push(item.event));
        }
      }
      if (s.slide_type === 'round') {
        // Bordering-country: featured country is in the question text
        if (format_type === 'bordering-country' && c.question) {
          const m = c.question.match(/borders?\s+(.+?)(?:\?|$)/i);
          if (m) usedSubjects.push(m[1].trim());
        }
      }
    }
  }

  const prompt = buildGamePrompt(category, format_type, title, hook, Array.from(new Set(usedSubjects)), difficulty);
  console.log(`[generate/game] format=${format_type} prompt_chars=${prompt.length}`);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    max_tokens: 6000,
  });

  const generated: GeneratedGame = JSON.parse(response.choices[0].message.content!);

  // For scramble formats: generate scramble deterministically from correct_answer.
  // Build a per-round scramble map from reveal slides, then apply to both round + reveal.
  const isScrambleFormat = format_type === 'scrambled-capitals' || format_type === 'scrambled-countries';
  if (isScrambleFormat) {
    const scrambleMap = new Map<number, string>();
    for (const slide of generated.slides) {
      if (slide.slide_type === 'reveal' && slide.content.correct_answer) {
        let s = scrambleAnswer(slide.content.correct_answer);
        // Re-scramble if validation fails (should never happen, but defensive)
        if (!validateScramble(slide.content.correct_answer, s)) {
          s = scrambleAnswer(slide.content.correct_answer);
        }
        if (slide.content.round_number != null) scrambleMap.set(slide.content.round_number, s);
      }
    }
    for (const slide of generated.slides) {
      const s = slide.content.round_number != null ? scrambleMap.get(slide.content.round_number) : undefined;
      if (s) slide.content.scrambled = s;
    }
  }

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
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[generate/game] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
