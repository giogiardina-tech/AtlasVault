'use client';
import { useEffect, useRef } from 'react';
import { Slide } from '@/lib/types';

interface Props {
  gameId: string;
  slides: Slide[];
  onProgress: (updatedSlides: Slide[]) => void;
  onComplete: () => void;
}

export default function ImageGenerator({ gameId, slides, onProgress, onComplete }: Props) {
  const runningRef = useRef(false);
  const slidesRef = useRef<Slide[]>(slides);
  slidesRef.current = slides;

  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    async function generate() {
      const current = [...slidesRef.current];
      for (let i = 0; i < current.length; i++) {
        const slide = current[i];
        if (slide.image_status === 'ready') continue;

        try {
          const res = await fetch('/api/generate/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slide_id: slide.id,
              game_id: gameId,
              image_prompt: slide.image_prompt,
              slide_index: slide.slide_index,
            }),
          });

          const data = await res.json();
          current[i] = {
            ...slide,
            image_path: data.image_path || null,
            image_status: data.success ? 'ready' : 'failed',
          };
          onProgress([...current]);
        } catch {
          current[i] = { ...slide, image_status: 'failed' };
          onProgress([...current]);
        }
      }
      onComplete();
    }

    generate();
  }, []);

  const done = slides.filter((s) => s.image_status === 'ready').length;
  const failed = slides.filter((s) => s.image_status === 'failed').length;
  const total = slides.length;
  const pct = Math.round((done / total) * 100);

  const statusIcon = (s: Slide) => {
    if (s.image_status === 'ready') return <span className="text-emerald-400">✓</span>;
    if (s.image_status === 'failed') return <span className="text-red-400">✗</span>;
    if (s.image_status === 'generating') return <span className="text-tk-cyan animate-pulse">◌</span>;
    return <span className="text-zinc-600">○</span>;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-1">Generating Images</h2>
      <p className="text-zinc-400 mb-6">DALL-E 3 is creating your TikTok slides…</p>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">{done} of {total} slides ready</span>
          <span className="text-white font-semibold">{pct}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-tk-red to-tk-cyan transition-all duration-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
        {failed > 0 && (
          <p className="text-red-400 text-xs mt-2">{failed} slide(s) failed — you can regenerate them in preview</p>
        )}
      </div>

      <div className="bg-tk-card border border-tk-border rounded-xl overflow-hidden">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-tk-border last:border-0"
          >
            <span className="text-sm w-4">{statusIcon(slide)}</span>
            <span className="text-xs text-zinc-500 w-12">#{slide.slide_index + 1}</span>
            <span className="text-sm text-zinc-300 capitalize">{slide.slide_type}</span>
            {slide.content.round_number && (
              <span className="text-xs text-zinc-600 ml-auto">Round {slide.content.round_number}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
