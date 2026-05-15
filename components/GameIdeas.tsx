'use client';
import { useState } from 'react';
import { GameDifficulty, GameIdea } from '@/lib/types';

interface Props {
  ideas: GameIdea[];
  loading: boolean;
  templateName: string;
  onSelect: (idea: GameIdea, difficulty: GameDifficulty) => void;
  onRegenerate: () => void;
  onBack: () => void;
}

const DIFFICULTIES: { value: GameDifficulty; label: string; color: string }[] = [
  { value: 'easy',   label: 'Easy',   color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'hard',   label: 'Hard',   color: '#ef4444' },
];

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600 text-xs w-14 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: i < score ? color : 'rgba(255,255,255,0.08)' }}
          />
        ))}
      </div>
      <span className="text-zinc-600 text-xs">{score}/10</span>
    </div>
  );
}

export default function GameIdeas({ ideas, loading, templateName, onSelect, onRegenerate, onBack }: Props) {
  const [cardDiffs, setCardDiffs] = useState<Record<number, GameDifficulty>>({});

  const getDiff = (i: number): GameDifficulty => cardDiffs[i] ?? 'medium';

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">Pick a Game</h2>
      <p className="text-zinc-400 mb-8">
        Choose an idea and set difficulty for <span className="text-white font-medium">{templateName}</span>
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-tk-card border border-tk-border rounded-xl p-5 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2 mb-4" />
              <div className="h-8 bg-white/5 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {ideas.map((idea, i) => {
              const diff = getDiff(i);
              const diffConfig = DIFFICULTIES.find(d => d.value === diff)!;
              return (
                <div key={i} className="bg-tk-card border border-tk-border hover:border-white/20 rounded-xl overflow-hidden transition-colors">
                  {/* Clickable idea area */}
                  <button
                    onClick={() => onSelect(idea, diff)}
                    className="w-full p-5 text-left hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-base leading-snug">"{idea.title}"</div>
                        <div className="text-zinc-500 text-sm mt-1.5 italic leading-snug">"{idea.hook}"</div>
                      </div>
                      <div className="text-zinc-600 group-hover:text-tk-red transition-colors mt-0.5 text-lg shrink-0">→</div>
                    </div>

                    {(idea.hook_score || idea.curiosity_score) && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        {idea.hook_score !== undefined && (
                          <ScoreBar label="Hook" score={idea.hook_score} color="#ff2d55" />
                        )}
                        {idea.curiosity_score !== undefined && (
                          <ScoreBar label="Curiosity" score={idea.curiosity_score} color="#00f2ea" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Difficulty selector */}
                  <div className="border-t border-tk-border px-5 py-3 flex items-center gap-3">
                    <span className="text-zinc-600 text-xs shrink-0">Difficulty:</span>
                    <div className="flex gap-1.5">
                      {DIFFICULTIES.map(d => (
                        <button
                          key={d.value}
                          onClick={(e) => { e.stopPropagation(); setCardDiffs(prev => ({ ...prev, [i]: d.value })); }}
                          className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
                          style={diff === d.value
                            ? { color: d.color, borderColor: `${d.color}55`, background: `${d.color}12` }
                            : { color: 'rgb(113,113,122)', borderColor: 'transparent' }
                          }
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <span className="ml-auto text-xs font-semibold" style={{ color: diffConfig.color }}>
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </span>
                  </div>
                </div>
              );
            })}
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
