'use client';
import { Slide } from '@/lib/types';

interface Props {
  slide: Slide;
  scale?: number;
  format_type?: string;
}

export default function SlideRenderer({ slide, scale = 1, format_type }: Props) {
  const { slide_type, content, image_path } = slide;
  const W = 1080;
  const H = 1920;
  const isFlagRound = format_type === 'guess-the-flag' && slide_type === 'round';
  const isPartialFlagRound = format_type === 'partial-flag' && slide_type === 'round';
  const isEmpireRound = format_type === 'guess-the-empire' && slide_type === 'round';
  // Flag + empire rounds use top/bottom text layout so the image fills the middle
  const isFlagStyleRound = isFlagRound || isPartialFlagRound || isEmpireRound;

  // Partial-flag: progressively zoom into the flag centre each round
  const PARTIAL_ZOOMS = [100, 140, 200, 320, 520]; // percent of element width
  const roundNum = (content.round_number ?? 1) as number;
  const partialZoom = isPartialFlagRound ? PARTIAL_ZOOMS[Math.min(roundNum - 1, 4)] : 100;

  // Partial-flag uses a neutral grey bg so the flag edges don't bleed into dark
  const slideBg = isPartialFlagRound ? '#c8c8c8' : '#0a0a0a';

  const containerStyle: React.CSSProperties = {
    width: W,
    height: H,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
    backgroundColor: slideBg,
    flexShrink: 0,
  };

  const bgStyle: React.CSSProperties = image_path
    ? {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${image_path})`,
        backgroundSize: isPartialFlagRound
          ? `${partialZoom}%`      // zoom into centre of flag
          : isFlagRound
          ? 'contain'              // full flag, padding visible
          : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {
        position: 'absolute',
        inset: 0,
        background: isPartialFlagRound
          ? slideBg
          : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      slide_type === 'title'
        // Title: stronger centre fade so text pops, but image still vivid top/bottom
        ? 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.7) 100%)'
        // Other slides: darken only top strip (header) and bottom strip (CTA), keep middle image visible
        : 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.7) 100%)',
  };

  if (slide_type === 'title') {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 80px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', borderRadius: 32, padding: '80px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
            <span style={{ background: '#ff2d55', color: 'white', fontSize: 36, fontWeight: 700, padding: '8px 24px', borderRadius: 8, letterSpacing: 3, marginBottom: 48 }}>
              {content.category?.toUpperCase()}
            </span>
            <h1 style={{ color: 'white', fontSize: 96, fontWeight: 900, lineHeight: 1.05, marginBottom: 48, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
              {content.title}
            </h1>
            <p style={{ color: '#00f2ea', fontSize: 52, fontWeight: 500, lineHeight: 1.3, fontStyle: 'italic' }}>
              {content.hook}
            </p>
            {content.subtitle && (
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 36, marginTop: 36 }}>{content.subtitle}</p>
            )}
          </div>
          <div style={{ position: 'absolute', bottom: 80, color: 'rgba(255,255,255,0.4)', fontSize: 28, letterSpacing: 4 }}>
            ATLASVAULT
          </div>
        </div>
      </div>
    );
  }

  // FLAG / EMPIRE ROUNDS: image fills the middle — question at top, CTA at bottom
  // Top panel starts at 220px (below TikTok's top chrome ~180px)
  // Bottom CTA ends at 420px from bottom (above TikTok's bottom chrome ~380px)
  if (isFlagStyleRound) {
    const questionFontSize = isEmpireRound ? 54 : 72;
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.8) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Top: round label + question — starts at 220px to clear TikTok top chrome */}
          <div style={{ paddingTop: 220, paddingLeft: 80, paddingRight: 80 }}>
            <div style={{ background: 'rgba(0,0,0,0.72)', borderRadius: 24, padding: '36px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ color: '#00f2ea', fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>
                  ROUND {content.round_number}
                </span>
                {content.difficulty && (
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', fontSize: 26, padding: '6px 18px', borderRadius: 40, textTransform: 'uppercase', letterSpacing: 2 }}>
                    {content.difficulty}
                  </span>
                )}
              </div>
              <h2 style={{ color: 'white', fontSize: questionFontSize, fontWeight: 800, lineHeight: 1.15 }}>
                {content.question}
              </h2>
            </div>
          </div>

          {/* Middle: image shows through */}
          <div style={{ flex: 1 }} />

          {/* Bottom CTA — ends at 420px from bottom to clear TikTok bottom chrome */}
          <div style={{ paddingBottom: 420, paddingLeft: 80, paddingRight: 80, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,45,85,0.9)', borderRadius: 60, padding: '20px 64px', color: 'white', fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT YOUR ANSWER ↓
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide_type === 'round') {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 80px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: 28, padding: '60px 72px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
              <span style={{ color: '#00f2ea', fontSize: 42, fontWeight: 800, letterSpacing: 4 }}>
                ROUND {content.round_number}
              </span>
              {content.difficulty && (
                <span style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', fontSize: 28, padding: '6px 20px', borderRadius: 40, textTransform: 'uppercase', letterSpacing: 2 }}>
                  {content.difficulty}
                </span>
              )}
            </div>

            <h2 style={{ color: 'white', fontSize: 80, fontWeight: 800, lineHeight: 1.1, marginBottom: content.clues || content.events ? 48 : 0 }}>
              {content.question}
            </h2>

            {content.clues && (
              <div style={{ textAlign: 'left', width: '100%' }}>
                {content.clues.map((clue, i) => (
                  <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                    <span style={{ color: '#ff2d55', fontSize: 36, fontWeight: 700, minWidth: 40 }}>{i + 1}.</span>
                    <span style={{ color: 'white', fontSize: 36, lineHeight: 1.4 }}>{clue}</span>
                  </div>
                ))}
              </div>
            )}

            {content.events && (
              <div style={{ textAlign: 'left', width: '100%' }}>
                {content.events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-start' }}>
                    <span style={{ color: '#00f2ea', fontSize: 36, fontWeight: 700, background: 'rgba(0,242,234,0.15)', borderRadius: 8, padding: '4px 16px' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ color: 'white', fontSize: 36, lineHeight: 1.4 }}>{ev}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'absolute', bottom: 100, left: 80, right: 80, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,45,85,0.85)', borderRadius: 60, padding: '18px 60px', color: 'white', fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT YOUR ANSWER ↓
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide_type === 'reveal') {
    const scoringType = content.scoring_type || (content.answers && content.answers.length > 1 ? 'pointless' : 'difficulty');

    const tierConfig: Record<string, { label: string; color: string; stars: number }> = {
      easy:       { label: 'EASY',       color: '#22c55e', stars: 1 },
      medium:     { label: 'MEDIUM',     color: '#f59e0b', stars: 2 },
      hard:       { label: 'HARD',       color: '#f97316', stars: 3 },
      impossible: { label: 'IMPOSSIBLE', color: '#ef4444', stars: 4 },
    };
    const tier = tierConfig[content.difficulty_tier || 'medium'];

    const header = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <span style={{ color: '#00f2ea', fontSize: 36, fontWeight: 800, letterSpacing: 4, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
          ROUND {content.round_number}
        </span>
        <span style={{ color: '#ff2d55', fontSize: 36, fontWeight: 800, letterSpacing: 4, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>REVEAL</span>
      </div>
    );

    const questionLine = (
      <p style={{ color: 'white', fontSize: 38, marginBottom: 28, lineHeight: 1.3, fontWeight: 600, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
        {content.question}
      </p>
    );

    // POINTLESS MODE — multiple answers with bar chart
    if (scoringType === 'pointless' && content.answers && content.answers.length > 0) {
      const maxPoints = Math.max(...content.answers.map((a) => a.points), 1);
      return (
        <div style={containerStyle}>
          <div style={bgStyle} />
          <div style={overlayStyle} />
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
            {header}
            {questionLine}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', borderRadius: 24, padding: '48px 48px' }}>
              {content.answers.map((ans, i) => {
                const barWidth = Math.max(4, (ans.points / maxPoints) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: ans.is_pointless ? '#00f2ea' : 'white', fontSize: 40, fontWeight: ans.is_pointless ? 800 : 600 }}>
                        {ans.text}{ans.is_pointless ? ' ★' : ''}
                      </span>
                      <span style={{ color: ans.is_pointless ? '#00f2ea' : 'rgba(255,255,255,0.7)', fontSize: 40, fontWeight: 700 }}>
                        {ans.is_pointless ? 'POINTLESS' : `${ans.points}pts`}
                      </span>
                    </div>
                    <div style={{ height: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: ans.is_pointless ? '#00f2ea' : '#ff2d55', borderRadius: 7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 28, textAlign: 'center', marginTop: 28 }}>
              Lower score = rarer answer = better
            </p>
          </div>
        </div>
      );
    }

    // POSITION MODE — historical order with partial credit
    if (scoringType === 'position' && content.correct_order && content.correct_order.length > 0) {
      return (
        <div style={containerStyle}>
          <div style={bgStyle} />
          <div style={overlayStyle} />
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
            {header}
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 38, marginBottom: 32, fontWeight: 600 }}>Correct chronological order:</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', borderRadius: 24, padding: '48px 48px' }}>
              {content.correct_order.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <span style={{ color: '#00f2ea', fontSize: 44, fontWeight: 900, minWidth: 48 }}>{i + 1}</span>
                  <div>
                    <span style={{ color: 'white', fontSize: 44, fontWeight: 700 }}>{item.event}</span>
                    <span style={{ color: '#ff2d55', fontSize: 38, fontWeight: 800, marginLeft: 20 }}>{item.year}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 36, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,242,234,0.2)', borderRadius: 20, padding: '32px 40px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 32, marginBottom: 12 }}>Score yourself — 1 point per correct position</p>
              <p style={{ color: '#00f2ea', fontSize: 36, fontWeight: 700 }}>
                {content.max_points || 4}/{content.max_points || 4} = perfect
              </p>
            </div>
          </div>
        </div>
      );
    }

    // DIFFICULTY MODE — single correct answer with tier badge
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
          {header}
          {questionLine}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 36, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', borderRadius: 24, padding: '60px 60px' }}>
            {tier && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {Array.from({ length: tier.stars }).map((_, i) => (
                  <span key={i} style={{ fontSize: 52, color: tier.color }}>★</span>
                ))}
                {Array.from({ length: 4 - tier.stars }).map((_, i) => (
                  <span key={i} style={{ fontSize: 52, color: 'rgba(255,255,255,0.2)' }}>★</span>
                ))}
                <span style={{ color: tier.color, fontSize: 40, fontWeight: 800, marginLeft: 16, letterSpacing: 3 }}>{tier.label}</span>
              </div>
            )}
            <div style={{ color: '#00f2ea', fontSize: 96, fontWeight: 900, lineHeight: 1.05, textShadow: '0 0 60px rgba(0,242,234,0.4)' }}>
              {content.correct_answer}
            </div>
            {content.clue_giveaway && (
              <div style={{ background: 'rgba(255,45,85,0.25)', border: '1px solid rgba(255,45,85,0.5)', borderRadius: 14, padding: '16px 36px' }}>
                <span style={{ color: '#ff2d55', fontSize: 34, fontWeight: 600 }}>Most people get it from {content.clue_giveaway}</span>
              </div>
            )}
            {content.fun_fact && (
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 38, lineHeight: 1.45, fontStyle: 'italic', maxWidth: 860 }}>
                "{content.fun_fact}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (slide_type === 'score') {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 80px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: 32, padding: '80px 72px', width: '100%' }}>
            <h1 style={{ color: 'white', fontSize: 100, fontWeight: 900, lineHeight: 1, marginBottom: 56 }}>
              {content.title}
            </h1>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '48px 52px' }}>
              {content.scoring_summary?.split('|').map((part, i) => (
                <p key={i} style={{ color: i === 0 ? '#00f2ea' : 'rgba(255,255,255,0.85)', fontSize: 44, lineHeight: 1.6, fontWeight: i === 0 ? 700 : 400 }}>
                  {part.trim()}
                </p>
              ))}
            </div>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 32, marginTop: 60, letterSpacing: 4 }}>
            FOLLOW FOR MORE
          </p>
        </div>
      </div>
    );
  }

  return <div style={containerStyle} />;
}
