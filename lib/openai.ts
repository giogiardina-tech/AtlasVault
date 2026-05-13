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

  const scoreSummaryGuide: Record<string, string> = {
    'bordering-country': `scoring_summary uses POINTLESS scoring — total points across 5 rounds (lower = rarer = better). Example: "0pts = POINTLESS genius | under 150 = geography legend | under 300 = solid | over 300 = study more!"`,
    'guess-the-flag': `scoring_summary uses correct answers out of 5. Example: "5/5 = flag master | 4/5 = impressive | 3/5 = solid | 2/5 or below = study your flags!"`,
    'easy-to-impossible': `scoring_summary uses correct answers out of 5. Example: "5/5 = genius | 4/5 = impressive | 3/5 = solid | 2 or below = keep learning!"`,
    'country-from-map': `scoring_summary uses correct answers out of 5. Example: "5/5 = cartography master | 4/5 = solid geographer | 3/5 = decent | 2 or below = get a map!"`,
    'guess-the-empire': `scoring_summary uses correct answers out of 5. Example: "5/5 = history master | 4/5 = empire enthusiast | 3/5 = solid | 2 or below = brush up on history!"`,
    'historical-order': `scoring_summary uses POSITION scoring — 1 point per correct position, 4 per round, 20 total. Example: "20/20 = history genius | 15-19 = impressive | 10-14 = solid | under 10 = study up!"`,
    'guess-the-capital': `scoring_summary uses correct answers out of 5. Example: "5/5 = capital city expert | 4/5 = sharp | 3/5 = decent | 2 or below = study your capitals!"`,
    'country-by-clue': `scoring_summary uses correct answers out of 5. Example: "5/5 = world explorer | 4/5 = impressive | 3/5 = solid | 2 or below = keep exploring!"`,
  };

  const format = formatInstructions[format_type];
  const instructions = format?.instructions || `Create 5 trivia rounds about ${category} with increasing difficulty.`;
  const revealType = format?.revealType || 'difficulty';
  const revealExample = revealStructures[revealType] || revealStructures.difficulty;
  const scoreSummary = scoreSummaryGuide[format_type] || `scoring_summary uses correct answers out of 5.`;

  const roundImageRule = format_type === 'guess-the-flag'
    ? `ROUND slides (FLAG GAME — the flag IS the question, show it clearly):
- Show the country's flag as a clean, flat, simple rectangular image centred on a plain near-black background (#0a0a0a)
- The flag must have significant padding on ALL four sides — at least 20% of the image width/height as empty dark space around it. The flag must NEVER touch or go near any edge of the image
- Keep it completely flat like a reference flag image: NO fabric texture, NO wave or drape, NO shadows, NO 3D effects, NO perspective distortion, NO cinematic lighting
- Every colour band, symbol, emblem, and detail must be sharply rendered and identifiable
- NO country names, text, labels, or decorative elements anywhere in the image`
    : `ROUND slides (question slides — do NOT reveal the answer):
- Show a compelling visual that relates to the topic or region WITHOUT giving away the specific answer
- Geography/map rounds: show the geographical REGION or continent — e.g. for a question about a European country, show a dramatic aerial/satellite view of Europe. Do NOT show the specific country outlined or highlighted.
- Flag rounds: show a dramatic cultural scene, landmark, or landscape associated with the region — NOT the flag itself and NOT anything that makes the country obvious
- Empire/history rounds: show a dramatic ancient or historical landscape from that era/region WITHOUT showing anything that names the empire
- Capital rounds: show a city skyline or urban landscape from the general region — NOT the specific capital city
- Clue rounds: show a visual related to one of the clues (e.g. continent, climate, landscape) that hints but does not give away the country
- Order rounds: show a dramatic historical collage or timeline aesthetic — no specific dates or names visible`;

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
        "scoring_summary": "IMPORTANT: ${scoreSummary} Use pipe | to separate score tiers."
      },
      "image_prompt": "..."
    }
  ]
}

IMAGE PROMPT RULES (every slide):
- Vivid, cinematic, photorealistic — designed to stop someone mid-scroll on TikTok
- Bold, saturated colours with dramatic lighting — think blockbuster movie poster energy
- Absolutely NO text, labels, country names, flag names, or writing visible anywhere in the image
- Vertical 9:16 portrait format, composition centred for mobile viewing
- Lighting can be dramatic and moody but must NOT be so dark that detail is lost — rich visible colour throughout

CRITICAL — IMAGE MUST BE RELEVANT TO THE SLIDE CONTENT:
Each image_prompt must be written specifically for what that slide is about. Generic prompts are not acceptable.

${roundImageRule}

REVEAL slides (answer slides — now you CAN show the subject directly):
- Geography reveals: show a vivid satellite or aerial view of the specific country/region
- Flag reveals: show the country's most iconic landmark, landscape, or cultural scene
- Capital reveals: show the actual capital city's skyline or iconic monument
- Empire reveals: show the empire's most iconic architecture or territory at its peak
- Clue reveals: show the mystery country's most recognisable feature
- Order reveals: show a dramatic historical scene related to the events shown

TITLE and SCORE slides:
- Title: bold, dramatic visual matching the game's theme — a striking globe, atlas, or thematic scene
- Score: triumphant, dramatic wide shot — world map, globe, or thematic finale image

CRITICAL: Return ONLY valid JSON. All 12 slides required. slide_index must be 0 through 11.`;
}
