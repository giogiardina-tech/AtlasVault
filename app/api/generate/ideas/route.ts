import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const { category, format_type, template_name } = await req.json();
  const openai = getOpenAI();

  const formatHookExamples: Record<string, string> = {
    'bordering-country': `"I'm going to name every country that borders France — can you beat me?" / "Let's see how many countries bordering Russia you actually know. Round 1 is easy, Round 5 will break you."`,
    'guess-the-flag': `"Five flags, easy to impossible — let's see how far you get." / "Round 1 anyone can get. Round 5? I've never seen anyone get it."`,
    'partial-flag': `"I'm showing you a tiny piece of each flag — how many can you identify before I reveal it?" / "Five flags, each one more cropped than the last. Round 5 is basically impossible."`,
    'easy-to-impossible': `"Five questions, starts easy, ends impossible — how far can you go?" / "Round 1 is for everyone. Round 5 has never been answered correctly in my comments."`,
    'country-from-map': `"Five countries highlighted on a map — can you name them all before I reveal?" / "Easy shapes to impossible blobs — how many can you get right?"`,
    'guess-the-empire': `"Five empires shown through clues and images — can you name them all?" / "I'll show you what each empire was known for — you guess which empire it was."`,
    'historical-order': `"Five rounds of historical events — put them in the right order before I reveal." / "Most people get at least one of these in the wrong order — let's see how you do."`,
    'guess-the-capital': `"Five capitals, easy to impossible — how many do you actually know?" / "Round 1 is Paris. Round 5 catches out even geography nerds — let's go."`,
    'country-by-clue': `"Three clues per round — can you guess the country before I give you the easy one?" / "I'll give you three clues for each country. Real ones get it on clue one."`,
    'guess-the-person': `"Three clues per person, hardest first — how quickly can you figure out who I'm describing?" / "Five historical figures, three clues each — real history fans get it on clue one."`,
    'civilization-fight': `"Five civilization matchups — pick your side before I reveal who actually wins." / "Rome vs Greece, Mongols vs Samurai — five battles, five results, how many do you get right?"`,
  };

  const hookGuidance = formatHookExamples[format_type] || `"Five rounds, let's see how far you get." / "Easy start, impossible finish — how many can you get?"`;

  const prompt = `You are a viral TikTok content creator specializing in ${category} trivia games.

Generate 4 unique, catchy TikTok-style game ideas for the format: "${template_name}"

Rules for great TikTok trivia titles:
- Short, punchy, makes people stop scrolling
- Creates curiosity or a challenge
- Uses numbers, superlatives, or provocative claims
- Feels like a dare or a personal challenge

Examples of great titles:
- "Name a Country That Borders Belgium"
- "Guess the Flag: Easy to Impossible"
- "Can You Name the Lost Empire?"
- "Only Geography Nerds Get 0 Points"
- "99% of People Fail Round 5"
- "Name Every Country Bordering Russia"
- "These Capitals Will Trick You"

HOOK RULES — this is the most important part:
- The hook is spoken out loud in the first 2 seconds of the video
- It MUST reflect that this is a multi-round game (5 rounds), not a single question
- It should set up the challenge or dare for the whole game, not just one round
- It should feel natural to say out loud, not read like a caption
- Match the energy of this format's style: ${hookGuidance}
- Never use singular phrasing like "Can you guess this flag?" — always imply multiple rounds

Return ONLY this JSON:
{
  "ideas": [
    { "title": "...", "hook": "..." },
    { "title": "...", "hook": "..." },
    { "title": "...", "hook": "..." },
    { "title": "...", "hook": "..." }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.95,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content!);
  return NextResponse.json({ ideas: parsed.ideas || [] });
}
