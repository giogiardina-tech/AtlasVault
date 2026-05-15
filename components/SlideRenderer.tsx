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
  const isFightRound = format_type === 'civilization-fight' && slide_type === 'round';
  // Flag + empire rounds use top/bottom text layout so the image fills the middle
  const isFlagStyleRound = isFlagRound || isPartialFlagRound || isEmpireRound;

  const roundNum = (content.round_number ?? 1) as number;
  // Zoom is % of card width. Visible % of flag ≈ 100/zoom.
  // Offset (% of card) nudges the flag off-center so at least one edge bleeds out.
  // Round 1 → ~87% visible | Round 2 → ~75% | Round 3 → ~64% | Round 4 → ~50% | Round 5 → ~35%
  const CROP_CONFIGS = [
    { zoom: 115, left: '-5%',  top: '-10%' },
    { zoom: 134, left: '-15%', top: '-12%' },
    { zoom: 157, left: '-20%', top: '-15%' },
    { zoom: 200, left: '-30%', top: '-20%' },
    { zoom: 285, left: '-45%', top: '-30%' },
  ];
  const cropCfg = isPartialFlagRound ? CROP_CONFIGS[Math.min(roundNum - 1, 4)] : CROP_CONFIGS[0];

  const slideBg = '#0a0a0a';

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
        backgroundSize: isFlagRound ? 'contain' : 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
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
        {/* Stronger overlay so text is instantly readable over any image */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.8) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '160px 72px', textAlign: 'center', gap: 0 }}>
          {/* Category pill — small, top anchor */}
          <span style={{ background: '#ff2d55', color: 'white', fontSize: 30, fontWeight: 800, padding: '10px 32px', borderRadius: 100, letterSpacing: 4, marginBottom: 52, textTransform: 'uppercase' }}>
            {content.category}
          </span>
          {/* MASSIVE title — must read in under 1 second */}
          <h1 style={{ color: 'white', fontSize: 124, fontWeight: 900, lineHeight: 1.0, marginBottom: 52, textShadow: '0 4px 32px rgba(0,0,0,0.95)', letterSpacing: -2 }}>
            {content.title}
          </h1>
          {/* Hook — bold, punchy, not italic */}
          <p style={{ color: '#00f2ea', fontSize: 62, fontWeight: 800, lineHeight: 1.25, textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}>
            {content.hook}
          </p>
          {/* Watermark only */}
          <div style={{ position: 'absolute', bottom: 72, color: 'rgba(255,255,255,0.25)', fontSize: 24, letterSpacing: 6, fontWeight: 600 }}>
            ATLASVAULT
          </div>
        </div>
      </div>
    );
  }

  // PARTIAL FLAG ROUNDS: dark cinematic bg + centered card with cropped flag
  if (isPartialFlagRound) {
    const tierColors: Record<string, string> = { easy: '#22c55e', medium: '#f59e0b', hard: '#f97316', impossible: '#ef4444' };
    const tierColor = tierColors[content.difficulty as string] ?? 'rgba(255,255,255,0.4)';
    return (
      <div style={containerStyle}>
        {/* Dark cinematic background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #080810 0%, #0f0f1e 50%, #080810 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,242,234,0.06) 0%, transparent 65%)' }} />

        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '220px 80px 420px' }}>
          {/* Round label + question */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ color: '#00f2ea', fontSize: 40, fontWeight: 800, letterSpacing: 4, marginBottom: 20 }}>
              ROUND {content.round_number}
            </div>
            <h2 style={{ color: 'white', fontSize: 58, fontWeight: 800, lineHeight: 1.2, textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}>
              Which country does<br />this flag belong to?
            </h2>
          </div>

          {/* Cropped flag card */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div style={{
              width: 880, height: 540,
              borderRadius: 28,
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.12)',
              boxShadow: '0 0 100px rgba(0,242,234,0.12), 0 40px 80px rgba(0,0,0,0.7)',
              position: 'relative',
              background: '#111120',
            }}>
              {image_path && (
                <img
                  src={image_path}
                  style={{
                    position: 'absolute',
                    width: `${cropCfg.zoom}%`,
                    height: 'auto',
                    left: cropCfg.left,
                    top: cropCfg.top,
                  }}
                />
              )}
            </div>
          </div>

          {/* Difficulty + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, marginTop: 48 }}>
            {content.difficulty && (
              <span style={{ color: tierColor, fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
                {content.difficulty}
              </span>
            )}
            <div style={{ background: 'rgba(255,45,85,0.88)', borderRadius: 60, padding: '22px 68px', color: 'white', fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT YOUR ANSWER ↓
            </div>
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

  // FIGHT ROUNDS: subtle tinted panels so the image shows through
  if (isFightRound) {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.15) 72%, rgba(0,0,0,0.7) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '220px 80px 420px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ color: '#00f2ea', fontSize: 42, fontWeight: 800, letterSpacing: 4 }}>ROUND {content.round_number}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            <div style={{ background: 'rgba(20,0,5,0.55)', border: '2px solid rgba(255,45,85,0.55)', borderRadius: 20, padding: '36px 56px', width: '100%', textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: 'white', fontSize: 72, fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>{content.side_a}</p>
            </div>
            <div style={{ color: 'white', fontSize: 76, fontWeight: 900, letterSpacing: 8, textShadow: '0 2px 24px rgba(0,0,0,0.9)', marginBottom: 24 }}>VS</div>
            <div style={{ background: 'rgba(0,5,20,0.55)', border: '2px solid rgba(0,120,255,0.55)', borderRadius: 20, padding: '36px 56px', width: '100%', textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: 72, fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>{content.side_b}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,45,85,0.85)', borderRadius: 60, padding: '20px 64px', color: 'white', fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT YOUR PICK ↓
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
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '220px 80px 520px', textAlign: 'center' }}>
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

          <div style={{ position: 'absolute', bottom: 420, left: 80, right: 80, display: 'flex', justifyContent: 'center' }}>
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

    // FIGHT MODE — winner + win percentages
    if (scoringType === 'fight' && content.side_a && content.side_b) {
      const aWins = content.winner === content.side_a;
      const aPercent = content.side_a_percent ?? 50;
      const bPercent = content.side_b_percent ?? 50;
      return (
        <div style={containerStyle}>
          <div style={bgStyle} />
          <div style={overlayStyle} />
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
            {header}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ color: '#ffd700', fontSize: 52, fontWeight: 900, textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>
                ★ {content.winner} WINS
              </span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: 28, padding: '52px 60px', display: 'flex', flexDirection: 'column', gap: 44, marginBottom: 40 }}>
              {/* Side A */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ color: aWins ? '#ffd700' : 'rgba(255,255,255,0.75)', fontSize: 48, fontWeight: aWins ? 900 : 600, lineHeight: 1 }}>{content.side_a}</span>
                  <span style={{ color: aWins ? '#ffd700' : 'rgba(255,255,255,0.6)', fontSize: 52, fontWeight: 800 }}>{aPercent}%</span>
                </div>
                <div style={{ height: 22, background: 'rgba(255,255,255,0.1)', borderRadius: 11, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${aPercent}%`, background: aWins ? '#ff2d55' : 'rgba(255,45,85,0.4)', borderRadius: 11, transition: 'width 0.6s ease' }} />
                </div>
              </div>
              {/* Side B */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ color: !aWins ? '#ffd700' : 'rgba(255,255,255,0.75)', fontSize: 48, fontWeight: !aWins ? 900 : 600, lineHeight: 1 }}>{content.side_b}</span>
                  <span style={{ color: !aWins ? '#ffd700' : 'rgba(255,255,255,0.6)', fontSize: 52, fontWeight: 800 }}>{bPercent}%</span>
                </div>
                <div style={{ height: 22, background: 'rgba(255,255,255,0.1)', borderRadius: 11, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bPercent}%`, background: !aWins ? '#0078ff' : 'rgba(0,120,255,0.4)', borderRadius: 11 }} />
                </div>
              </div>
            </div>
            {content.fun_fact && (
              <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 38, lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center' }}>
                "{content.fun_fact}"
              </p>
            )}
          </div>
        </div>
      );
    }

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

    // DIFFICULTY MODE — answer is the star of the show
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
          {header}
          {questionLine}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 28, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: 24, padding: '56px 60px' }}>
            {/* Answer first and massive */}
            <div style={{ color: '#00f2ea', fontSize: 130, fontWeight: 900, lineHeight: 1.0, textShadow: '0 0 80px rgba(0,242,234,0.5)', letterSpacing: -2 }}>
              {content.correct_answer}
            </div>
            {/* Tier badge below answer */}
            {tier && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {Array.from({ length: tier.stars }).map((_, i) => (
                  <span key={i} style={{ fontSize: 40, color: tier.color }}>★</span>
                ))}
                {Array.from({ length: 4 - tier.stars }).map((_, i) => (
                  <span key={i} style={{ fontSize: 40, color: 'rgba(255,255,255,0.15)' }}>★</span>
                ))}
                <span style={{ color: tier.color, fontSize: 30, fontWeight: 800, marginLeft: 10, letterSpacing: 3 }}>{tier.label}</span>
              </div>
            )}
            {content.fun_fact && (
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 36, lineHeight: 1.5, fontStyle: 'italic', maxWidth: 860 }}>
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
