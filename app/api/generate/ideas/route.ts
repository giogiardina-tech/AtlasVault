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
    'fame-battle': `"Five matchups — comment who you think was more famous before I reveal." / "Napoleon vs Cleopatra, Einstein vs Newton — five rounds, who left the bigger mark?"`,
  };

  const hookGuidance = formatHookExamples[format_type] || `"Five rounds, let's see how far you get." / "Easy start, impossible finish — how many can you get?"`;

  const prompt = `You are a viral TikTok trivia content creator who deeply understands retention psychology and what makes people stop scrolling.

Generate 4 unique game ideas for the format: "${template_name}" (category: ${category})

TITLE RULES — max 6 words, punchy, scroll-stopping:
- Create immediate curiosity or competitive tension
- Use numbers, superlatives, identity-based challenges, or impossibility claims
- Must work as a thumbnail label — readable in 0.5 seconds

GOOD titles: "Only 1% Get All 5" / "Impossible Flag Quiz" / "Nobody Gets Round 5" / "Only Europeans Pass This" / "The Hardest Border Quiz Yet" / "Can You Beat Round 5?" / "You'll Miss At Least One"
BAD titles: "A Geography Challenge for Trivia Fans" / "Test Your Knowledge of World History"

HOOK RULES — what the creator SAYS aloud in the first 2 seconds (max 8 words):
- Must reflect that this is a multi-round game (5 rounds)
- Should feel natural spoken, not like a caption
- Create urgency, disbelief, or a direct dare
- Match this format's energy: ${hookGuidance}

GOOD hooks: "Nobody gets Round 5. Nobody." / "You'll miss at least one, I promise." / "Five flags, five chances to embarrass yourself."
BAD hooks: "Let's test your geography knowledge today!" / "Welcome to our ultimate trivia challenge!"

SCORING — rate each idea honestly:
- hook_score (1–10): how likely is this hook to make someone pause mid-scroll? 10 = irresistible, 1 = forgettable
- curiosity_score (1–10): how badly does the viewer NEED to see the answer? 10 = can't swipe away, 1 = meh

Return ONLY this JSON (no markdown, no explanation):
{
  "ideas": [
    { "title": "...", "hook": "...", "hook_score": 8, "curiosity_score": 7 },
    { "title": "...", "hook": "...", "hook_score": 9, "curiosity_score": 8 },
    { "title": "...", "hook": "...", "hook_score": 7, "curiosity_score": 9 },
    { "title": "...", "hook": "...", "hook_score": 6, "curiosity_score": 7 }
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
