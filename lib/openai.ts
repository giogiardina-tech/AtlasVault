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

    fight: `
REVEAL SLIDE (scoring_type: "fight"):
{
  "slide_index": N,
  "slide_type": "reveal",
  "content": {
    "round_number": 1,
    "scoring_type": "fight",
    "side_a": "Roman Empire",
    "side_b": "Greek City-States",
    "winner": "Roman Empire",
    "side_a_percent": 68,
    "side_b_percent": 32,
    "fun_fact": "Rome's professional legions, superior logistics and siege technology gave them a decisive edge — but the mountainous Greek terrain and naval power would have made victory costly."
  },
  "image_prompt": "..."
}
RULE: side_a_percent + side_b_percent must equal exactly 100. Winner must match side_a or side_b exactly. Never use 50/50 — always give one side a clear edge based on real military, logistical, and strategic analysis.`,

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
FORMAT: GUESS THE EMPIRE (OR DEFUNCT STATE)
- 5 rounds featuring historical empires, ancient civilisations, OR modern countries that no longer exist:
  * Round 1: Famous empire or defunct state everyone knows — difficulty_tier: "easy"
  * Round 2: Well-known empire or defunct state — difficulty_tier: "easy"
  * Round 3: Known to history enthusiasts — difficulty_tier: "medium"
  * Round 4: Specialist knowledge — difficulty_tier: "hard"
  * Round 5: Obscure ancient empire or lesser-known defunct state — difficulty_tier: "impossible"
- SUBJECT POOL — draw from all of these, not just ancient empires:
  * Ancient/classical empires: Roman, Mongol, Ottoman, Persian, Egyptian, Greek/Macedonian, Byzantine, Mayan, Aztec, Inca, Han, Mughal, Mali, Viking…
  * Colonial empires: British, Spanish, Portuguese, French, Dutch…
  * Modern defunct states: Soviet Union, East Germany (GDR), Yugoslavia, Czechoslovakia, Ottoman Empire (modern era), Austro-Hungarian Empire, Weimar Republic, Confederate States, Republic of Texas, USSR satellite states…
  * Any sovereign country or political entity that no longer exists today
- QUESTION FIELD: write a geographic or historical hint describing the entity WITHOUT naming it. Mention territory, era, or defining characteristics. Examples:
  * "Which empire once controlled territory stretching from Eastern Europe all the way to China and Korea?"
  * "Which country occupied the eastern half of Germany from 1949 until reunification in 1990?"
  * "Which federation of six republics dissolved in the 1990s following a series of devastating civil wars?"
  * "Which superpower controlled much of Eastern Europe, Central Asia, and Siberia until its collapse in 1991?"
  * "Which empire ringed the entire Mediterranean Sea at its peak in the 2nd century AD?"
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

    'civilization-fight': {
      revealType: 'fight',
      instructions: `
FORMAT: CIVILIZATION FIGHT — WHO WOULD WIN?
- 5 rounds, each pitting two civilizations, empires, armies, or nations against each other in a hypothetical all-out war at their respective peaks
- Matchups can span any era and type: ancient empires, medieval kingdoms, colonial powers, modern defunct states, or even cross-era hypotheticals
- NO difficulty field — every round stands on its own, omit "difficulty" from round slide content entirely
- Matchup quality rules:
  * Mix obvious crowd-pleasing matchups with surprising or unexpected ones
  * Include at least one cross-era or cross-geography hypothetical (e.g. Mongols vs. Napoleon's France)
  * Include at least one matchup that is genuinely close — not every round should be a blowout
  * Include at least one modern defunct state (Soviet Union, Ottoman Empire, Nazi Germany, Austro-Hungarian Empire, etc.)
  * Avoid repeating matchups from obvious well-known games — be creative
- ROUND slide content must include:
  * "side_a": full name of first civilization/empire/nation (e.g. "Roman Empire", "Soviet Union")
  * "side_b": full name of second civilization/empire/nation
  * "question": always exactly "Who wins in an all-out war?"
- REVEAL slide: AI-informed win percentages based on military strength, numbers, technology, logistics, terrain advantage, and historical context. The fun_fact must explain in 1-2 punchy sentences WHY the winner wins — the key deciding factors that most people wouldn't think of.`,
    },

    'guess-the-person': {
      revealType: 'difficulty',
      instructions: `
FORMAT: GUESS THE HISTORICAL FIGURE
- 5 rounds, each featuring a different historical figure from any era of human history
- Difficulty increases across rounds (Round 1: extremely famous, Round 5: known only to history enthusiasts)
- Each round gives exactly 3 clues in order from HARDEST to EASIEST (vague → specific → near giveaway):
  * Clue 1: Very indirect — an achievement, trait, or era that could apply to several people
  * Clue 2: More specific — a famous act, invention, title, or location that narrows it down significantly
  * Clue 3: Nearly gives it away — a well-known quote, iconic image description, or defining moment
- CRITICAL — FACTUAL ACCURACY: Every date, era, location, title, and claim must be 100% historically verified. Do NOT guess or approximate. If you are not certain of a specific fact, omit it rather than risk stating it incorrectly. Common errors to avoid:
  * Do NOT confuse centuries — Cleopatra died 30 BC (ancient, not medieval or Renaissance), Columbus sailed in 1492 (late 15th century, not 16th), Shakespeare lived 1564–1616 (Elizabethan era)
  * Do NOT misstate birth/death years, reign dates, or discovery dates
  * Do NOT attribute inventions, discoveries, or achievements to the wrong person
  * Do NOT place a historical figure in the wrong country, empire, or era
  * Before writing any date or century, verify it mentally: "Was Cleopatra really in the 16th century? No — she died 30 BC, ancient Egypt."
- CRITICAL — NO REPEATED INFORMATION ACROSS CLUES: Every clue must introduce a completely new piece of information. Never repeat the same date, event, location, or fact in more than one clue. Each clue should make the person more identifiable through a DIFFERENT angle (era → specific act → defining legacy), not by restating the same thing in different words.
- QUESTION for every round: "Who am I?" (the person is speaking in first person via the clues)
- Clues should be written in first-person voice as if the person is describing themselves:
  * e.g. "I led one of the greatest conquests in history" / "I united an empire stretching across Asia" / "They called me the Great"
- BAD example (repeats the voyage): "I sailed west across the Atlantic" → "I reached the Americas in 1492" — these say the same thing
- GOOD example (each clue adds something new): "I was born in Genoa and served a foreign crown" → "I made four voyages west, believing I'd reached Asia" → "In 1492 I landed in the Caribbean, opening the Americas to Europe"
- "clues" array in ROUND content: [clue1_hardest, clue2_medium, clue3_easiest]
- Reveal: the person's full name + a compelling fun_fact (verified birth/death years, their most surprising legacy, or a little-known but confirmed fact)
- Cover a wide range of history: ancient rulers, military leaders, scientists, artists, explorers, revolutionaries — not just Western figures`,
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
    'guess-the-person': `scoring_summary uses correct answers out of 5 AND which clue they needed. Example: "5/5 on clue 1 = history genius | 5/5 = historian | 3-4/5 = solid | 2 or below = brush up on history!"`,
    'civilization-fight': `scoring_summary is based on how many battles the audience predicted correctly. Example: "5/5 = military genius | 4/5 = sharp strategist | 3/5 = decent commander | 2 or below = stick to peacetime!"`,
  };

  const format = formatInstructions[format_type];
  const instructions = format?.instructions || `Create 5 trivia rounds about ${category} with increasing difficulty.`;
  const revealType = format?.revealType || 'difficulty';
  const revealExample = revealStructures[revealType] || revealStructures.difficulty;
  const scoreSummary = scoreSummaryGuide[format_type] || `scoring_summary uses correct answers out of 5.`;

  const roundImageRule = format_type === 'civilization-fight'
    ? `ROUND slides (CIVILIZATION FIGHT — epic battle scene, NO text or names):
- CRITICAL: absolutely NO text, NO civilization names, NO labels anywhere in the image
- Show a dramatic, cinematic clash between two opposing forces — armies colliding, warships in battle, siege warfare, cavalry charges
- The image should feel like a blockbuster war film poster: epic scale, dramatic lighting, high contrast, rich colour
- Style: ultra-cinematic digital art or photorealistic illustration — designed to stop someone mid-scroll`
    : format_type === 'guess-the-person'
    ? `ROUND slides (GUESS THE PERSON — dramatic era-appropriate scene, NEVER show or name the person):
- CRITICAL: absolutely NO text, NO names, NO portraits of the specific person anywhere in the image
- Show a dramatic scene from the era or region the person is associated with — e.g. ancient Roman forum, Renaissance workshop, battle scene, explorer's ship
- The image should hint at the era and setting without being identifiable to a specific individual
- Style: cinematic, richly detailed historical illustration or photorealistic period scene`
    : (format_type === 'partial-flag' || format_type === 'guess-the-flag')
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

  TERRITORY MAP (use when the empire's sheer scale IS the most iconic thing, e.g. Mongol, British, Spanish, Portuguese, Soviet Union):
  - Style: aged dark parchment map with ONLY the empire territory filled in warm amber/sepia wash, surrounding regions dark. Describe coverage by continent/region — never the empire name.

  MODERN DEFUNCT STATES (Soviet Union, East Germany, Yugoslavia, Czechoslovakia, etc.):
  - Soviet Union → dramatic Cold War era imagery: a cosmonaut floating in space, a Soviet rocket launch, or Red Square at night under a dramatic sky
  - East Germany → a dramatic shot of the Berlin Wall with watchtowers and searchlights at night
  - Yugoslavia → dramatic Adriatic coastline or mountain landscape spanning the Balkans
  - Austro-Hungarian Empire → the grand imperial architecture of Vienna or Budapest at golden hour
  - Use iconic visual symbols of the era rather than maps where possible

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

  return `You are an expert TikTok trivia game designer with deep knowledge of history, geography, and world cultures. Create a complete, engaging trivia game in JSON format.

CRITICAL — FACTUAL ACCURACY ABOVE ALL ELSE: Every single fact in this game must be 100% correct. Dates, centuries, names, locations, and achievements must all be verified before writing. If you are uncertain about any specific detail, use a well-known confirmed fact instead. A wrong answer or incorrect date destroys the credibility of the game — accuracy is non-negotiable.

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
