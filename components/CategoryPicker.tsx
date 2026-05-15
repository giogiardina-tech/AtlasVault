'use client';
import { Category } from '@/lib/types';

interface Props {
  onSelect: (category: Category) => void;
}

const categories = [
  {
    id: 'Geography' as Category,
    emoji: '🌍',
    description: 'Countries, capitals, borders, maps',
    color: 'from-emerald-900/60 to-emerald-950/80 border-emerald-700/40 hover:border-emerald-500/60',
    accent: 'text-emerald-400',
  },
  {
    id: 'Flags' as Category,
    emoji: '🚩',
    description: 'Identify flags from easy to impossible',
    color: 'from-blue-900/60 to-blue-950/80 border-blue-700/40 hover:border-blue-500/60',
    accent: 'text-blue-400',
  },
  {
    id: 'History' as Category,
    emoji: '🏛️',
    description: 'Empires, events, historical order',
    color: 'from-amber-900/60 to-amber-950/80 border-amber-700/40 hover:border-amber-500/60',
    accent: 'text-amber-400',
  },
  {
    id: 'People' as Category,
    emoji: '👤',
    description: 'Guess the historical figure from clues',
    color: 'from-purple-900/60 to-purple-950/80 border-purple-700/40 hover:border-purple-500/60',
    accent: 'text-purple-400',
  },
  {
    id: 'Fights' as Category,
    emoji: '⚔️',
    description: 'Two civilizations fight — who wins?',
    color: 'from-orange-900/60 to-orange-950/80 border-orange-700/40 hover:border-orange-500/60',
    accent: 'text-orange-400',
  },
];

export default function CategoryPicker({ onSelect }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-1">Choose a Category</h2>
      <p className="text-zinc-400 mb-8">What kind of trivia game are you making?</p>

      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`group bg-gradient-to-br ${cat.color} border rounded-xl p-6 text-left transition-all hover:scale-[1.01]`}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">{cat.emoji}</span>
              <div>
                <div className={`text-xl font-bold ${cat.accent}`}>{cat.id}</div>
                <div className="text-zinc-400 text-sm mt-0.5">{cat.description}</div>
              </div>
              <div className="ml-auto text-zinc-600 group-hover:text-white transition-colors text-xl">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
