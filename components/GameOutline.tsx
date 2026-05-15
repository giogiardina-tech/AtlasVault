'use client';
import { useState } from 'react';
import { Game, Slide } from '@/lib/types';

interface Props {
  game: Game;
  slides: Slide[];
  scoringSystem: string;
  onSlidesChange: (slides: Slide[]) => void;
  onGenerate: () => void;
  onBack: () => void;
}

export default function GameOutline({ game, slides, scoringSystem, onSlidesChange, onGenerate, onBack }: Props) {
  const [editingSlide, setEditingSlide] = useState<string | null>(null);

  const roundSlides = slides.filter((s) => s.slide_type === 'round');
  const revealSlides = slides.filter((s) => s.slide_type === 'reveal');

  const updateImagePrompt = async (slide: Slide, newPrompt: string) => {
    await fetch(`/api/games/${game.id}/slides`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slide_id: slide.id, image_prompt: newPrompt }),
    });
    onSlidesChange(slides.map((s) => (s.id === slide.id ? { ...s, image_prompt: newPrompt } : s)));
  };

  return (
    <div className="max-w-2xl mx-auto pb-32">
      <button onClick={onBack} className="text-zinc-500 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
        ← Back
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight">"{game.title}"</h2>
          <p className="text-zinc-400 text-sm mt-1 italic">"{game.hook}"</p>
          <p className="text-zinc-500 text-xs mt-2">{scoringSystem}</p>
        </div>
        <span className="text-xs bg-tk-card border border-tk-border text-zinc-400 px-2 py-1 rounded shrink-0 ml-4">
          {slides.length} slides
        </span>
      </div>

      <div className="space-y-4 mb-8">
        {roundSlides.map((round, i) => {
          const reveal = revealSlides.find((r) => r.content.round_number === round.content.round_number);

          return (
            <div key={round.id} className="bg-tk-card border border-tk-border rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-tk-cyan bg-tk-cyan/10 px-2 py-0.5 rounded">
                    Round {i + 1}
                  </span>
                  <span className="text-xs text-zinc-600 capitalize">{round.content.difficulty}</span>
                </div>
                <p className="text-white text-sm font-medium">{round.content.question}</p>

                {round.content.clues && (
                  <div className="mt-2 space-y-1">
                    {round.content.clues.map((clue, ci) => (
                      <p key={ci} className="text-zinc-500 text-xs">Clue {ci + 1}: {clue}</p>
                    ))}
                  </div>
                )}

                {round.content.events && (
                  <div className="mt-2 space-y-1">
                    {round.content.events.map((ev, ei) => (
                      <p key={ei} className="text-zinc-500 text-xs">• {ev}</p>
                    ))}
                  </div>
                )}
              </div>

              {reveal && (
                <div className="border-t border-tk-border bg-black/20 px-4 py-3">
                  <p className="text-xs text-zinc-600 mb-2">Answers:</p>
                  <div className="flex flex-wrap gap-2">
                    {reveal.content.answers?.map((ans, ai) => (
                      <span
                        key={ai}
                        className={`text-xs px-2 py-1 rounded ${
                          ans.is_pointless
                            ? 'bg-tk-cyan/20 text-tk-cyan border border-tk-cyan/30'
                            : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        {ans.text} {ans.is_pointless ? '★ Pointless' : `(${ans.points}pts)`}
                      </span>
                    ))}
                    {reveal.content.correct_answer && !reveal.content.answers && (
                      <span className="text-xs px-2 py-1 rounded bg-tk-cyan/20 text-tk-cyan border border-tk-cyan/30">
                        {reveal.content.correct_answer}
                      </span>
                    )}
                  </div>
                  {reveal.content.fun_fact && (
                    <p className="text-xs text-zinc-600 mt-2 italic">{reveal.content.fun_fact}</p>
                  )}
                </div>
              )}

              <div className="border-t border-tk-border px-4 py-2">
                {editingSlide === round.id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500">Image prompt:</p>
                    <textarea
                      defaultValue={round.image_prompt}
                      rows={3}
                      className="w-full bg-black/30 border border-tk-border rounded px-3 py-2 text-xs text-zinc-300 resize-none focus:outline-none focus:border-white/30"
                      onBlur={(e) => {
                        updateImagePrompt(round, e.target.value);
                        setEditingSlide(null);
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingSlide(round.id)}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Edit image prompt
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky generate button — always visible without scrolling */}
      <div className="fixed bottom-0 left-64 right-0 p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button
            onClick={onGenerate}
            className="w-full py-4 rounded-xl bg-tk-red text-white font-bold text-lg hover:bg-red-500 transition-colors shadow-2xl"
          >
            Generate Images →
          </button>
        </div>
      </div>
    </div>
  );
}
