export type Category = 'Geography' | 'Flags' | 'History';

export type FormatType =
  | 'bordering-country'
  | 'guess-the-flag'
  | 'easy-to-impossible'
  | 'country-from-map'
  | 'guess-the-empire'
  | 'historical-order'
  | 'guess-the-capital'
  | 'country-by-clue';

export type SlideType = 'title' | 'round' | 'reveal' | 'score';
export type GameStatus = 'draft' | 'ready';
export type ImageStatus = 'pending' | 'generating' | 'ready' | 'failed';

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
  // reveal slide
  answers?: Answer[];
  correct_answer?: string;
  fun_fact?: string;
  // score slide
  scoring_summary?: string;
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
