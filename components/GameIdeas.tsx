'use client';
import { GameIdea } from '@/lib/types';

interface Props {
  ideas: GameIdea[];
  loading: boolean;
  templateName: string;
  onSelect: (idea: GameIdea) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

export default function GameIdeas({ ideas, loading, templateName, onSelect, onRegenerate, onBack }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">Pick a Game</h2>
      <p className="text-zinc-400 mb-8">
        AI-generated ideas for <span className="text-white font-medium">{templateName}</span>
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-tk-card border border-tk-border rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {ideas.map((idea, i) => (
              <button
                key={i}
                onClick={() => onSelect(idea)}
                className="group bg-tk-card border border-tk-border hover:border-tk-red/50 rounded-xl p-5 text-left transition-all hover:bg-white/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold text-base leading-snug">"{idea.title}"</div>
                    <div className="text-zinc-500 text-sm mt-2 italic">Hook: "{idea.hook}"</div>
                  </div>
                  <div className="text-zinc-600 group-hover:text-tk-red transition-colors mt-0.5 shrink-0 text-lg">→</div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={onRegenerate}
            className="w-full py-3 rounded-lg border border-tk-border text-zinc-400 hover:text-white hover:border-white/20 text-sm transition-colors"
          >
            Generate 4 more ideas
          </button>
        </>
      )}
    </div>
  );
}
