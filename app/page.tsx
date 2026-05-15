'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import CategoryPicker from '@/components/CategoryPicker';
import TemplateSelector from '@/components/TemplateSelector';
import GameIdeas from '@/components/GameIdeas';
import GameOutline from '@/components/GameOutline';
import ImageGenerator from '@/components/ImageGenerator';
import SlidePreview from '@/components/SlidePreview';
import GameCard from '@/components/GameCard';
import { Category, Game, GameDifficulty, GameIdea, Slide, Template } from '@/lib/types';

type AppView = 'dashboard' | 'library' | 'templates' | 'builder' | 'game';
type BuilderStep = 'category' | 'template' | 'difficulty' | 'ideas' | 'outline' | 'empire-choices' | 'generating' | 'preview';

export default function Home() {
  const [view, setView] = useState<AppView>('dashboard');
  const [step, setStep] = useState<BuilderStep>('category');
  const [games, setGames] = useState<Game[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builder state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('medium');
  const [ideas, setIdeas] = useState<GameIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [scoringSystem, setScoringSystem] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  // Empire game: user picks map or feature image per round before generation
  const [empireChoices, setEmpireChoices] = useState<Record<string, 'map' | 'feature'>>({});

  // Viewed game (from library)
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [viewingSlides, setViewingSlides] = useState<Slide[]>([]);
  const [viewPreviewIndex, setViewPreviewIndex] = useState(0);

  useEffect(() => {
    fetchGames();
    fetchTemplates();
  }, []);

  const fetchGames = async () => {
    const res = await fetch('/api/games');
    const data = await res.json();
    setGames(data);
  };

  const fetchTemplates = async () => {
    const res = await fetch('/api/templates');
    const data = await res.json();
    setTemplates(data);
  };

  const startBuilder = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setIdeas([]);
    setCurrentGame(null);
    setSlides([]);
    setScoringSystem('');
    setPreviewIndex(0);
    setError(null);
    setView('builder');
  };

  const fetchIdeas = useCallback(async (template: Template, categoryOverride?: Category, difficultyOverride?: GameDifficulty) => {
    const cat = categoryOverride ?? selectedCategory;
    const diff = difficultyOverride ?? selectedDifficulty;
    setIdeasLoading(true);
    setIdeas([]);
    try {
      const res = await fetch('/api/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cat,
          format_type: template.format_type,
          template_name: template.name,
          difficulty: diff,
        }),
      });
      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch {
      setError('Failed to generate ideas. Check your API key.');
    }
    setIdeasLoading(false);
  }, [selectedCategory, selectedDifficulty]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep('template');
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setStep('ideas');
    fetchIdeas(template);
  };

  const handleIdeaSelect = async (idea: GameIdea, difficulty: GameDifficulty = 'medium') => {
    setSelectedDifficulty(difficulty);
    setLoading(true);
    setError(null);
    setStep('outline');
    try {
      const res = await fetch('/api/generate/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          format_type: selectedTemplate!.format_type,
          template_id: selectedTemplate!.id,
          title: idea.title,
          hook: idea.hook,
          difficulty: selectedDifficulty,
        }),
      });
      const data = await res.json();
      setCurrentGame(data.game);
      setSlides(data.slides);
      setScoringSystem(data.scoring_system || '');
      await fetchGames();
    } catch {
      setError('Failed to generate game. Check your API key.');
    }
    setLoading(false);
  };

  const handleGenerateImages = () => {
    if (selectedTemplate?.format_type === 'guess-the-empire') {
      const defaultChoices: Record<string, 'map' | 'feature'> = {};
      slides.filter((s) => s.slide_type === 'round').forEach((s) => {
        defaultChoices[s.id] = 'feature';
      });
      setEmpireChoices(defaultChoices);
      setStep('empire-choices');
    } else {
      setStep('generating');
    }
  };

  const handleEmpireChoicesConfirm = async () => {
    if (!currentGame) return;
    setLoading(true);
    const roundSlides = slides.filter((s) => s.slide_type === 'round');
    await Promise.all(roundSlides.map(async (s) => {
      const choice = empireChoices[s.id] ?? 'feature';
      const prompt = choice === 'map' ? s.content.map_prompt : s.content.feature_prompt;
      if (!prompt) return;
      await fetch(`/api/games/${currentGame.id}/slides`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide_id: s.id, image_prompt: prompt }),
      });
      setSlides((prev) => prev.map((sl) => sl.id === s.id ? { ...sl, image_prompt: prompt } : sl));
    }));
    setLoading(false);
    setStep('generating');
  };

  const handleGenerationProgress = (updatedSlides: Slide[]) => {
    setSlides(updatedSlides);
  };

  const handleGenerationComplete = () => {
    setStep('preview');
    setPreviewIndex(0);
    fetchGames();
  };

  const handleRegenerateSlide = async (slideId: string, prompt: string) => {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide || !currentGame) return;

    setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, image_status: 'generating' } : s)));

    const res = await fetch('/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide_id: slideId,
        game_id: currentGame.id,
        image_prompt: prompt,
        slide_index: slide.slide_index,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Image generation failed');
    const ts = Date.now();
    setSlides((prev) =>
      prev.map((s) =>
        s.id === slideId
          ? { ...s, image_path: `${data.image_path}?t=${ts}`, image_status: 'ready', image_prompt: prompt }
          : s
      )
    );
  };

  const openGame = async (game: Game) => {
    const res = await fetch(`/api/games/${game.id}/slides`);
    const data = await res.json();
    setViewingGame(game);
    setViewingSlides(data);
    setViewPreviewIndex(0);
    setView('game');
  };

  const deleteGame = async (id: string) => {
    await fetch('/api/games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleRegenerateViewSlide = async (slideId: string, prompt: string) => {
    if (!viewingGame) return;
    const slide = viewingSlides.find((s) => s.id === slideId);
    if (!slide) return;

    setViewingSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, image_status: 'generating' } : s)));

    const res = await fetch('/api/generate/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slide_id: slideId,
        game_id: viewingGame.id,
        image_prompt: prompt,
        slide_index: slide.slide_index,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Image generation failed');
    const ts = Date.now();
    setViewingSlides((prev) =>
      prev.map((s) =>
        s.id === slideId
          ? { ...s, image_path: `${data.image_path}?t=${ts}`, image_status: 'ready' }
          : s
      )
    );
  };

  const recentGames = games.slice(0, 6);

  return (
    <div className="flex min-h-screen bg-tk-dark">
      <Sidebar
        view={view}
        onNavigate={(v) => setView(v as AppView)}
        onNewGame={startBuilder}
      />

      <main className="ml-56 flex-1 min-h-screen">
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-zinc-500 mt-1">Your TikTok trivia content studio</p>
              </div>
              <button
                onClick={startBuilder}
                className="px-6 py-3 bg-tk-red text-white font-semibold rounded-xl hover:bg-red-500 transition-colors"
              >
                + New Game
              </button>
            </div>

            {recentGames.length > 0 && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Games</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {recentGames.map((game) => (
                    <GameCard key={game.id} game={game} onClick={() => openGame(game)} onDelete={deleteGame} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Start</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['Geography', 'Flags', 'History'] as Category[]).map((cat) => {
                  const catTemplates = templates.filter((t) => t.category === cat);
                  return (
                    <div key={cat} className="bg-tk-card border border-tk-border rounded-xl p-5">
                      <p className="text-white font-semibold mb-3">
                        {cat === 'Geography' ? '🌍' : cat === 'Flags' ? '🚩' : '🏛️'} {cat}
                      </p>
                      <div className="space-y-2">
                        {catTemplates.slice(0, 3).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              startBuilder();
                              setSelectedCategory(cat);
                              setSelectedTemplate(t);
                              setStep('ideas');
                              fetchIdeas(t, cat);
                            }}
                            className="w-full text-left text-sm text-zinc-400 hover:text-white py-1.5 border-b border-tk-border last:border-0 transition-colors"
                          >
                            {t.name} →
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* LIBRARY */}
        {view === 'library' && (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Library</h1>
            <p className="text-zinc-500 mb-8">All your saved games</p>

            {games.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-600 mb-4">No games yet</p>
                <button onClick={startBuilder} className="px-6 py-3 bg-tk-red text-white font-semibold rounded-xl hover:bg-red-500 transition-colors">
                  Create your first game
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} onClick={() => openGame(game)} onDelete={deleteGame} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES */}
        {view === 'templates' && (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
            <p className="text-zinc-500 mb-8">Reusable game formats — use any of these unlimited times</p>

            {(['Geography', 'Flags', 'History'] as Category[]).map((cat) => {
              const catTemplates = templates.filter((t) => t.category === cat);
              return (
                <div key={cat} className="mb-8">
                  <h2 className="text-lg font-semibold text-white mb-3">
                    {cat === 'Geography' ? '🌍' : cat === 'Flags' ? '🚩' : '🏛️'} {cat}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catTemplates.map((t) => (
                      <div key={t.id} className="bg-tk-card border border-tk-border rounded-xl p-5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-white font-semibold">{t.name}</p>
                          <p className="text-zinc-500 text-sm mt-1">{t.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(cat);
                            setSelectedTemplate(t);
                            setStep('ideas');
                            setView('builder');
                            fetchIdeas(t, cat);
                          }}
                          className="shrink-0 text-sm text-tk-red hover:text-red-400 font-semibold transition-colors"
                        >
                          Use →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BUILDER */}
        {view === 'builder' && (
          <div className="p-8 min-h-screen">
            {/* Step progress */}
            <div className="flex items-center gap-2 mb-8">
              {(['category', 'template', 'ideas', 'outline', 'generating', 'preview'] as BuilderStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${step === s ? 'bg-tk-red' : i < (['category','template','ideas','outline','generating','preview'] as BuilderStep[]).indexOf(step) ? 'bg-white/40' : 'bg-white/10'}`} />
                  {i < 5 && <div className="w-6 h-px bg-white/10" />}
                </div>
              ))}
              <span className="text-zinc-600 text-xs ml-2 capitalize">{step}</span>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {step === 'category' && (
              <CategoryPicker onSelect={handleCategorySelect} />
            )}

            {step === 'template' && selectedCategory && (
              <TemplateSelector
                category={selectedCategory}
                templates={templates}
                onSelect={handleTemplateSelect}
                onBack={() => setStep('category')}
              />
            )}

            {step === 'ideas' && selectedTemplate && (
              <GameIdeas
                ideas={ideas}
                loading={ideasLoading}
                templateName={selectedTemplate.name}
                onSelect={(idea, diff) => handleIdeaSelect(idea, diff)}
                onRegenerate={() => fetchIdeas(selectedTemplate)}
                onBack={() => setStep('template')}
              />
            )}

            {step === 'outline' && (
              <div>
                {loading ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-white/10 rounded w-2/3" />
                      <div className="h-4 bg-white/5 rounded w-1/2" />
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-24 bg-tk-card border border-tk-border rounded-xl" />
                      ))}
                    </div>
                  </div>
                ) : currentGame && (
                  <GameOutline
                    game={currentGame}
                    slides={slides}
                    scoringSystem={scoringSystem}
                    onSlidesChange={setSlides}
                    onGenerate={handleGenerateImages}
                    onBack={() => setStep('ideas')}
                  />
                )}
              </div>
            )}

            {step === 'empire-choices' && currentGame && (
              <div className="max-w-2xl mx-auto pb-32">
                <h2 className="text-xl font-bold text-white mb-2">Choose image style per round</h2>
                <p className="text-zinc-400 text-sm mb-6">Pick whether each empire is shown as a territory map or its most iconic landmark/feature.</p>
                <div className="space-y-4">
                  {slides.filter((s) => s.slide_type === 'round').map((s) => {
                    const revealSlide = slides.find((r) => r.slide_type === 'reveal' && r.content.round_number === s.content.round_number);
                    const empireName = revealSlide?.content.correct_answer ?? `Round ${s.content.round_number}`;
                    const choice = empireChoices[s.id] ?? 'feature';
                    return (
                      <div key={s.id} className="bg-tk-card border border-tk-border rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-xs text-zinc-500 uppercase tracking-widest">Round {s.content.round_number}</span>
                          <span className="text-white font-bold">{empireName}</span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setEmpireChoices((prev) => ({ ...prev, [s.id]: 'feature' }))}
                            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all border ${choice === 'feature' ? 'bg-tk-red border-tk-red text-white' : 'border-tk-border text-zinc-400 hover:text-white hover:border-white/20'}`}
                          >
                            🏛 Iconic Feature
                          </button>
                          <button
                            onClick={() => setEmpireChoices((prev) => ({ ...prev, [s.id]: 'map' }))}
                            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all border ${choice === 'map' ? 'bg-tk-red border-tk-red text-white' : 'border-tk-border text-zinc-400 hover:text-white hover:border-white/20'}`}
                          >
                            🗺 Territory Map
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Sticky confirm button */}
                <div className="fixed bottom-0 left-64 right-0 p-6 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none">
                  <div className="max-w-2xl mx-auto pointer-events-auto">
                    <button
                      onClick={handleEmpireChoicesConfirm}
                      disabled={loading}
                      className="w-full py-4 rounded-xl bg-tk-red text-white font-bold text-lg hover:bg-red-500 disabled:opacity-40 transition-colors shadow-2xl"
                    >
                      {loading ? 'Applying choices…' : 'Generate Images →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 'generating' && currentGame && (
              <ImageGenerator
                gameId={currentGame.id}
                slides={slides}
                onProgress={handleGenerationProgress}
                onComplete={handleGenerationComplete}
              />
            )}

            {step === 'preview' && currentGame && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-xl font-bold text-white flex-1">Preview — "{currentGame.title}"</h2>
                  <button onClick={() => setView('library')} className="text-sm text-zinc-500 hover:text-white transition-colors">
                    View in Library
                  </button>
                </div>
                <SlidePreview
                  game={currentGame}
                  slides={slides}
                  currentIndex={previewIndex}
                  onPrev={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  onNext={() => setPreviewIndex((i) => Math.min(slides.length - 1, i + 1))}
                  onSlideSelect={setPreviewIndex}
                  onRegenerate={handleRegenerateSlide}
                  onSlidesChange={setSlides}
                />
              </div>
            )}
          </div>
        )}

        {/* GAME DETAIL VIEW */}
        {view === 'game' && viewingGame && viewingSlides.length > 0 && (
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setView('library')} className="text-zinc-500 hover:text-white text-sm transition-colors">
                ← Library
              </button>
              <h2 className="text-xl font-bold text-white flex-1">"{viewingGame.title}"</h2>
              <span className="text-xs text-zinc-600">{viewingGame.category}</span>
            </div>
            <SlidePreview
              game={viewingGame}
              slides={viewingSlides}
              currentIndex={viewPreviewIndex}
              onPrev={() => setViewPreviewIndex((i) => Math.max(0, i - 1))}
              onNext={() => setViewPreviewIndex((i) => Math.min(viewingSlides.length - 1, i + 1))}
              onSlideSelect={setViewPreviewIndex}
              onRegenerate={handleRegenerateViewSlide}
              onSlidesChange={setViewingSlides}
            />
          </div>
        )}
      </main>
    </div>
  );
}
