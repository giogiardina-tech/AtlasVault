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
  // Reveal structure varies per scoring type — define them clearly
  const revealStructures: Record<string, string> = {
    pointless: `
REVEAL SLIDE (scoring_type: "pointless"):
{
  "slide_index": N,
  "slide_type": "reveal",
  "content": {
    "round_number": 1,
    "question": "same question text",
    "scoring_type": "pointless",
    "answers": [
      {"text": "Most common answer", "points": 92},
      {"text": "Common answer", "points": 75},
      {"text": "Uncommon answer", "points": 30},
      {"text": "Rare answer", "points": 8},
      {"text": "Rarest correct answer", "points": 0, "is_pointless": true}
    ]
  },
  "image_prompt": "..."
}
RULE: answers must include ALL geographically correct answers. There will ALWAYS be multiple valid answers because the question asks to "name A country that borders X" — every bordering country is a valid answer. Never include a single answer only.`,

    difficulty: `
REVEAL SLIDE (scoring_type: "difficulty"):
{
  "slide_index": N,
  "slide_type": "reveal",
  "content": {
    "round_number": 1,
    "question": "same question text",
    "scoring_type": "difficulty",
    "difficulty_tier": "easy",
    "correct_answer": "The One Correct Answer",
    "fun_fact": "A surprising, interesting fact related to this answer"
  },
  "image_prompt": "..."
}
RULE: difficulty_tier must be "easy" | "medium" | "hard" | "impossible" matching the round's actual difficulty.`,

    difficulty_clue: `
REVEAL SLIDE (scoring_type: "difficulty"):
{
  "slide_index": N,
  "slide_type": "reveal",
  "content": {
    "round_number": 1,
    "question": "same question text",
    "scoring_type": "difficulty",
    "difficulty_tier": "medium",
    "correct_answer": "The Mystery Country",
    "clue_giveaway": "Clue 2",
    "fun_fact": "An interesting fact about this country"
  },
  "image_prompt": "..."
}
RULE: clue_giveaway is which clue most people would crack it from (e.g. "Clue 1", "Clue 2", "Clue 3").`,

    position: `
REVEAL SLIDE (scoring_type: "position"):
{
  "slide_index": N,
  "slide_type": "reveal",
  "content": {
    "round_number": 1,
    "question": "Put these events in chronological order:",
    "scoring_type": "position",
    "correct_order": [
      {"event": "First event name", "year": 1918},
      {"event": "Second event name", "year": 1945},
      {"event": "Third event name", "year": 1969},
      {"event": "Fourth event name", "year": 1989}
    ],
    "max_points": 4
  },
  "image_prompt": "..."
}
RULE: correct_order must be sorted oldest → newest. Events in the ROUND slide must be the same 4 events listed in SCRAMBLED order.`,
  };

  const formatInstructions: Record<string, { instructions: string; revealType: string }> = {
    'bordering-country': {
      revealType: 'pointless',
      instructions: `
FORMAT: POINTLESS-STYLE BORDERING COUNTRY CHALLENGE
- Create 5 rounds, each with a DIFFERENT featured country
- Each question: "Name a country that borders [Country]"
- CRITICAL: List ALL geographically correct bordering countries — every single one is a valid answer
- There will always be multiple correct answers (e.g. France has 8 borders, Russia has 14)
- Assign point values based on how commonly a TikTok audience would name each country:
  * 80-100 pts: Countries people name immediately (most common guess)
  * 40-79 pts: Countries often named
  * 15-39 pts: Less commonly named
  * 1-14 pts: Rarely named
  * points: 0, is_pointless: true — the rarest correct answer (the one almost nobody names)
- Round difficulty increases: Round 1 = country with many well-known borders, Round 5 = country with fewer/less-known borders
- ALL answers must be geographically 100% accurate`,
    },

    'guess-the-flag': {
      revealType: 'difficulty',
      instructions: `
FORMAT: GUESS THE FLAG — EASY TO IMPOSSIBLE
- 5 rounds with strict difficulty progression:
  * Round 1: Major world power — difficulty_tier: "easy"
  * Round 2: Well-known nation — difficulty_tier: "easy"
  * Round 3: Moderately known nation — difficulty_tier: "medium"
  * Round 4: Lesser-known nation — difficulty_tier: "hard"
  * Round 5: Very obscure territory, dependency, or visually confusing flag — difficulty_tier: "impossible"
- Image prompts: photorealistic flag dramatically lit on dark background
- Reveal: the country name + a fun fact about what the flag's symbols mean`,
    },

    'easy-to-impossible': {
      revealType: 'difficulty',
      instructions: `
FORMAT: EASY TO IMPOSSIBLE — ${category.toUpperCase()} EDITION
- 5 questions, strict difficulty escalation:
  * Round 1: Any child knows this — difficulty_tier: "easy"
  * Round 2: Most adults know this — difficulty_tier: "easy"
  * Round 3: Geography/history enthusiasts know this — difficulty_tier: "medium"
  * Round 4: Only dedicated nerds know this — difficulty_tier: "hard"
  * Round 5: Almost nobody knows this — difficulty_tier: "impossible"
- Reveal: the correct answer + a surprising fun fact`,
    },

    'country-from-map': {
      revealType: 'difficulty',
      instructions: `
FORMAT: GUESS THE COUNTRY FROM THE MAP
- 5 rounds, difficulty increases:
  * Round 1: Very distinctive shape — difficulty_tier: "easy"
  * Round 2: Recognisable shape — difficulty_tier: "easy"
  * Round 3: Moderately known shape — difficulty_tier: "medium"
  * Round 4: Hard to distinguish — difficulty_tier: "hard"
  * Round 5: Tiny or very obscure territory — difficulty_tier: "impossible"
- Image prompts: dark map with ONLY the featured country glowing/highlighted, surroundings in dark grey
- Reveal: country name + its capital city as the fun_fact`,
    },

    'guess-the-empire': {
      revealType: 'difficulty',
      instructions: `
FORMAT: GUESS THE EMPIRE
- 5 rounds featuring historical empires at their territorial peak:
  * Round 1: Famous empire everyone knows — difficulty_tier: "easy"
  * Round 2: Well-known empire — difficulty_tier: "easy"
  * Round 3: Known to history enthusiasts — difficulty_tier: "medium"
  * Round 4: Specialist knowledge — difficulty_tier: "hard"
  * Round 5: Obscure ancient empire — difficulty_tier: "impossible"
- Image prompts: dark historical map showing empire territory at peak extent, glowing borders
- Reveal: empire name + peak period dates as the fun_fact (e.g. "At its peak in 117 AD, the Roman Empire covered 5 million km²")`,
    },

    'historical-order': {
      revealType: 'position',
      instructions: `
FORMAT: PUT HISTORICAL EVENTS IN ORDER
- 5 rounds, each with exactly 4 historical events to sort chronologically
- Difficulty increases — later rounds use events that are counterintuitively ordered or very close in time
- ROUND slide: "events" array lists the 4 events in SCRAMBLED order (no dates shown)
- REVEAL slide: "correct_order" array lists them oldest → newest with exact years
- The challenge: audiences often assume the wrong order`,
    },

    'guess-the-capital': {
      revealType: 'difficulty',
      instructions: `
FORMAT: GUESS THE CAPITAL CITY
- 5 rounds, increasing difficulty:
  * Round 1: Capital everyone knows — difficulty_tier: "easy"
  * Round 2: Well-known capital — difficulty_tier: "easy"
  * Round 3: Moderate difficulty — difficulty_tier: "medium"
  * Round 4: Capital people often get wrong — difficulty_tier: "hard"
  * Round 5: Capital that surprises everyone (Canberra not Sydney, Astana not Almaty, Dodoma not Dar es Salaam) — difficulty_tier: "impossible"
- Reveal: the correct capital + a fun_fact explaining why people get it wrong`,
    },

    'country-by-clue': {
      revealType: 'difficulty_clue',
      instructions: `
FORMAT: NAME A COUNTRY BY CLUE
- 5 rounds, each revealing a mystery country through exactly 3 progressive clues
- Clues go from vague → specific:
  * Clue 1: Very general (continent, rough size, climate zone)
  * Clue 2: More specific (a famous neighbor, a geographic feature, a cultural fact)
  * Clue 3: Nearly gives it away (famous landmark, unique fact, specific export)
- Difficulty increases across rounds (Round 1: famous country easily guessed, Round 5: very obscure)
- "clues" array in ROUND content: [clue1, clue2, clue3]
- Reveal: the mystery country + clue_giveaway (which clue most people crack it from) + fun_fact`,
    },
  };

  const format = formatInstructions[format_type];
  const instructions = format?.instructions || `Create 5 trivia rounds about ${category} with increasing difficulty.`;
  const revealType = format?.revealType || 'difficulty';
  const revealExample = revealStructures[revealType] || revealStructures.difficulty;

  return `You are an expert TikTok trivia game designer. Create a complete, engaging trivia game in JSON format.

GAME: "${title}"
HOOK: "${hook}"
CATEGORY: ${category}

${instructions}

SCORING SYSTEM FOR THIS FORMAT:
${revealExample}

FULL JSON STRUCTURE (12 slides total):
{
  "title": "${title}",
  "hook": "${hook}",
  "scoring_system": "one-sentence plain-English description of how scoring works for the audience",
  "slides": [
    {
      "slide_index": 0,
      "slide_type": "title",
      "content": { "title": "...", "hook": "...", "category": "${category}", "subtitle": "brief tagline" },
      "image_prompt": "..."
    },
    {
      "slide_index": 1,
      "slide_type": "round",
      "content": {
        "round_number": 1,
        "question": "the question text",
        "difficulty": "easy",
        "clues": ["only include for country-by-clue format"],
        "events": ["only include for historical-order format — scrambled"]
      },
      "image_prompt": "..."
    },
    [REVEAL SLIDE — use the scoring structure shown above],
    ... repeat round+reveal for rounds 2-5 (slide_index 3-10) ...
    {
      "slide_index": 11,
      "slide_type": "score",
      "content": {
        "title": "How Did You Score?",
        "scoring_summary": "clear breakdown — e.g. '0pts = POINTLESS genius | under 30 = geography legend | under 60 = solid | over 60 = study more!'"
      },
      "image_prompt": "..."
    }
  ]
}

IMAGE PROMPT RULES (every slide):
- Cinematic, photorealistic, dark atlas/map aesthetic
- High contrast, dramatic lighting, deep shadows
- Absolutely NO text or writing visible in the image
- Vertical 9:16 portrait format
- Rich colours against very dark background (#000-#1a1a1a)

CRITICAL: Return ONLY valid JSON. All 12 slides required. slide_index must be 0 through 11.`;
}
