'use client';
import { useEffect, useRef } from 'react';
import { Slide } from '@/lib/types';

interface Props {
  gameId: string;
  slides: Slide[];
  onProgress: (updatedSlides: Slide[]) => void;
  onComplete: () => void;
}

// Only title (index 0) and round slides get generated images.
// Reveal slides reuse their paired round's image. Score slide uses a gradient.
function needsGeneration(slide: Slide) {
  return slide.slide_type === 'title' || slide.slide_type === 'round';
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

      // Build index→position map for fast lookup
      const byIndex = new Map(current.map((s, pos) => [s.slide_index, { slide: s, pos }]));

      for (let i = 0; i < current.length; i++) {
        const slide = current[i];
        if (!needsGeneration(slide)) continue;
        if (slide.image_status === 'ready') continue;

        // Round slides pair with the next slide (the reveal).
        // Title slide pairs with the score slide (index 11) to reuse the image.
        const pairedEntry = slide.slide_type === 'round'
          ? byIndex.get(slide.slide_index + 1)
          : slide.slide_type === 'title'
          ? byIndex.get(11)
          : undefined;

        try {
          const res = await fetch('/api/generate/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slide_id: slide.id,
              game_id: gameId,
              image_prompt: slide.image_prompt,
              slide_index: slide.slide_index,
              copy_to_slide_id: pairedEntry?.slide.id ?? null,
            }),
          });

          const data = await res.json();
          const imagePath = data.image_path || null;
          const status = data.success ? 'ready' : 'failed';

          current[i] = { ...slide, image_path: imagePath, image_status: status };

          // Mirror the result onto the paired slide in local state
          if (data.success && pairedEntry) {
            current[pairedEntry.pos] = {
              ...pairedEntry.slide,
              image_path: imagePath,
              image_status: 'ready',
            };
          }

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

  const generatable = slides.filter(needsGeneration);
  const done = generatable.filter((s) => s.image_status === 'ready').length;
  const failed = generatable.filter((s) => s.image_status === 'failed').length;
  const total = generatable.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusIcon = (s: Slide) => {
    if (!needsGeneration(s)) {
      // reveal and score slides mirror another slide's image
      return s.image_status === 'ready'
        ? <span className="text-emerald-400/60">✓</span>
        : <span className="text-zinc-600">◷</span>;
    }
    if (s.image_status === 'ready') return <span className="text-emerald-400">✓</span>;
    if (s.image_status === 'failed') return <span className="text-red-400">✗</span>;
    if (s.image_status === 'generating') return <span className="text-tk-cyan animate-pulse">◌</span>;
    return <span className="text-zinc-600">○</span>;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-1">Generating Images</h2>
      <p className="text-zinc-400 mb-1">Generating your TikTok slides…</p>
      <p className="text-zinc-600 text-xs mb-6">Generating {total} images — reveal slides reuse their round's image</p>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">{done} of {total} images ready</span>
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
            {slide.slide_type === 'reveal' && (
              <span className="text-xs text-zinc-600 ml-auto">reuses round image</span>
            )}
            {slide.slide_type === 'score' && (
              <span className="text-xs text-zinc-600 ml-auto">reuses intro image</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
