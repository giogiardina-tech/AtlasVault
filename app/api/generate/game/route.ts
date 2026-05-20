import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, buildGamePrompt } from '@/lib/openai';
import { getDb } from '@/lib/db';
import { GeneratedGame } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { scrambleAnswer, validateScramble } from '@/lib/scramble';

export const maxDuration = 60;

// ─── Empire prompt builders ───────────────────────────────────────────────────
// Called server-side after LLM generation. Never rely on the LLM to produce
// image prompts for Empire mode — it consistently omits or mis-formats them.

function empireIconicPrompt(empire: string): string {
  const e = empire.toLowerCase();
  if (e.includes('roman') || e.includes('rome'))
    return 'Ancient Roman Colosseum stone arches at dusk from low angle, warm amber light, archival documentary photograph, no text, no maps';
  if (e.includes('mongol'))
    return 'Ornate Mongolian composite bow with leather quiver and bronze-tipped arrows on dark velvet, museum display lighting, muted gold and brown tones, no text, no maps';
  if (e.includes('ottoman'))
    return 'Intricate Iznik ceramic tile panel in cobalt blue and white, museum archive photograph, dark background, no text, no maps';
  if (e.includes('persian') || e.includes('achaemenid'))
    return 'Carved stone relief of soldiers in procession at Persepolis, close-up, museum archive photograph, charcoal and sand tones, no text, no maps';
  if (e.includes('egypt') || e.includes('egyptian'))
    return 'Ancient Egyptian alabaster canopic jar on black background, dramatic overhead museum lighting, ochre and cream tones, no text, no maps';
  if (e.includes('aztec'))
    return 'Close-up of an Aztec obsidian ceremonial blade with carved serpent, dark stone surface, sharp museum lighting, no text, no maps';
  if (e.includes('inca'))
    return 'Inca gold sun mask with geometric relief decoration on dark velvet, warm side-lighting, rich gold tones, no text, no maps';
  if (e.includes('viking') || e.includes('norse'))
    return 'Ornate Viking silver brooch with interlaced knotwork on dark linen, museum close-up, cool northern light, no text, no maps';
  if (e.includes('byzantine'))
    return 'Gold Byzantine mosaic fragment showing a haloed figure, museum lighting, rich gold tesserae on dark background, no text, no maps';
  if (e.includes('mughal'))
    return 'Intricate Mughal jade dagger hilt inlaid with rubies and gold on dark background, museum display lighting, no text, no maps';
  if (e.includes('qin') || e.includes('han') || e.includes('ming') || e.includes('tang') || e.includes('chinese') || e.includes('china'))
    return 'Terracotta warrior head fragment, close-up, dramatic museum shadow, ochre and grey clay tones, no text, no maps';
  if (e.includes('greek') || e.includes('macedon') || e.includes('hellenist') || e.includes('alexandr'))
    return 'Marble Greek Corinthian helmet with cheek guards on dark stone, museum side-lighting, cool grey and white tones, no text, no maps';
  if (e.includes('babylon') || e.includes('babylonian'))
    return 'Glazed blue brick detail from the Ishtar Gate, cobalt and turquoise against dark background, museum archive style, no text, no maps';
  if (e.includes('sumerian') || e.includes('sumer'))
    return 'Ancient cuneiform clay tablet fragment on dark museum surface, warm side-lighting, ochre clay tones, no text, no maps';
  if (e.includes('mayan') || e.includes('maya'))
    return 'Carved Mayan stone glyph panel, museum archive photograph, dark stone tones, no text, no maps';
  if (e.includes('british') && !e.includes('byzantin'))
    return 'Victorian-era brass compass and sextant on aged leather, museum archive photograph, warm gold and brown tones, no text, no maps';
  if (e.includes('spanish') || e.includes('spain'))
    return 'Spanish conquistador steel helmet on dark velvet, museum display lighting, silver and shadow, no text, no maps';
  if (e.includes('portuguese') || e.includes('portugal'))
    return 'Portuguese Age of Discovery bronze astrolabe on dark background, museum close-up, warm gold tones, no text, no maps';
  if (e.includes('french') || e.includes('napoleon'))
    return 'Napoleonic-era bicorne hat on dark velvet, museum display, black and gold tones, no text, no maps';
  if (e.includes('austro') || e.includes('habsburg'))
    return 'Ornate Austro-Hungarian imperial double-headed eagle crest in gilded metal, dark background, museum lighting, no text, no maps';
  if (e.includes('soviet') || e.includes('ussr'))
    return 'Vintage Soviet cosmonaut helmet visor on dark background, chrome reflection, archival photograph quality, no text, no maps';
  if (e.includes('mali') || e.includes('songhai') || e.includes('ghana'))
    return 'Ancient gold Ashanti weight in the form of a bird on dark velvet, warm museum lighting, burnished gold, no text, no maps';
  if (e.includes('nabatean') || e.includes('nabataean'))
    return 'Petra rose-red carved sandstone facade detail, close-up, museum archive photograph, warm rose and sand tones, no text, no maps';
  if (e.includes('east german') || e.includes('gdr'))
    return 'Rusted East German Trabant car badge detail, peeling paint, archival close-up, muted grey and rust tones, no text, no maps';
  if (e.includes('yugoslav'))
    return 'Yugoslav partisan rifle and red star medal on dark linen, archival museum photograph, muted steel and red tones, no text, no maps';
  return `Ancient artifact or monument associated with the ${empire}, museum archive close-up photograph, dark background, dramatic side lighting, muted historical tones, no text, no maps, no borders`;
}

function empireTerritoryPrompt(empire: string): string {
  const e = empire.toLowerCase();
  if (e.includes('roman') || e.includes('rome'))
    return 'Dark historical atlas, territory covering Mediterranean basin, Western Europe, North Africa, and Middle East in translucent gold wash, deep navy background, fine cartographic lines, no text';
  if (e.includes('mongol'))
    return 'Dark historical atlas, vast territory from Eastern Europe across Central Asia, Persia, and China to Korea in translucent gold wash, deep navy background, no text';
  if (e.includes('ottoman'))
    return 'Dark historical atlas, territory covering Anatolia, Middle East, North Africa, and southeastern Europe in translucent gold wash, navy background, no text';
  if (e.includes('persian') || e.includes('achaemenid'))
    return 'Dark historical atlas, territory spanning Persia, Mesopotamia, Anatolia, Egypt, and Indus valley in translucent gold wash, deep navy background, no text';
  if (e.includes('egypt') || e.includes('egyptian'))
    return 'Dark historical atlas, territory along the Nile River and North Africa in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('aztec'))
    return 'Dark historical atlas, territory in central Mexico and Mesoamerica in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('inca'))
    return 'Dark historical atlas, territory running along western South America and the Andes in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('viking') || e.includes('norse'))
    return 'Dark historical atlas, territory covering Scandinavia with routes to Britain, Iceland, Greenland, and eastern Europe in translucent gold wash, navy background, no text';
  if (e.includes('british') && !e.includes('byzantin'))
    return 'Dark historical atlas, vast empire territory across India, Australia, Canada, and Africa in translucent gold wash, deep navy background, no text';
  if (e.includes('mughal'))
    return 'Dark historical atlas, territory covering the Indian subcontinent in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('qin') || e.includes('han') || e.includes('ming') || e.includes('tang') || e.includes('chinese') || e.includes('china'))
    return 'Dark historical atlas, territory covering ancient China and surrounding regions in translucent gold wash, navy background, no text';
  if (e.includes('greek') || e.includes('macedon') || e.includes('hellenist') || e.includes('alexandr'))
    return 'Dark historical atlas, territory covering Greece, Persia, Egypt, and extending to India in translucent gold wash, deep navy background, no text';
  if (e.includes('babylon') || e.includes('babylonian') || e.includes('sumerian'))
    return 'Dark historical atlas, territory in Mesopotamia between Tigris and Euphrates rivers in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('mayan') || e.includes('maya'))
    return 'Dark historical atlas, territory covering Yucatan Peninsula and Central America in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('mali') || e.includes('songhai') || e.includes('ghana'))
    return 'Dark historical atlas, territory in West Africa along the Niger River in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('spanish') || e.includes('spain'))
    return 'Dark historical atlas, empire territory across the Americas, Caribbean, and parts of Europe in translucent gold wash, deep navy background, no text';
  if (e.includes('portuguese') || e.includes('portugal'))
    return 'Dark historical atlas, coastal territories along Africa, Brazil, and South Asia in translucent gold wash, deep navy background, no text';
  if (e.includes('soviet') || e.includes('ussr'))
    return 'Dark historical atlas, territory covering Russia, Central Asia, Eastern Europe and Siberia in translucent gold wash, deep navy background, no text';
  if (e.includes('austro') || e.includes('habsburg'))
    return 'Dark historical atlas, territory covering Central Europe, Austria, Hungary, and Balkans in translucent gold wash, navy background, no text';
  if (e.includes('french') || e.includes('napoleon'))
    return 'Dark historical atlas, territory covering Western Europe and parts of North Africa in translucent gold wash, deep navy background, no text';
  if (e.includes('nabatean') || e.includes('nabataean'))
    return 'Dark historical atlas, territory in the Levant and northern Arabia in translucent gold wash, surrounding charcoal, navy background, no text';
  if (e.includes('yugoslav'))
    return 'Dark historical atlas, territory covering the Balkans and Adriatic coast in translucent gold wash, surrounding charcoal, navy background, no text';
  return `Dark historical atlas, territory of the ${empire} at its peak in translucent gold wash, surrounding regions deep charcoal, navy background, fine cartographic lines, no text, no labels`;
}

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

  // For Empire mode: build reliable feature_prompt and map_prompt from the empire name.
  // The LLM frequently omits image_prompt or returns it as an object — do not rely on it.
  // Instead, derive the empire name from the paired reveal slide and build prompts here.
  if (format_type === 'guess-the-empire') {
    const empireByRound = new Map<number, string>();
    for (const slide of generated.slides) {
      if (slide.slide_type === 'reveal' && slide.content.correct_answer && slide.content.round_number != null) {
        empireByRound.set(slide.content.round_number as number, slide.content.correct_answer as string);
      }
    }
    for (const slide of generated.slides) {
      if (slide.slide_type !== 'round') continue;
      const rn = slide.content.round_number as number;
      const empireName = empireByRound.get(rn) ?? 'this historical empire';
      const fp = empireIconicPrompt(empireName);
      const mp = empireTerritoryPrompt(empireName);
      slide.content.feature_prompt = fp;
      slide.content.map_prompt = mp;
      // Default image_prompt is the iconic feature; user can switch to territory map later.
      slide.image_prompt = fp;
      console.log(`[empire/generate] round=${rn} empire="${empireName}"\n  feature_prompt="${fp.substring(0, 80)}..."\n  map_prompt="${mp.substring(0, 80)}..."`);
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
      const ip = slide.image_prompt;
      const imagePrompt = typeof ip === 'string' && ip ? ip : null;
      insertSlide.run(
        uuidv4(),
        gameId,
        slide.slide_index,
        slide.slide_type,
        JSON.stringify(slide.content),
        imagePrompt
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
