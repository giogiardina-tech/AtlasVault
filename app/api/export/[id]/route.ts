import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(params.id) as any;
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const slides = db
    .prepare("SELECT * FROM slides WHERE game_id = ? AND image_status = 'ready' ORDER BY slide_index")
    .all(params.id) as any[];

  if (slides.length === 0) {
    return NextResponse.json({ error: 'No images generated yet' }, { status: 400 });
  }

  const zip = new JSZip();
  const safeTitle = game.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const folder = zip.folder(safeTitle)!;

  let script = `ATLASVAULT GAME SCRIPT\n${'='.repeat(40)}\n`;
  script += `Title: ${game.title}\nHook: ${game.hook}\nCategory: ${game.category}\n\n`;

  for (const slide of slides) {
    const content = JSON.parse(slide.content);
    const num = String(slide.slide_index + 1).padStart(2, '0');
    const filename = `${num}_${slide.slide_type}.png`;

    if (slide.image_path) {
      const filePath = path.join(process.cwd(), 'public', slide.image_path.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        folder.file(filename, fs.readFileSync(filePath));
      }
    }

    if (slide.slide_type === 'round') {
      script += `\nROUND ${content.round_number}: ${content.question}\n`;
      if (content.clues) script += `  Clues: ${content.clues.join(' | ')}\n`;
      if (content.events) script += `  Events: ${content.events.join(' | ')}\n`;
    } else if (slide.slide_type === 'reveal') {
      if (content.answers) {
        const answerLines = content.answers
          .map((a: any) => `  ${a.text} — ${a.is_pointless ? 'POINTLESS!' : `${a.points} pts`}`)
          .join('\n');
        script += `ANSWERS:\n${answerLines}\n`;
      }
      if (content.correct_answer) script += `  Answer: ${content.correct_answer}\n`;
      if (content.fun_fact) script += `  Fun fact: ${content.fun_fact}\n`;
    }
  }

  folder.file('game_script.txt', script);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeTitle}.zip"`,
    },
  });
}
