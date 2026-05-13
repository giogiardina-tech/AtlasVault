'use client';
import { useRef, useState } from 'react';
import { Game, Slide } from '@/lib/types';
import SlideRenderer from './SlideRenderer';

interface Props {
  game: Game;
  slides: Slide[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSlideSelect: (index: number) => void;
  onRegenerate: (slideId: string, prompt: string) => void;
  onSlidesChange: (slides: Slide[]) => void;
}

const PREVIEW_SCALE = 0.25;

export default function SlidePreview({ game, slides, currentIndex, onPrev, onNext, onSlideSelect, onRegenerate, onSlidesChange }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const renderContainerRef = useRef<HTMLDivElement>(null);

  const slide = slides[currentIndex];

  const exportSlides = async (asZip: boolean) => {
    setExporting(true);
    setExportProgress(0);

    if (asZip) {
      const res = await fetch(`/api/export/${game.id}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${game.title.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setExporting(false);
      return;
    }

    // Individual PNG download — download each image directly
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (s.image_path) {
        const res = await fetch(s.image_path);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `slide_${String(i + 1).padStart(2, '0')}_${s.slide_type}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 200));
      }
      setExportProgress(Math.round(((i + 1) / slides.length) * 100));
    }

    setExporting(false);
    setExportProgress(0);
  };

  const handleRegenerate = () => {
    setEditingPrompt(true);
    setPromptValue(slide.image_prompt);
  };

  const confirmRegenerate = () => {
    setEditingPrompt(false);
    onRegenerate(slide.id, promptValue);
  };

  const readyCount = slides.filter((s) => s.image_status === 'ready').length;

  return (
    <div className="flex gap-6 h-full">
      {/* Thumbnail strip */}
      <div className="w-24 flex-shrink-0 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '70vh' }}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onSlideSelect(i)}
            className={`w-full rounded overflow-hidden border-2 transition-all ${
              i === currentIndex ? 'border-tk-red' : 'border-transparent hover:border-white/20'
            }`}
          >
            <div className="relative" style={{ aspectRatio: '9/16', background: '#0a0a0a' }}>
              {s.image_path ? (
                <img src={s.image_path} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-zinc-700 text-xs">{s.slide_index + 1}</span>
                </div>
              )}
              {s.image_status === 'failed' && (
                <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                  <span className="text-red-400 text-xs">✗</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Main preview */}
      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-4 w-full">
          <button onClick={onPrev} disabled={currentIndex === 0} className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors text-xl">←</button>
          <span className="text-zinc-400 text-sm flex-1 text-center">Slide {currentIndex + 1} of {slides.length} — {slide.slide_type}</span>
          <button onClick={onNext} disabled={currentIndex === slides.length - 1} className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors text-xl">→</button>
        </div>

        {/* Phone frame */}
        <div className="relative" style={{ width: 1080 * PREVIEW_SCALE, height: 1920 * PREVIEW_SCALE }}>
          <div className="rounded-2xl overflow-hidden" style={{ width: '100%', height: '100%' }}>
            <SlideRenderer slide={slide} scale={PREVIEW_SCALE} format_type={game.format_type} />
          </div>
        </div>

        {/* Slide controls */}
        <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
          {editingPrompt ? (
            <div>
              <textarea
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                rows={3}
                className="w-full bg-tk-card border border-tk-border rounded-lg px-3 py-2 text-xs text-zinc-300 resize-none focus:outline-none focus:border-white/30 mb-2"
              />
              <div className="flex gap-2">
                <button onClick={confirmRegenerate} className="flex-1 py-2 rounded-lg bg-tk-red text-white text-xs font-semibold hover:bg-red-500 transition-colors">
                  Regenerate
                </button>
                <button onClick={() => setEditingPrompt(false)} className="py-2 px-4 rounded-lg border border-tk-border text-zinc-400 text-xs hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleRegenerate} className="w-full py-2 rounded-lg border border-tk-border text-zinc-400 hover:text-white hover:border-white/20 text-xs transition-colors">
              Regenerate this slide
            </button>
          )}
        </div>

        {/* Export buttons */}
        <div className="mt-6 border-t border-tk-border pt-6 w-full">
          <p className="text-xs text-zinc-500 mb-3 text-center">{readyCount}/{slides.length} slides ready</p>
          <div className="flex gap-3">
            <button
              onClick={() => exportSlides(true)}
              disabled={exporting || readyCount === 0}
              className="flex-1 py-3 rounded-xl bg-tk-red text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-40 transition-colors"
            >
              {exporting ? `Exporting ${exportProgress}%` : 'Download ZIP'}
            </button>
            <button
              onClick={() => exportSlides(false)}
              disabled={exporting || readyCount === 0}
              className="flex-1 py-3 rounded-xl border border-tk-border text-zinc-300 text-sm hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
            >
              Individual PNGs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
