import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { round_number } = await req.json();
  const db = getDb();

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(params.id) as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const slides = db.prepare('SELECT * FROM slides WHERE game_id = ? ORDER BY slide_index').all(params.id) as any[];
  const roundSlide = slides.find((s: any) => s.slide_type === 'round' && JSON.parse(s.content).round_number === round_number);
  const revealSlide = slides.find((s: any) => s.slide_type === 'reveal' && JSON.parse(s.content).round_number === round_number);

  if (!roundSlide || !revealSlide) {
    return NextResponse.json({ error: 'Round not found' }, { status: 404 });
  }

  // Gather already-used subjects to avoid repeats
  const usedSubjects = slides
    .filter((s: any) => s.slide_type === 'round')
    .map((s: any) => {
      const c = JSON.parse(s.content);
      return c.correct_answer || c.side_a || c.question || '';
    })
    .filter(Boolean)
    .join(', ');

  const openai = getOpenAI();

  const prompt = `You are an expert TikTok trivia game designer. Regenerate ONE round for an existing game.

Game: "${game.title}" (${game.format_type}, ${game.category})
Round number: ${round_number}
Already used subjects/answers in other rounds: ${usedSubjects}

Generate a completely NEW question and answer for round ${round_number} of this game.
The new content must be different from all used subjects above.
Match the exact same format, scoring_type, and structure as the original game.

Return ONLY valid JSON with exactly this structure:
{
  "round": {
    "content": { "round_number": ${round_number}, "question": "...", "difficulty": "...", ... },
    "image_prompt": "..."
  },
  "reveal": {
    "content": { "round_number": ${round_number}, "scoring_type": "...", ... },
    "image_prompt": "..."
  }
}

CRITICAL — FACTUAL ACCURACY: Every date, name, and fact must be 100% correct.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content!);

  // Update round slide content
  db.prepare('UPDATE slides SET content = ?, image_prompt = ?, image_path = NULL, image_status = ? WHERE id = ?').run(
    JSON.stringify(parsed.round.content),
    parsed.round.image_prompt,
    'pending',
    roundSlide.id
  );

  // Update reveal slide content
  db.prepare('UPDATE slides SET content = ?, image_prompt = ?, image_path = NULL, image_status = ? WHERE id = ?').run(
    JSON.stringify(parsed.reveal.content),
    parsed.reveal.image_prompt,
    'pending',
    revealSlide.id
  );

  return NextResponse.json({
    round: { ...roundSlide, content: parsed.round.content, image_prompt: parsed.round.image_prompt, image_path: null, image_status: 'pending' },
    reveal: { ...revealSlide, content: parsed.reveal.content, image_prompt: parsed.reveal.image_prompt, image_path: null, image_status: 'pending' },
  });
}
