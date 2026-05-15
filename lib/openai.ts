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
  hook: string,
  usedSubjects: string[] = [],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): string {
  const difficultyInstructions: Record<string, string> = {
    easy: `CONTENT DIFFICULTY LEVEL: EASY
- Use the most famous, universally recognised countries/flags/empires/capitals/events
- Rounds 1–2: things any schoolchild worldwide knows (France, China, Roman Empire, Paris)
- Round 3: things most adults know
- Round 4: things a geography/history enthusiast knows
- Round 5 ("impossible"): genuinely tricky but guessable by any geography or history fan`,
    medium: `CONTENT DIFFICULTY LEVEL: MEDIUM
- Mix of well-known and lesser-known content across all 5 rounds
- Rounds 1–2: well-known but not the most obvious choices
- Round 3: moderately known to an engaged general audience
- Round 4: requires genuine knowledge of the subject
- Round 5 ("impossible"): genuinely obscure to most people`,
    hard: `CONTENT DIFFICULTY LEVEL: HARD
- Avoid the obvious, over-used examples — use less commonly known content throughout
- Round 1 ("easy"): things geography/history enthusiasts know but casual viewers likely do not
- Round 2: requires real interest in the subject
- Rounds 3–4: specialist knowledge territory
- Round 5 ("impossible"): extremely obscure — tiny nations, ancient or regional empires, surprise capitals, visually similar or rarely seen flags of sovereign countries`,
  };
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
- CRITICAL: Use SOVEREIGN COUNTRIES ONLY — no territories, dependencies, overseas regions, or autonomous areas. Every flag must belong to a UN-recognised sovereign nation.
- 5 rounds with strict difficulty progression:
  * Round 1: Major world power — difficulty_tier: "easy"
  * Round 2: Well-known nation — difficulty_tier: "easy"
  * Round 3: Moderately known nation — difficulty_tier: "medium"
  * Round 4: Lesser-known sovereign nation — difficulty_tier: "hard"
  * Round 5: Obscure sovereign nation or visually confusing flag of a real country — difficulty_tier: "impossible"
- CRITICAL: Every round slide AND its paired reveal slide must include "country_code": "xx" — the ISO 3166-1 alpha-2 code (2 lowercase letters) for the featured country (e.g. "us", "gb", "jp", "br", "ng")
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
- QUESTION FIELD: write a geographic hint describing the territory WITHOUT naming the empire. Mention continents/regions covered and approximate era. Examples:
  * "Which empire once controlled territory stretching from Eastern Europe all the way to China and Korea?"
  * "Which empire ringed the entire Mediterranean Sea at its peak in the 2nd century AD?"
  * "Which empire ruled the British Isles, India, large parts of Africa, Canada, and Australia?"
  * "Which ancient empire controlled the Nile Valley and stretched deep into modern-day Sudan?"
- CRITICAL: Every round slide content must include TWO image prompt fields:
  * "map_prompt": a vivid description for an aged parchment territory map (describe only by geography, e.g. "Aged dark parchment historical map, territory covering Central Asia, China, Persia and reaching into Eastern Europe filled with warm amber wash, surrounding regions near-black, no text")
  * "feature_prompt": a vivid cinematic description of the empire's most iconic landmark or cultural symbol WITHOUT naming the empire (e.g. "The Great Pyramids of Giza at dusk with the Sphinx in the foreground, warm golden light, dramatic orange and purple sky, cinematic composition")
- The top-level image_prompt field should be set to the feature_prompt value
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

    'partial-flag': {
      revealType: 'difficulty',
      instructions: `
FORMAT: PARTIAL FLAG CHALLENGE — GUESS THE FLAG FROM A ZOOMED CROP
- CRITICAL: Use SOVEREIGN COUNTRIES ONLY — no territories, dependencies, or autonomous regions
- 5 rounds using a DIFFERENT country each round, escalating from well-known to obscure flags:
  * Round 1: a very famous, instantly recognisable flag (USA, UK, Canada, Japan, Brazil…) — difficulty_tier: "easy"
  * Round 2: a well-known flag most people would recognise — difficulty_tier: "easy"
  * Round 3: a moderately known flag — difficulty_tier: "medium"
  * Round 4: a less common flag most people would struggle with — difficulty_tier: "hard"
  * Round 5: an obscure flag very few people could identify — difficulty_tier: "impossible"
- CRITICAL: Every round slide AND its paired reveal slide must include "country_code": "xx" — the ISO 3166-1 alpha-2 code (2 lowercase letters) for the featured country (e.g. "us", "gb", "jp", "br", "ng")
- Question for every round: "Which country does this flag belong to?"
- Reveal: full country name + a fun_fact about what the flag's symbols represent`,
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
    'partial-flag': `scoring_summary uses correct answers out of 5. Example: "5/5 = flag detective | 4/5 = sharp eyes | 3/5 = solid | 2 or below = study your flags!"`,
    'country-by-clue': `scoring_summary uses correct answers out of 5. Example: "5/5 = world explorer | 4/5 = impressive | 3/5 = solid | 2 or below = keep exploring!"`,
  };

  const format = formatInstructions[format_type];
  const instructions = format?.instructions || `Create 5 trivia rounds about ${category} with increasing difficulty.`;
  const revealType = format?.revealType || 'difficulty';
  const revealExample = revealStructures[revealType] || revealStructures.difficulty;
  const scoreSummary = scoreSummaryGuide[format_type] || `scoring_summary uses correct answers out of 5.`;

  const roundImageRule = (format_type === 'partial-flag' || format_type === 'guess-the-flag')
    ? `ROUND slides (FLAG GAME — real flag fetched from CDN, no AI image needed):
- The flag image is fetched automatically from a CDN using country_code — do NOT write a real image_prompt
- Set image_prompt to a short description only, e.g. "flag of Canada" or "flag of Japan" — it will not be used for generation`
    : format_type === 'guess-the-empire'
    ? `ROUND slides (GUESS THE EMPIRE — visually stunning image hinting at the empire, NO text or labels anywhere):
- CRITICAL: absolutely NO text, NO empire names, NO country names, NO city names, NO labels, NO captions anywhere in the image
- STYLE: cinematic, high-quality digital art or dramatic illustration — rich colours, moody lighting, visually striking. NOT a flat map unless the territory truly is the best hint.
- For each empire choose the MOST iconic and visually compelling option:

  ICONIC IMAGERY (preferred when an empire has a famous landmark, trade network, or cultural symbol):
  - Egyptian → the Great Pyramids of Giza at dusk with the Sphinx, warm golden sand, dramatic sky
  - Roman → the Colosseum lit at night or Roman aqueducts stretching across a landscape
  - Greek/Hellenistic → the Parthenon on the Acropolis at golden hour, marble columns
  - Ottoman → the Blue Mosque or Hagia Sophia silhouette at sunset over the Bosphorus
  - Aztec → the Pyramid of the Sun at Teotihuacan with a dramatic sky
  - Inca → Machu Picchu dramatically lit in mist and mountain peaks
  - Viking → a Viking longship at sea under dramatic Northern Lights
  - Silk Road empires (Tang, Abbasid…) → a dramatic desert caravan of camels at sunset with golden dunes
  - Mughal → the Taj Mahal at dawn reflected in still water
  - Persian/Achaemenid → Persepolis stone columns and reliefs dramatically lit
  - Mali → dramatic saharan gold market or ancient mud-brick mosque
  - Byzantine → gilded mosaics or the Hagia Sophia interior

  TERRITORY MAP (use when the empire's sheer scale IS the most iconic thing, e.g. Mongol, British, Spanish, Portuguese):
  - Style: aged dark parchment map with ONLY the empire territory filled in warm amber/sepia wash, surrounding regions dark. Describe coverage by continent/region — never the empire name.

- Every image_prompt must describe the scene vividly (composition, lighting, mood, colours) without ever naming the empire`
    : `ROUND slides (question slides — do NOT reveal the answer):
- Show a compelling visual that relates to the topic or region WITHOUT giving away the specific answer
- Geography/map rounds: show the geographical REGION or continent — e.g. for a question about a European country, show a dramatic aerial/satellite view of Europe. Do NOT show the specific country outlined or highlighted.
- Capital rounds: show a city skyline or urban landscape from the general region — NOT the specific capital city
- Clue rounds: show a visual related to one of the clues (e.g. continent, climate, landscape) that hints but does not give away the country
- Order rounds: show a dramatic historical collage or timeline aesthetic — no specific dates or names visible`;

  const exclusionBlock = usedSubjects.length > 0
    ? `\nALREADY USED IN PREVIOUS GAMES — DO NOT REPEAT ANY OF THESE:\n${usedSubjects.join(', ')}\nEvery answer, country, flag, empire, capital, and event in this game must be completely different from the above.\n`
    : '';

  return `You are an expert TikTok trivia game designer. Create a complete, engaging trivia game in JSON format.

GAME: "${title}"
HOOK: "${hook}"
CATEGORY: ${category}

${difficultyInstructions[difficulty]}
${exclusionBlock}
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
