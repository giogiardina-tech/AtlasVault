import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const { category, format_type, template_name } = await req.json();
  const openai = getOpenAI();

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

The hook is what the presenter says in the first 2 seconds of the video.

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
