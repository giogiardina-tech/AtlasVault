import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'atlasvault.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema(db);
    seedTemplates(db);
  }
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      format_type TEXT NOT NULL,
      description TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      template_id TEXT REFERENCES templates(id),
      title TEXT NOT NULL,
      hook TEXT NOT NULL,
      category TEXT NOT NULL,
      format_type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS slides (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      slide_index INTEGER NOT NULL,
      slide_type TEXT NOT NULL,
      content TEXT NOT NULL,
      image_prompt TEXT,
      image_path TEXT,
      image_status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);
}

function seedTemplates(db: DatabaseSync) {
  // Use INSERT OR IGNORE so new templates are added without wiping existing data

  const insert = db.prepare(`
    INSERT OR IGNORE INTO templates (id, name, category, format_type, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    insert.run('tmpl-001', 'Bordering Country Challenge', 'Geography', 'bordering-country',
      'Pointless-style: name all countries bordering a given country. Rarer answers score lower (better). Can you find the Pointless answer?');
    insert.run('tmpl-002', 'Guess the Flag', 'Flags', 'guess-the-flag',
      'Show a flag, audience guesses the country. Progresses from major world powers to obscure territories.');
    insert.run('tmpl-003', 'Easy to Impossible Quiz', 'Geography', 'easy-to-impossible',
      'Questions start simple (anyone can answer) and escalate to near-impossible. Perfect for testing depth of knowledge.');
    insert.run('tmpl-004', 'Guess the Country from the Map', 'Geography', 'country-from-map',
      'A country is highlighted on a dark map. Audience must name it. Starts obvious, ends with tiny territories.');
    insert.run('tmpl-005', 'Guess the Empire', 'History', 'guess-the-empire',
      "Show an empire's territory at its peak without naming it. From the obvious Roman Empire to ancient civilizations.");
    insert.run('tmpl-006', 'Put Historical Events in Order', 'History', 'historical-order',
      'Given 4 events, sort them chronologically. Tricky ordering challenges that even history buffs get wrong.');
    insert.run('tmpl-007', 'Guess the Capital', 'Geography', 'guess-the-capital',
      'Name the capital city. Starts with Paris and London, ends with capitals that trick even geography nerds (Canberra, Astana).');
    insert.run('tmpl-008', 'Name a Country by Clue', 'Geography', 'country-by-clue',
      'Three cryptic clues reveal a mystery country. Only the sharpest geography minds can deduce it from clue one.');
    insert.run('tmpl-009', 'Partial Flag Challenge', 'Flags', 'partial-flag',
      'Only a cropped section of the flag is shown — can you identify the country? The crop gets smaller and harder each round.');
    insert.run('tmpl-010', 'Guess the Historical Figure', 'People', 'guess-the-person',
      'Three clues, hardest first — can you identify the historical figure? From ancient rulers to modern icons, test your knowledge of the people who shaped history.');
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
