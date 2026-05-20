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
    "fun_fact": "One punchy surprising fact — MAX 18 WORDS."
  },
  "image_prompt": "..."
}
RULE: difficulty_tier must be "easy" | "medium" | "hard" | "impossible" matching the round's actual difficulty. fun_fact must be max 18 words — one sharp, surprising fact, NOT a full explanation.`,

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
    "fun_fact": "One punchy surprising fact — MAX 18 WORDS."
  },
  "image_prompt": "..."
}
RULE: clue_giveaway is which clue most people would crack it from (e.g. "Clue 1", "Clue 2", "Clue 3"). fun_fact must be max 18 words.`,

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
    "fun_fact": "Two punchy sentences max — the key deciding factor most people miss."
  },
  "image_prompt": "..."
}
RULE: side_a_percent + side_b_percent must equal exactly 100. Winner must match side_a or side_b exactly. Never use 50/50 — always give one side a clear edge based on real analysis. fun_fact: max 2 sentences, max 35 words.`,

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
- 5 rounds featuring historical empires, ancient civilisations, OR modern countries that no longer exist
- ALL 5 rounds use the SAME difficulty_tier — do NOT escalate. Set every round's difficulty_tier to: "${difficulty === 'easy' ? 'easy' : difficulty === 'hard' ? 'hard' : 'medium'}"
- Subject selection for this difficulty:
${difficulty === 'easy'
  ? `  * Pick empires any engaged adult knows instantly — Roman, Mongol, Ottoman, Egyptian, Soviet Union, British Empire, Byzantine, Aztec, Inca, Ming Dynasty, etc.\n  * Vary the era and region across all 5 rounds`
  : difficulty === 'hard'
  ? `  * Pick specialist-knowledge empires and defunct states — lesser-known ancient kingdoms, regional powers, short-lived political entities, obscure colonial or post-colonial states\n  * Vary the era and region across all 5 rounds`
  : `  * Pick moderately known empires — familiar to history enthusiasts but not obvious to casual viewers — Mughal, Macedonian, Umayyad, Mali, Austro-Hungarian, Mauryan, Safavid, Khmer, etc.\n  * Vary the era and region across all 5 rounds`}
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
- CRITICAL: Every round slide content must include TWO completely separate image prompt fields — keep them distinct in both content and style:
  * "feature_prompt": a museum-quality archival close-up of the empire's most iconic artifact, ruin, monument, inscription, coin, armor, sculpture, or cultural symbol. Style: dark background, precise museum/archive lighting, muted historical tones (deep charcoal, gold, bronze, slate), sharp detail. MUST NOT contain any map, border, territory, region, geography, or political visual. Examples by empire:
    - Roman: "Close-up of a Roman legionary's bronze helmet and cheek guards on a dark stone surface, dramatic museum side-lighting, deep shadows, worn patina"
    - Mongol: "Ornate Mongolian composite bow with leather quiver and bronze-tipped arrows arranged on dark velvet, museum display lighting, muted gold and brown"
    - Ottoman: "Detailed Iznik ceramic tile pattern in cobalt blue and white, museum archive photograph, dark surround, pristine glaze"
    - Egyptian: "Ancient Egyptian canopic jar in carved alabaster on black background, dramatic overhead museum lighting, ochre and cream tones"
    - Aztec: "Close-up of an Aztec obsidian ceremonial blade with carved serpent handle, dark stone surface, sharp museum lighting, deep black and jade tones"
    - Byzantine: "Gold Byzantine mosaic fragment showing a haloed figure, museum lighting, rich gold tesserae against dark background"
    - Persian: "Carved stone relief of an Achaemenid soldier in profile, Persepolis-style, museum archive photograph, charcoal and sand tones"
    - Viking: "Ornate Viking silver brooch with interlaced knotwork on dark linen, museum close-up, cool northern light"
    - Inca: "Inca gold mask with geometric relief decoration on dark velvet, warm side-lighting, rich gold against near-black"
    - Mughal: "Intricate Mughal jade dagger hilt inlaid with rubies and gold, museum display, deep green and gold tones, dark background"
    - Qin/Han/Chinese dynasties: "Terracotta warrior head fragment, close-up, dramatic shadow, museum photograph, ochre and grey clay tones"
    - Mali/West African empires: "Ancient gold Ashanti weight in the form of a bird, dark background, warm museum lighting, burnished gold"
    - Soviet Union: "Vintage Soviet cosmonaut helmet visor on dark background, chrome reflection, archival photograph quality"
    - East Germany: "Rusted East German Trabant car door handle detail, peeling paint, archival close-up, muted grey and rust tones"
  * "map_prompt": a premium dark historical atlas map. Style: deep navy or near-black background, empire territory shown as a subtle translucent gold or bronze wash, clean cartographic boundary lines, minimal aged-paper texture (subtle, not cracked or orange). Describe the territory by geography only — no empire name. NO orange parchment, NO bright amber, NO fantasy map look, NO cracked textures, NO messy borders. Examples:
    - "Dark navy museum-quality historical atlas, vast territory spanning Central Asia through China and Persia filled with translucent gold wash, surrounding regions near-black charcoal, fine hairline cartographic borders, no text"
    - "Premium dark atlas map, territory covering most of Western Europe and the British Isles shown in a subtle bronze highlight against deep charcoal, clean cartographic style, no labels"
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
  * Clue 2: More specific (a famous neighbor, geographic feature, or cultural fact)
  * Clue 3: Nearly gives it away (famous landmark, unique fact, or specific export)
- CLUE LENGTH: Each clue must be MAX 15 WORDS. Short, punchy — NOT full explanatory sentences.
  * BAD: "This country is located on the continent of South America and is known for its very large size and dense rainforests."
  * GOOD: "South America. One of the largest countries on Earth. Famous for its rainforests."
- Difficulty increases across rounds (Round 1: famous country, Round 5: very obscure)
- "clues" array in ROUND content: [clue1, clue2, clue3]
- Reveal: the mystery country + clue_giveaway (which clue most crack it from) + fun_fact (max 18 words)`,
    },

    'fame-battle': {
      revealType: 'fight',
      instructions: `
FORMAT: WHO WAS MORE FAMOUS? — FAME BATTLE
- 5 rounds, each pitting two iconic historical figures against each other in a fame and cultural impact showdown
- Figures can come from any era and any field: rulers, scientists, artists, explorers, philosophers, athletes, inventors, religious leaders
- NO difficulty field — every round stands on its own, omit "difficulty" from round slide content entirely
- Matchup quality rules:
  * Mix obvious crowd-pleasers with surprising or controversial matchups that spark debate
  * Include at least one cross-field matchup (e.g. Napoleon vs Shakespeare)
  * Include at least one matchup where the result is genuinely surprising or counterintuitive
  * Include figures from non-Western history — not just European or American icons
  * Avoid obvious mismatches where the answer is too easy (e.g. Hitler vs an obscure figure)
- ROUND slide content must include:
  * "side_a": full name of first person (e.g. "Napoleon Bonaparte", "Cleopatra")
  * "side_b": full name of second person (e.g. "Julius Caesar", "Marie Curie")
  * "question": always exactly "Who was more famous?"
- REVEAL slide: AI-informed fame percentages based on cultural reach, historical recognition, name recognition across cultures, media presence, and lasting legacy. The fun_fact must explain in 1-2 punchy sentences WHY the winner edges ahead — what specifically makes them more culturally embedded in human history.
- Percentages should reflect genuine analysis — never a boring 50/50, always give one person a clear edge based on real reasoning`,
    },

    'civilization-fight': {
      revealType: 'fight',
      instructions: `
FORMAT: CIVILIZATION FIGHT — WHO WOULD WIN?
- 5 rounds, each pitting two armies, states, nations, or civilizations against each other at their respective peaks
- Matchups can be historical conflicts OR cross-era hypotheticals — make it clear in the question which type it is
- NO difficulty field — omit "difficulty" from round slide content entirely

MATCHUP POOL — draw from ALL of these categories across 5 rounds. Do NOT default to European or ancient-only matchups:
  Ancient:           Roman Empire, Han Dynasty, Achaemenid Persian Empire, Macedonian Empire, Carthage, Ancient Egypt, Hittites, Assyrian Empire, Mauryan Empire, Xiongnu, Scythians, Spartans, Athenians, Ptolemaic Egypt, Seleucid Empire
  Medieval:          Byzantine Empire, Abbasid Caliphate, Mongol Empire, Viking raiders, Samurai clans (feudal Japan), Crusader states, Holy Roman Empire, Song Dynasty, Delhi Sultanate, Mali Empire, Kingdom of Kongo, Aztec Empire, Inca Empire, Khmer Empire
  Early Modern:      Ottoman Empire, Safavid Empire, Mughal Empire, Ming Dynasty, Spanish Empire, British Empire (colonial era), Napoleonic France, Kingdom of Prussia, Zulu Kingdom, Maratha Confederacy, Tokugawa Japan, Qing Dynasty
  Modern:            USA, USSR/Soviet Union, Nazi Germany, Imperial Japan, British Empire (WWI/WWII), France under Napoleon III, Imperial Russia, Confederate States, Union Army, German Empire (WWI), Austro-Hungarian Empire, Meiji Japan
  Contemporary:      Modern United States military, Modern China (PLA), NATO alliance, Russia (modern), Israel Defence Forces, North Korea, Modern Turkey
  Indigenous/Pre-Columbian: Aztec Triple Alliance, Inca Empire, Maya city-states, Iroquois Confederacy, Mississippian culture, Mapuche warriors, Apache Nation
  Nomadic/Tribal:    Mongol horde, Scythians, Huns, Xiongnu, Berber tribes, Sikh Khalsa, Zulu impis, Sioux warriors, Comanche raiders
  City-States:       Sparta, Athens, Carthage, Venice, Genoa, Singapore (modern)
  Empires (any era): any empire listed above, plus Timurid Empire, Sasanian Empire, Gupta Empire, Aksumite Empire, Ethiopian Empire

VARIETY RULES — for each game of 5 rounds:
  * Spread across at least 3 different eras (ancient, medieval, modern, etc.)
  * Spread across at least 3 different world regions (not all European)
  * Include at least one cross-era hypothetical matchup (e.g. Mongols vs. Napoleonic France)
  * Include at least one matchup involving Asia, Africa, or the Americas
  * Include at least one matchup that is genuinely close and debatable — not a blowout
  * Include at least one matchup that is surprising or counterintuitive
  * Later rounds (4–5) should be more unexpected and comment-worthy than earlier ones
  * NEVER use the same civilization twice in one game
  * AVOID defaulting to Roman vs Greek, Roman vs anyone, or all-European matchups

QUESTION field: choose the most fitting phrasing for each matchup:
  * Historical conflicts: "Who wins this real war?"
  * Cross-era hypotheticals: "Who wins in an all-out war at their peak?"
  * Strength comparisons: "Who was the stronger military power?"
  * Choose the most engaging phrasing — not always the same question every round

ROUND slide content must include:
  * "side_a": full name (e.g. "Mongol Empire", "United States", "Zulu Kingdom")
  * "side_b": full name
  * "question": the matchup question for this round (see QUESTION field above)

REVEAL slide: win percentages based on military strength, numbers, technology, logistics, terrain, and historical/strategic context. fun_fact: 1–2 punchy sentences explaining the key deciding factor — something most people would not have considered.`,
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
  * Clue 3: Nearly gives it away — a defining moment, famous title, or iconic legacy
- CLUE LENGTH: Each clue must be MAX 12 WORDS. Short punchy first-person fragments — NOT full paragraph sentences.
  * BAD (too long): "As a renowned scientist living in the 20th century, I developed a revolutionary theory that completely transformed our understanding of space and time."
  * GOOD (punchy): "I rewrote the laws of physics in the 20th century."
  * BAD (too long): "I was born into a noble family in ancient Egypt and ruled with great power over an empire that stretched across the Mediterranean."
  * GOOD (punchy): "I ruled Egypt and charmed two of Rome's greatest leaders."
- CRITICAL — FACTUAL ACCURACY: Every date, era, location, title, and claim must be 100% historically verified. Do NOT guess. If uncertain, use a confirmed well-known fact.
  * Do NOT confuse centuries — Cleopatra died 30 BC (ancient), Columbus sailed 1492 (late 15th century), Shakespeare lived 1564–1616
  * Do NOT misstate birth/death years, reign dates, or discovery dates
  * Do NOT attribute achievements to the wrong person
- CRITICAL — NO REPEATED INFORMATION ACROSS CLUES: Every clue must add completely new information. Different angle each time.
  * BAD (repeats): "I sailed west across the Atlantic" → "I reached the Americas in 1492"
  * GOOD (new each time): "I was born in Genoa and served a foreign crown" → "I made four voyages west" → "In 1492 I landed in the Caribbean"
- QUESTION for every round: "Who am I?"
- Clues in first-person: "I led the largest land empire in history" / "They called me the Great"
- "clues" array in ROUND content: [clue1_hardest, clue2_medium, clue3_easiest]
- Reveal: full name + fun_fact (max 18 words — one surprising verified fact)
- Cover a wide range of history: ancient rulers, scientists, artists, explorers, revolutionaries — not just Western figures`,
    },

    'scrambled-capitals': {
      revealType: 'difficulty',
      instructions: `
FORMAT: SCRAMBLED CAPITALS — UNSCRAMBLE THE CAPITAL CITY
- 5 rounds, each presenting a scrambled capital city name the player must decode
- QUESTION for every round: "What capital city is this?"
- DO NOT include a "scrambled" field — the scramble is generated by the application

ROUND slide content:
{
  "round_number": 1,
  "question": "What capital city is this?",
  "difficulty": "easy"
}

REVEAL slide content:
{
  "round_number": 1,
  "question": "What capital city is this?",
  "scoring_type": "difficulty",
  "difficulty_tier": "easy",
  "correct_answer": "London",
  "fun_fact": "London has been England's capital for over a thousand years."
}

DIFFICULTY PROGRESSION:
  * Round 1: World-famous capital (Paris, Tokyo, London, Rome) — short name — difficulty_tier: "easy"
  * Round 2: Well-known capital — difficulty_tier: "easy"
  * Round 3: Moderately known capital, medium-length name — difficulty_tier: "medium"
  * Round 4: Lesser-known capital, longer name — difficulty_tier: "hard"
  * Round 5: Obscure capital (Astana, Dodoma, Naypyidaw, Malabo) — difficulty_tier: "impossible"

fun_fact: verified fact, max 18 words, about the capital city or its country`,
    },

    'scrambled-countries': {
      revealType: 'difficulty',
      instructions: `
FORMAT: SCRAMBLED COUNTRIES — UNSCRAMBLE THE COUNTRY NAME
- 5 rounds, each presenting a scrambled country name the player must decode
- QUESTION for every round: "What country is this?"
- DO NOT include a "scrambled" field — the scramble is generated by the application

ROUND slide content:
{
  "round_number": 1,
  "question": "What country is this?",
  "difficulty": "easy"
}

REVEAL slide content:
{
  "round_number": 1,
  "question": "What country is this?",
  "scoring_type": "difficulty",
  "difficulty_tier": "easy",
  "correct_answer": "France",
  "fun_fact": "France is the world's most visited country with over 90 million tourists yearly."
}

DIFFICULTY PROGRESSION:
  * Round 1: World-famous country (France, Japan, Brazil, India) — short, clean name — difficulty_tier: "easy"
  * Round 2: Well-known country — difficulty_tier: "easy"
  * Round 3: Moderately known country, medium-length name — difficulty_tier: "medium"
  * Round 4: Less common country, longer name — difficulty_tier: "hard"
  * Round 5: Obscure country (Djibouti, Eswatini, Kiribati, Vanuatu) — difficulty_tier: "impossible"

fun_fact: verified fact, max 18 words, about the country`,
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
    'fame-battle': `scoring_summary is based on how many picks matched the AI's result. Example: "5/5 = cultural genius | 4/5 = history buff | 3/5 = decent | 2 or below = brush up on your icons!"`,
    'civilization-fight': `scoring_summary is based on how many battles the audience predicted correctly. Example: "5/5 = military genius | 4/5 = sharp strategist | 3/5 = decent commander | 2 or below = stick to peacetime!"`,
    'scrambled-capitals': `scoring_summary uses correct answers out of 5. Example: "5/5 = anagram genius | 4/5 = sharp mind | 3/5 = decent | 2 or below = study your capitals!"`,
    'scrambled-countries': `scoring_summary uses correct answers out of 5. Example: "5/5 = anagram master | 4/5 = impressive | 3/5 = decent | 2 or below = keep studying your world map!"`,
  };

  const format = formatInstructions[format_type];
  const instructions = format?.instructions || `Create 5 trivia rounds about ${category} with increasing difficulty.`;
  const revealType = format?.revealType || 'difficulty';
  const revealExample = revealStructures[revealType] || revealStructures.difficulty;
  const scoreSummary = scoreSummaryGuide[format_type] || `scoring_summary uses correct answers out of 5.`;

  const roundImageRule = format_type === 'fame-battle'
    ? `ROUND slides (FAME BATTLE — understated historical era scene, NO text, NO portraits, NO names):
- CRITICAL: absolutely NO text, NO names, NO portraits of specific people anywhere in the image
- Show a subdued scene from the era or cultural world these two figures inhabited — a Roman forum, a Renaissance court, a scientific laboratory, a battlefield — muted and atmospheric
- Style: archival documentary photograph or restrained historical illustration, muted desaturated tones — NOT fantasy art, NOT dramatic AI concept art`
    : format_type === 'civilization-fight'
    ? `ROUND slides (CIVILIZATION FIGHT — restrained historical battle scene, NO text or names):
- CRITICAL: absolutely NO text, NO civilization names, NO labels anywhere in the image
- Show a grounded historical conflict scene: armies in formation, siege walls, warships, cavalry — realistic and believable, not fantasy
- Style: muted historical illustration or archival military art, desaturated tones, natural light — NOT a blockbuster film poster, NOT fantasy digital art`
    : format_type === 'guess-the-person'
    ? `ROUND slides (GUESS THE PERSON — understated era-appropriate scene, NEVER show or name the person):
- CRITICAL: absolutely NO text, NO names, NO portraits of the specific person anywhere in the image
- Show a clean scene from the era or region — e.g. ancient Roman forum, Renaissance workshop, explorer's ship, a battlefield — simple and grounded
- Style: archival-style photograph or restrained period illustration, muted tones — NOT cinematic, NOT fantasy, NOT AI drama`
    : (format_type === 'partial-flag' || format_type === 'guess-the-flag')
    ? `ROUND slides (FLAG GAME — real flag fetched from CDN, no AI image needed):
- The flag image is fetched automatically from a CDN using country_code — do NOT write a real image_prompt
- Set image_prompt to a short description only, e.g. "flag of Canada" or "flag of Japan" — it will not be used for generation`
    : format_type === 'guess-the-empire'
    ? `ROUND slides (GUESS THE EMPIRE — two separate image prompts per round, NO text or labels in either):
- CRITICAL: absolutely NO text, NO empire names, NO country names, NO city names, NO labels anywhere in either image
- The round slide content JSON will contain BOTH "feature_prompt" and "map_prompt" fields — write both precisely

FEATURE PROMPT STYLE (for iconic artifact/monument/symbol images):
- Dark background with museum-quality archive lighting — deep charcoal, black, or dark slate surroundings
- Subject: close-up of a specific, recognisable historical artifact, ruin, carved stone, coin, weapon, ceramic, statue, mosaic, or cultural object associated with that empire
- Tone: muted, precise, archival — NOT bright, NOT cinematic concept art, NOT fantasy illustration
- MUST NOT depict any map, territory outline, border, region, political geography, or cartographic element whatsoever
- Examples:
  * Roman: bronze eagle legionary standard, a Roman gladius sword on dark stone, Colosseum arches at dusk
  * Egyptian: carved limestone hieroglyph slab, alabaster canopic jar, pharaoh death mask detail
  * Mongol: composite war bow with arrow, bronze stirrups on dark velvet, ornate leather saddle
  * Ottoman: Iznik tile panel in cobalt and white, a curved yatağan sword, sultan's tugra seal
  * Viking: runic stone carving, silver armring on dark linen, iron sword hilt with twisted grip
  * Aztec: obsidian blade, carved sun stone fragment, jade mosaic mask
  * Byzantine: gold mosaic haloed portrait, jewelled reliquary close-up
  * Soviet: vintage cosmonaut helmet visor, Sputnik satellite model on dark background

MAP PROMPT STYLE (for territory/atlas images):
- Deep navy or near-black background — premium dark historical atlas aesthetic
- Empire territory shown as a clean translucent gold, bronze, or warm teal wash — subtle, not garish
- Fine cartographic hairline borders — clean and precise, not messy blobs
- Minimal aged-paper texture if used — barely visible, never orange, never cracked
- Surrounding regions in dark charcoal or near-black
- NO orange parchment, NO bright amber, NO cracked fantasy-map textures, NO muddy borders
- Describe the geographic coverage by continent/region only — never the empire name
- Examples:
  * "Premium dark atlas, territory spanning the British Isles, Western Europe, South Asia, and coastal Africa filled in a translucent warm gold wash, surrounding regions near-black, clean cartographic lines, no text"
  * "Dark navy historical atlas, vast territory from Eastern Europe across Central Asia to the Pacific coast marked in subtle bronze, surrounding regions charcoal, fine border lines, no labels"

- Every image_prompt must describe the scene without ever naming the empire`
    : (format_type === 'scrambled-capitals' || format_type === 'scrambled-countries')
    ? `ROUND slides (SCRAMBLED — background must give ZERO hints about the specific answer):
- CRITICAL: the image must contain nothing that could identify the specific capital or country being scrambled
- NO identifiable landmarks, flags, city skylines, named coastlines, or recognisable geographic shapes of any specific country
- Style: cinematic dark satellite imagery or aerial terrain — choose ONE of these directions:
  * Earth from space at night — deep black space, the curved blue atmospheric limb of Earth, faint city lights scattered across a dark landmass (no recognisable coastlines)
  * Extreme close-up aerial terrain — abstract dark ridge lines of mountains or sand dunes from directly above, deep shadow, no scale reference
  * Dark ocean surface from above — deep navy and near-black water texture with faint wave patterns, no land visible
  * Abstract topographic depth — dark layered terrain contours like a relief map, deep blues and slate greys, no labels or borders
- The background must feel vast, geographic, and exploratory — like viewing Earth from orbit — without revealing any specific location
- Very dark overall (background stays behind the scrambled text) but with subtle tonal variation and depth — NOT flat black`
    : `ROUND slides (question slides — do NOT reveal the answer):
- Show a clean, minimal visual related to the topic or region WITHOUT giving away the specific answer
- Geography/map rounds: show the REGION or continent — a clean aerial or satellite view. Do NOT show the specific country outlined or highlighted.
- Capital rounds: show a city skyline or landmark from the general region — NOT the specific capital city
- Clue rounds: show a visual hinting at the continent, climate, or landscape — simple and understated
- Order rounds: a simple historical scene — muted, archival aesthetic, no specific dates or names visible`;

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
- Style: minimal, clean, realistic photography — satellite imagery, archival documentary photography, aerial views, restrained historical illustration with muted tones. NOT AI concept art, NOT cinematic fantasy, NOT movie poster lighting.
- Mood: dark, subdued, understated. Muted or desaturated colors. Soft natural or diffused lighting. NO excessive contrast, NO glow effects, NO fantasy atmosphere, NO painterly drama.
- Purpose: the image is a BACKGROUND — it should recede behind the text, not compete. Darker edges, uncluttered subject.
- Absolutely NO text, labels, country names, or any writing visible anywhere in the image
- Vertical 9:16 portrait format, subject centred for mobile
- Think: National Geographic photograph, clean satellite view, restrained archival illustration — NOT a blockbuster film poster

CRITICAL — IMAGE MUST BE RELEVANT TO THE SLIDE CONTENT:
Each image_prompt must be written specifically for what that slide is about. Generic prompts are not acceptable.

${roundImageRule}

REVEAL slides (answer slides — now you CAN show the subject directly):
- Geography reveals: clean satellite or aerial view of the specific country/region — minimal, clear
- Flag reveals: the country's most recognisable landmark or landscape — simple and iconic, not over-composed
- Capital reveals: the capital city's most famous landmark or skyline — direct, clean
- Empire reveals: the empire's most iconic architecture or a clean territory map — understated
- Clue reveals: the mystery country's most recognisable natural or built feature — clear and unambiguous
- Order reveals: a simple, clean historical scene — muted, archival aesthetic, relevant to the events shown
- Person reveals: the era the figure lived in — a period scene, NOT a portrait of the person
- Fight/Fame reveals: a clean scene relevant to the winner — restrained, not triumphalist

TITLE and SCORE slides:
- Title: clean, dark background — a minimal globe, abstract world map, dark atlas texture, or subtle thematic image. Keep it simple and dark so the title text dominates completely.
- Score: simple wide dark background — a world map, globe, or clean thematic scene. Atmospheric, not dramatic.

CRITICAL: Return ONLY valid JSON. All 12 slides required. slide_index must be 0 through 11.`;
}
