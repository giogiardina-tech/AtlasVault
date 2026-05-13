# AtlasVault

Private AI-powered TikTok trivia content studio for geography, flags, and history games.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Add your OpenAI API key**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add: OPENAI_API_KEY=sk-...
   ```

3. **Run the app**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Features

- Choose from 8 reusable game formats (Bordering Country, Guess the Flag, etc.)
- AI generates catchy TikTok titles and full game content via GPT-4o
- DALL-E 3 generates cinematic slide images (1024x1792 portrait)
- Preview all slides in order with a phone-frame view
- Regenerate individual slides
- Export as ZIP (images + game script) or individual PNGs
- All games saved locally in SQLite — no account needed

## Game Formats

| Category | Format |
|---|---|
| Geography | Bordering Country Challenge (Pointless-style) |
| Geography | Easy to Impossible Quiz |
| Geography | Guess the Country from the Map |
| Geography | Guess the Capital |
| Geography | Name a Country by Clue |
| Flags | Guess the Flag |
| History | Guess the Empire |
| History | Put Historical Events in Order |

## Cost

Each game generates 12 slides via DALL-E 3 (~$0.96 per game at standard quality).
Content generation via GPT-4o is minimal cost (<$0.05 per game).

## License

MIT
