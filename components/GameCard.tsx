'use client';
import { Game } from '@/lib/types';

interface Props {
  game: Game;
  onClick: () => void;
  onDelete: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  Geography: 'text-emerald-400',
  Flags: 'text-blue-400',
  History: 'text-amber-400',
};

export default function GameCard({ game, onClick, onDelete }: Props) {
  const date = new Date(game.created_at * 1000).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className="group bg-tk-card border border-tk-border hover:border-white/20 rounded-xl overflow-hidden cursor-pointer transition-all hover:bg-white/5"
      onClick={onClick}
    >
      <div className="aspect-[9/16] bg-black/40 relative flex items-center justify-center">
        <span className="text-5xl opacity-30">
          {game.category === 'Geography' ? '🌍' : game.category === 'Flags' ? '🚩' : '🏛️'}
        </span>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(game.id);
            }}
            className="bg-black/60 text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className={`text-xs font-semibold mb-1 ${categoryColors[game.category] || 'text-zinc-400'}`}>
          {game.category}
        </p>
        <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{game.title}</p>
        <p className="text-zinc-600 text-xs mt-1">{date}</p>
      </div>
    </div>
  );
}
