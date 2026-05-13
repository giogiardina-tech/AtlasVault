// Run with: node --experimental-sqlite scripts/seed-test-game.mjs
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'atlasvault.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

const gameId = randomUUID();

db.prepare(`
  INSERT INTO games (id, template_id, title, hook, category, format_type, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
  gameId,
  'tmpl-001',
  'Name a Country That Borders France',
  'Most people get 4... can you find the POINTLESS answer?',
  'Geography',
  'bordering-country',
  'draft'
);

const slides = [
  {
    slide_index: 0,
    slide_type: 'title',
    content: {
      title: 'Name a Country That Borders France',
      hook: 'Most people get 4... can you find the POINTLESS answer?',
      category: 'Geography',
      subtitle: 'Pointless-Style Challenge',
    },
    image_prompt: 'Cinematic dark satellite view of Western Europe at night, France glowing at center with golden borders, dramatic atmosphere, no text, 9:16 vertical',
  },
  {
    slide_index: 1,
    slide_type: 'round',
    content: {
      round_number: 1,
      question: 'Name a country that shares a border with France',
      difficulty: 'easy',
    },
    image_prompt: 'Detailed dark relief map of France and surrounding countries, subtle glowing border effects, cinematic atlas style, no text, vertical format',
  },
  {
    slide_index: 2,
    slide_type: 'reveal',
    content: {
      round_number: 1,
      question: 'Name a country that shares a border with France',
      answers: [
        { text: 'Spain', points: 95 },
        { text: 'Germany', points: 88 },
        { text: 'Italy', points: 85 },
        { text: 'Belgium', points: 72 },
        { text: 'Switzerland', points: 60 },
        { text: 'Luxembourg', points: 18 },
        { text: 'Monaco', points: 4, is_pointless: true },
        { text: 'Andorra', points: 6 },
      ],
      fun_fact: 'France has the most borders of any country in the European Union — 8 land borders!',
    },
    image_prompt: 'Dark map of France with all bordering countries highlighted, dramatic reveal lighting, no text, vertical format',
  },
  {
    slide_index: 3,
    slide_type: 'round',
    content: {
      round_number: 2,
      question: 'Name a country that borders Russia',
      difficulty: 'medium',
    },
    image_prompt: 'Vast dark map of Russia spanning two continents, dramatic scale, glowing borders, cinematic lighting, no text, vertical format',
  },
  {
    slide_index: 4,
    slide_type: 'reveal',
    content: {
      round_number: 2,
      question: 'Name a country that borders Russia',
      answers: [
        { text: 'China', points: 92 },
        { text: 'Ukraine', points: 88 },
        { text: 'Finland', points: 75 },
        { text: 'Kazakhstan', points: 65 },
        { text: 'Belarus', points: 60 },
        { text: 'Mongolia', points: 45 },
        { text: 'Georgia', points: 30 },
        { text: 'Estonia', points: 22 },
        { text: 'Latvia', points: 20 },
        { text: 'Lithuania', points: 18 },
        { text: 'Poland', points: 15 },
        { text: 'Norway', points: 14 },
        { text: 'Azerbaijan', points: 12 },
        { text: 'North Korea', points: 8, is_pointless: true },
      ],
      fun_fact: 'Russia borders 14 countries — more than any other country in the world.',
    },
    image_prompt: 'Sprawling dark political map of Russia and its 14 neighbors, subtle country highlights, cinematic, no text',
  },
  {
    slide_index: 5,
    slide_type: 'round',
    content: {
      round_number: 3,
      question: 'Name a country that borders Brazil',
      difficulty: 'medium',
    },
    image_prompt: 'Dark relief map of South America with Brazil dominating the center, dramatic shadows, cinematic, no text, vertical',
  },
  {
    slide_index: 6,
    slide_type: 'reveal',
    content: {
      round_number: 3,
      question: 'Name a country that borders Brazil',
      answers: [
        { text: 'Argentina', points: 90 },
        { text: 'Colombia', points: 78 },
        { text: 'Peru', points: 72 },
        { text: 'Bolivia', points: 65 },
        { text: 'Venezuela', points: 60 },
        { text: 'Paraguay', points: 45 },
        { text: 'Uruguay', points: 40 },
        { text: 'Guyana', points: 15 },
        { text: 'Suriname', points: 12 },
        { text: 'French Guiana', points: 5, is_pointless: true },
      ],
      fun_fact: 'Brazil borders every South American country except Chile and Ecuador — it shares 47% of the continent\'s area.',
    },
    image_prompt: 'Dark map of South America, Brazil highlighted, neighboring countries in subtle tones, dramatic cinematic lighting, no text',
  },
  {
    slide_index: 7,
    slide_type: 'round',
    content: {
      round_number: 4,
      question: 'Name a country that borders China',
      difficulty: 'hard',
    },
    image_prompt: 'Cinematic dark map of Asia centered on China with vast borders, dramatic mountain ranges visible, glowing edges, no text',
  },
  {
    slide_index: 8,
    slide_type: 'reveal',
    content: {
      round_number: 4,
      question: 'Name a country that borders China',
      answers: [
        { text: 'Russia', points: 88 },
        { text: 'India', points: 85 },
        { text: 'Mongolia', points: 70 },
        { text: 'Vietnam', points: 65 },
        { text: 'Nepal', points: 58 },
        { text: 'Kazakhstan', points: 45 },
        { text: 'Myanmar', points: 40 },
        { text: 'Pakistan', points: 38 },
        { text: 'Laos', points: 30 },
        { text: 'Afghanistan', points: 25 },
        { text: 'North Korea', points: 20 },
        { text: 'Kyrgyzstan', points: 15 },
        { text: 'Tajikistan', points: 12 },
        { text: 'Bhutan', points: 8, is_pointless: true },
      ],
      fun_fact: 'China borders 14 countries (tied with Russia) — the most of any country in Asia.',
    },
    image_prompt: 'Dramatic dark political map of China and 14 neighboring countries, high contrast borders, cinematic atlas, no text',
  },
  {
    slide_index: 9,
    slide_type: 'round',
    content: {
      round_number: 5,
      question: 'Name a country that borders Austria',
      difficulty: 'impossible',
    },
    image_prompt: 'Detailed dark map of Central Europe with Austria in focus, dramatic Alpine topography, cinematic, no text, vertical',
  },
  {
    slide_index: 10,
    slide_type: 'reveal',
    content: {
      round_number: 5,
      question: 'Name a country that borders Austria',
      answers: [
        { text: 'Germany', points: 92 },
        { text: 'Italy', points: 80 },
        { text: 'Switzerland', points: 75 },
        { text: 'Czech Republic', points: 55 },
        { text: 'Hungary', points: 50 },
        { text: 'Slovenia', points: 30 },
        { text: 'Slovakia', points: 20 },
        { text: 'Liechtenstein', points: 5, is_pointless: true },
      ],
      fun_fact: 'Liechtenstein is one of only two doubly landlocked countries in the world — surrounded entirely by landlocked countries.',
    },
    image_prompt: 'Precise dark map of Austria and its 8 neighbors, each country subtly highlighted, cinematic atlas style, no text',
  },
  {
    slide_index: 11,
    slide_type: 'score',
    content: {
      title: 'How Did You Score?',
      scoring_summary:
        '0pts = POINTLESS genius! | Under 30 = Geography legend | Under 60 = Very impressive | Under 100 = Solid effort | Over 100 = Keep studying!',
    },
    image_prompt: 'Dramatic dark world map with glowing continents, triumphant cinematic lighting, deep shadows, no text, vertical format',
  },
];

const insertSlide = db.prepare(`
  INSERT INTO slides (id, game_id, slide_index, slide_type, content, image_prompt, image_status)
  VALUES (?, ?, ?, ?, ?, ?, 'pending')
`);

db.exec('BEGIN TRANSACTION');
for (const slide of slides) {
  insertSlide.run(
    randomUUID(),
    gameId,
    slide.slide_index,
    slide.slide_type,
    JSON.stringify(slide.content),
    slide.image_prompt
  );
}
db.exec('COMMIT');

console.log(`✓ Test game created: "${slides[0].content.title}"`);
console.log(`  Game ID: ${gameId}`);
console.log(`  Slides: ${slides.length}`);
console.log(`\nOpen http://localhost:3000 → Library to see it`);
