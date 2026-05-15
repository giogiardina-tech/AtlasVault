export type Category = 'Geography' | 'Flags' | 'History' | 'People' | 'Fights';

export type FormatType =
  | 'bordering-country'
  | 'guess-the-flag'
  | 'partial-flag'
  | 'easy-to-impossible'
  | 'country-from-map'
  | 'guess-the-empire'
  | 'historical-order'
  | 'guess-the-capital'
  | 'country-by-clue'
  | 'guess-the-person'
  | 'civilization-fight';

export type SlideType = 'title' | 'round' | 'reveal' | 'score';
export type GameStatus = 'draft' | 'ready';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type ImageStatus = 'pending' | 'generating' | 'ready' | 'failed';
export type ScoringType = 'pointless' | 'difficulty' | 'position' | 'fight';
export type DifficultyTier = 'easy' | 'medium' | 'hard' | 'impossible';

export interface Template {
  id: string;
  name: string;
  category: Category;
  format_type: FormatType;
  description: string;
  created_at: number;
}

export interface Answer {
  text: string;
  points: number;
  is_pointless?: boolean;
}

export interface CorrectOrderItem {
  event: string;
  year: number;
}

export interface SlideContent {
  // title slide
  title?: string;
  hook?: string;
  category?: string;
  subtitle?: string;
  // round slide
  round_number?: number;
  question?: string;
  difficulty?: string;
  clues?: string[];
  events?: string[];
  // reveal slide — scoring_type determines which display mode is used
  scoring_type?: ScoringType;
  // pointless mode
  answers?: Answer[];
  // difficulty mode (single correct answer)
  correct_answer?: string;
  difficulty_tier?: DifficultyTier;
  fun_fact?: string;
  clue_giveaway?: string;
  // position mode (historical order)
  correct_order?: CorrectOrderItem[];
  max_points?: number;
  // score slide
  scoring_summary?: string;
  // flag games — ISO 3166-1 alpha-2 code used to fetch real flag from CDN
  country_code?: string;
  // empire game — two pre-generated image prompt options shown to user before generation
  map_prompt?: string;
  feature_prompt?: string;
  // fight game
  side_a?: string;
  side_b?: string;
  winner?: string;
  side_a_percent?: number;
  side_b_percent?: number;
}

export interface Slide {
  id: string;
  game_id: string;
  slide_index: number;
  slide_type: SlideType;
  content: SlideContent;
  image_prompt: string;
  image_path: string | null;
  image_status: ImageStatus;
}

export interface Game {
  id: string;
  template_id: string | null;
  title: string;
  hook: string;
  category: Category;
  format_type: FormatType;
  status: GameStatus;
  created_at: number;
}

export interface GameIdea {
  title: string;
  hook: string;
}

export interface GeneratedSlide {
  slide_index: number;
  slide_type: SlideType;
  content: SlideContent;
  image_prompt: string;
}

export interface GeneratedGame {
  title: string;
  hook: string;
  scoring_system: string;
  slides: GeneratedSlide[];
}
