import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in .env.local');
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function buildGamePrompt(
  category: string,
  format_type: string,
  title: string,
  hook: string
): string {
  const formatInstructions: Record<string, string> = {
    'bordering-country': `
FORMAT: POINTLESS-STYLE BORDERING COUNTRY CHALLENGE
- Create 5 rounds, each with a DIFFERENT featured country
- Each question: "Name a country that borders [Country]"
- List ALL correct bordering countries as answers with realistic point values:
  * 80-100 pts: Countries people name immediately (very common)
  * 40-79 pts: Countries often named (common)
  * 15-39 pts: Countries less often named (uncommon)
  * 1-14 pts: Rarely named countries (rare)
  * "is_pointless": true, points: 0 — the rarest correct answer
- Choose countries with increasing difficulty (Round 1: country with many borders, Round 5: small country with few)
- ALL answers must be geographically accurate`,

    'guess-the-flag': `
FORMAT: GUESS THE FLAG — EASY TO IMPOSSIBLE
- 5 rounds with strict difficulty progression:
  * Round 1: Major world power (USA, UK, France, etc.)
  * Round 2: Well-known nation (Brazil, Japan, Canada, etc.)
  * Round 3: Moderately known nation
  * Round 4: Lesser-known nation (most people struggle)
  * Round 5: Very obscure territory, dependency, or visually similar/confusing flag
- Reveal slides show: correct country + a fun fact about the flag's design
- "answers" array: just one correct answer [{text: "Country Name", points: 0}]
- Image prompts: photorealistic flag on dark dramatic background`,

    'easy-to-impossible': `
FORMAT: EASY TO IMPOSSIBLE — ${category.toUpperCase()} EDITION
- 5 questions, strict difficulty escalation:
  * Round 1: Any child knows this
  * Round 2: Most adults know this
  * Round 3: Geography/history enthusiasts know this
  * Round 4: Only dedicated nerds know this
  * Round 5: Almost nobody knows this — extreme trivia
- Reveal: correct answer + a short surprising fun fact
- "answers" array: one correct answer [{text: "Answer", points: 0}]`,

    'country-from-map': `
FORMAT: GUESS THE COUNTRY FROM THE MAP
- 5 rounds, difficulty increases each round:
  * Round 1: Very distinctive shape (boot-shaped Italy, boot of Florida, etc.)
  * Round 5: Very obscure tiny territory
- Image prompts: dark detailed map with ONLY the featured country glowing/highlighted — surrounding countries in dark grey
- Reveal: show same map with country name overlaid + capital city
- "answers" array: one correct answer`,

    'guess-the-empire': `
FORMAT: GUESS THE EMPIRE
- 5 rounds featuring historical empires at their territorial peak:
  * Round 1: Famous empire (Roman, British, Ottoman, Mongol)
  * Round 5: Obscure ancient empire few people know
- Image prompts: dark historical map showing empire territory at peak extent, glowing borders
- Reveal: empire name + peak dates + one mind-blowing fact about its extent
- "answers" array: one correct answer [{text: "Empire Name", points: 0}]`,

    'historical-order': `
FORMAT: PUT HISTORICAL EVENTS IN ORDER
- 5 rounds, each with exactly 4 events to sort chronologically
- Difficulty increases — later rounds feature events that are counterintuitively ordered or very close in time
- "question" field: "Put these events in chronological order:"
- "events" array in content: the 4 events listed in SCRAMBLED order (audience must sort them)
- Reveal: correct chronological order with years
- "answers" in reveal: [{text: "1. First Event (YEAR)", points: 0}, ...] — all 4 in correct order`,

    'guess-the-capital': `
FORMAT: GUESS THE CAPITAL CITY
- 5 rounds, increasing difficulty:
  * Round 1: Capital everyone knows (Paris, London, Washington DC)
  * Round 2: Well-known capital
  * Round 3: Moderate difficulty
  * Round 4: Capital people often get wrong
  * Round 5: Capital that surprises everyone (Canberra not Sydney, Astana/Nur-Sultan not Almaty, etc.)
- Reveal: correct capital + why people often get it wrong (if surprising)
- "answers" array: one correct answer`,

    'country-by-clue': `
FORMAT: NAME A COUNTRY BY CLUE
- 5 rounds, each revealing a mystery country through 3 progressive clues
- Clues go from vague → specific:
  * Clue 1: Very general (continent, rough size, climate)
  * Clue 2: More specific (famous neighbor, geographic feature, cultural fact)
  * Clue 3: Nearly gives it away (specific landmark, famous export, unique fact)
- Difficulty increases across rounds (Round 1: famous country, Round 5: very obscure)
- "clues" array in content: [clue1, clue2, clue3]
- Reveal: the mystery country + which clue was the giveaway`,
  };

  const instructions = formatInstructions[format_type] || `Create 5 trivia rounds about ${category} with increasing difficulty.`;

  return `You are an expert TikTok trivia game designer. Create a complete, engaging trivia game in JSON format.

GAME: "${title}"
HOOK: "${hook}"
CATEGORY: ${category}

${instructions}

RETURN THIS EXACT JSON STRUCTURE (12 slides total):
{
  "title": "${title}",
  "hook": "${hook}",
  "scoring_system": "one-sentence description of how scoring works",
  "slides": [
    {
      "slide_index": 0,
      "slide_type": "title",
      "content": {
        "title": "game title",
        "hook": "hook line",
        "category": "${category}",
        "subtitle": "brief format tagline"
      },
      "image_prompt": "..."
    },
    {
      "slide_index": 1,
      "slide_type": "round",
      "content": {
        "round_number": 1,
        "question": "the question",
        "difficulty": "easy",
        "clues": ["clue1","clue2","clue3"],
        "events": ["event1","event2","event3","event4"]
      },
      "image_prompt": "..."
    },
    {
      "slide_index": 2,
      "slide_type": "reveal",
      "content": {
        "round_number": 1,
        "question": "same question",
        "answers": [{"text": "Answer", "points": 95}, {"text": "Rarer", "points": 10, "is_pointless": true}],
        "correct_answer": "main correct answer",
        "fun_fact": "interesting related fact"
      },
      "image_prompt": "..."
    },
    ... (rounds 2-5 follow same pattern at slide_index 3-10)
    {
      "slide_index": 11,
      "slide_type": "score",
      "content": {
        "title": "How Did You Score?",
        "scoring_summary": "scoring breakdown e.g. 0pts = genius | under 50 = legend | under 100 = solid | over 100 = study more!"
      },
      "image_prompt": "..."
    }
  ]
}

IMAGE PROMPT RULES (ALL slides):
- Cinematic, photorealistic, dark atlas/map aesthetic
- High contrast, dramatic lighting, deep shadows
- Absolutely NO text visible in the image
- Vertical 9:16 portrait format
- Rich, saturated colors against very dark background
- Cinematic depth of field where appropriate

CRITICAL: Return ONLY valid JSON. All 12 slides required. slide_index 0-11.`;
}
