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
  const isFameBattleRound = format_type === 'fame-battle' && slide_type === 'round';
  const isFameBattleReveal = format_type === 'fame-battle' && slide_type === 'reveal';
  const isScrambleRound = (format_type === 'scrambled-capitals' || format_type === 'scrambled-countries') && slide_type === 'round';
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
    // Stack hook: split into 2-word chunks for maximum visual impact
    const hookWords = (content.hook || '').toUpperCase().split(' ');
    const hookStackLines: string[] = [];
    for (let i = 0; i < hookWords.length; i += 2) {
      hookStackLines.push(hookWords.slice(i, Math.min(i + 2, hookWords.length)).join(' '));
    }
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        {/* Radial vignette — lighter centre lets background breathe, dark edges frame text */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 78% 66% at 50% 44%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.88) 100%)' }} />
        {/* Top/bottom fade for badge and watermark readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.85) 100%)' }} />
        {/* Subtle cyan atmospheric glow at centre */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 52% 36% at 50% 44%, rgba(0,200,255,0.10) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '200px 80px', textAlign: 'center' }}>
          {/* Category badge */}
          <span style={{ background: '#ff2d55', color: 'white', fontSize: 28, fontWeight: 800, padding: '10px 32px', borderRadius: 100, letterSpacing: 4, marginBottom: 48, textTransform: 'uppercase' }}>
            {content.category}
          </span>

          {/* HOOK — massive stacked hero: each 2-word chunk on its own line */}
          <div style={{ marginBottom: 28 }}>
            {hookStackLines.map((line, i) => (
              <div key={i} style={{ color: 'white', fontSize: 112, fontWeight: 900, lineHeight: 0.96, letterSpacing: -3, textShadow: '0 4px 40px rgba(0,0,0,0.95)' }}>
                {line}
              </div>
            ))}
          </div>

          {/* Gold accent divider */}
          <div style={{ width: 72, height: 4, background: '#ffd700', borderRadius: 2, marginBottom: 28 }} />

          {/* Title — supporting text, smaller */}
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 46, fontWeight: 600, lineHeight: 1.2, textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
            {content.title}
          </p>

          {/* Watermark */}
          <div style={{ position: 'absolute', bottom: 72, color: 'rgba(255,255,255,0.22)', fontSize: 22, letterSpacing: 6, fontWeight: 600 }}>
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

  // FAME BATTLE ROUNDS: purple/gold tints for people matchups
  if (isFameBattleRound) {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.15) 28%, rgba(0,0,0,0.15) 72%, rgba(0,0,0,0.7) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '220px 80px 420px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ color: '#00f2ea', fontSize: 42, fontWeight: 800, letterSpacing: 4 }}>ROUND {content.round_number}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(30,0,60,0.55)', border: '2px solid rgba(160,80,255,0.55)', borderRadius: 20, padding: '36px 56px', width: '100%', textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: 'white', fontSize: 68, fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>{content.side_a}</p>
            </div>
            <div style={{ color: 'white', fontSize: 72, fontWeight: 900, letterSpacing: 6, textShadow: '0 2px 24px rgba(0,0,0,0.9)', marginBottom: 24 }}>VS</div>
            <div style={{ background: 'rgba(40,25,0,0.55)', border: '2px solid rgba(220,160,0,0.55)', borderRadius: 20, padding: '36px 56px', width: '100%', textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: 68, fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>{content.side_b}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,45,85,0.85)', borderRadius: 60, padding: '20px 64px', color: 'white', fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT WHO WAS MORE FAMOUS ↓
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SCRAMBLE ROUNDS: cinematic globe atmosphere + large spaced letters
  if (isScrambleRound) {
    const scrambled = content.scrambled || '';
    const len = scrambled.length;
    // Scaled up 20–25% for visual dominance
    const letterFontSize = len <= 5 ? 190 : len <= 7 ? 158 : len <= 9 ? 128 : 106;
    const letterSpacing  = len <= 5 ?  56 : len <= 7 ?  42 : len <= 9 ?  30 :  22;

    // Per-round background variety — light source + tint + glow
    const rn = ((content.round_number as number) - 1) % 5;
    const baseGrads = [
      'linear-gradient(165deg, #020d1a 0%, #030f1c 40%, #020b16 68%, #010810 100%)',
      'linear-gradient(195deg, #04081a 0%, #06091e 40%, #030a14 68%, #020812 100%)',
      'linear-gradient(175deg, #020d12 0%, #031510 40%, #021108 68%, #011008 100%)',
      'linear-gradient(155deg, #070410 0%, #0a0214 40%, #080310 68%, #060114 100%)',
      'linear-gradient(185deg, #0e0608 0%, #12040a 40%, #0e0508 68%, #0a0406 100%)',
    ];
    const lightSources = [
      'radial-gradient(ellipse 130% 90% at 115% 28%, rgba(0,100,180,0.30) 0%, rgba(0,50,100,0.06) 45%, transparent 65%)',
      'radial-gradient(ellipse 130% 90% at -15% 32%, rgba(40,80,200,0.28) 0%, rgba(20,40,100,0.06) 45%, transparent 65%)',
      'radial-gradient(ellipse 130% 90% at 50% -5%, rgba(0,160,120,0.26) 0%, rgba(0,80,60,0.06) 45%, transparent 65%)',
      'radial-gradient(ellipse 130% 90% at 120% 75%, rgba(100,30,180,0.26) 0%, rgba(50,15,90,0.06) 45%, transparent 65%)',
      'radial-gradient(ellipse 130% 90% at 30% 110%, rgba(160,80,20,0.24) 0%, rgba(80,40,10,0.06) 45%, transparent 65%)',
    ];
    const atmGlows = [
      'radial-gradient(ellipse 65% 45% at 50% 40%, rgba(0,130,200,0.18) 0%, transparent 70%)',
      'radial-gradient(ellipse 65% 45% at 40% 38%, rgba(40,80,200,0.16) 0%, transparent 70%)',
      'radial-gradient(ellipse 65% 45% at 50% 35%, rgba(0,160,120,0.16) 0%, transparent 70%)',
      'radial-gradient(ellipse 65% 45% at 60% 42%, rgba(100,30,180,0.15) 0%, transparent 70%)',
      'radial-gradient(ellipse 65% 45% at 45% 45%, rgba(160,80,20,0.14) 0%, transparent 70%)',
    ];
    const gridRotations = [0, 12, -8, 22, -16];

    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes avScrambleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-14px); }
          }
          @keyframes avShimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.70; }
          }
          @keyframes avAtmoPulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
          @keyframes avGlobeShift {
            0%   { transform: translate(0px, 0px) rotate(${gridRotations[rn]}deg); }
            33%  { transform: translate(8px, -6px) rotate(${gridRotations[rn]}deg); }
            66%  { transform: translate(-6px, 5px) rotate(${gridRotations[rn]}deg); }
            100% { transform: translate(0px, 0px) rotate(${gridRotations[rn]}deg); }
          }
        `}</style>

        {/* AI satellite image — dimmed to subtle texture */}
        <div style={{ ...bgStyle, filter: 'brightness(0.12) saturate(0.4)' }} />
        {/* Per-round base gradient */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: baseGrads[rn] }} />
        {/* Per-round directional light source */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: lightSources[rn] }} />

        {/* Globe arc grid — rotated + drifting per round */}
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: 'absolute', inset: 0, zIndex: 3, width: '100%', height: '100%', transformOrigin: 'center center', animation: 'avGlobeShift 22s ease-in-out infinite' }}
          preserveAspectRatio="xMidYMid slice"
        >
          <circle cx="540" cy="960" r="500" fill="none" stroke="rgba(0,160,255,0.07)" strokeWidth="1.5" />
          <ellipse cx="540" cy="618"  rx="390" ry="27" fill="none" stroke="rgba(0,160,255,0.065)" strokeWidth="1" />
          <ellipse cx="540" cy="840"  rx="490" ry="38" fill="none" stroke="rgba(0,160,255,0.050)" strokeWidth="1" />
          <ellipse cx="540" cy="960"  rx="500" ry="44" fill="none" stroke="rgba(0,160,255,0.055)" strokeWidth="1" />
          <ellipse cx="540" cy="1080" rx="490" ry="38" fill="none" stroke="rgba(0,160,255,0.048)" strokeWidth="1" />
          <ellipse cx="540" cy="1302" rx="390" ry="27" fill="none" stroke="rgba(0,160,255,0.038)" strokeWidth="1" />
          <ellipse cx="540" cy="960" rx="28"  ry="500" fill="none" stroke="rgba(0,160,255,0.055)" strokeWidth="1" />
          <ellipse cx="540" cy="960" rx="200" ry="500" fill="none" stroke="rgba(0,160,255,0.044)" strokeWidth="1" />
          <ellipse cx="540" cy="960" rx="380" ry="500" fill="none" stroke="rgba(0,160,255,0.038)" strokeWidth="1" />
          <ellipse cx="540" cy="960" rx="500" ry="500" fill="none" stroke="rgba(0,160,255,0.030)" strokeWidth="1" />
        </svg>

        {/* Per-round atmospheric glow */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: atmGlows[rn], animation: 'avAtmoPulse 8s ease-in-out infinite' }} />
        {/* Horizon depth */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'radial-gradient(ellipse 100% 40% at 50% 103%, rgba(0,60,100,0.55) 0%, transparent 55%)' }} />
        {/* Cinematic vignette */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'radial-gradient(ellipse 88% 68% at 50% 48%, transparent 0%, rgba(0,0,0,0.76) 100%)' }} />
        {/* Top/bottom safe-zone darken */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 7, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 14%, transparent 78%, rgba(0,0,0,0.75) 100%)' }} />

        {/* Content — tighter layout, card pushed high */}
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '180px 80px 420px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <span style={{ color: '#00f2ea', fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>
              ROUND {content.round_number}
            </span>
            {content.difficulty && (
              <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', fontSize: 26, padding: '6px 18px', borderRadius: 40, textTransform: 'uppercase', letterSpacing: 2 }}>
                {content.difficulty}
              </span>
            )}
          </div>
          {/* Question — enlarged */}
          <h2 style={{ color: 'white', fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginBottom: 0, textShadow: '0 2px 20px rgba(0,0,0,0.95)' }}>
            {content.question}
          </h2>
          {/* Scramble hero — flex pushes it above true centre */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 140 }}>
            <div style={{
              background: 'rgba(1,8,20,0.80)',
              border: '1px solid rgba(0,160,255,0.30)',
              borderRadius: 28,
              padding: '44px 68px',
              textAlign: 'center',
              boxShadow: '0 0 90px rgba(0,100,200,0.20), 0 0 35px rgba(0,242,234,0.08), 0 32px 100px rgba(0,0,0,0.95)',
              animation: 'avScrambleFloat 4s ease-in-out infinite',
            }}>
              <div style={{
                color: '#00f2ea',
                fontSize: letterFontSize,
                fontWeight: 900,
                letterSpacing,
                lineHeight: 1,
                textShadow: '0 0 50px rgba(0,242,234,0.40), 0 2px 24px rgba(0,0,0,0.95)',
                animation: 'avShimmer 3s ease-in-out infinite',
              }}>
                {scrambled}
              </div>
            </div>
          </div>
          {/* CTA */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ff2d55 0%, #ff0040 100%)',
              borderRadius: 60,
              padding: '22px 72px',
              color: 'white',
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 2,
              boxShadow: '0 8px 40px rgba(255,45,85,0.5)',
            }}>
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
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 28, padding: '60px 72px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
      const aBarColor = isFameBattleReveal ? (aWins ? '#a050ff' : 'rgba(160,80,255,0.4)') : (aWins ? '#ff2d55' : 'rgba(255,45,85,0.4)');
      const bBarColor = isFameBattleReveal ? (!aWins ? '#dca000' : 'rgba(220,160,0,0.4)') : (!aWins ? '#0078ff' : 'rgba(0,120,255,0.4)');
      return (
        <div style={containerStyle}>
          <div style={bgStyle} />
          <div style={overlayStyle} />
          <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
            {header}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ color: '#ffd700', fontSize: 52, fontWeight: 900 }}>
                ★ {content.winner} WINS
              </span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 28, padding: '52px 60px', display: 'flex', flexDirection: 'column', gap: 44, marginBottom: 40 }}>
              {/* Side A */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ color: aWins ? '#ffd700' : 'rgba(255,255,255,0.75)', fontSize: 48, fontWeight: aWins ? 900 : 600, lineHeight: 1 }}>{content.side_a}</span>
                  <span style={{ color: aWins ? '#ffd700' : 'rgba(255,255,255,0.6)', fontSize: 52, fontWeight: 800 }}>{aPercent}%</span>
                </div>
                <div style={{ height: 22, background: 'rgba(255,255,255,0.1)', borderRadius: 11, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${aPercent}%`, background: aBarColor, borderRadius: 11 }} />
                </div>
              </div>
              {/* Side B */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <span style={{ color: !aWins ? '#ffd700' : 'rgba(255,255,255,0.75)', fontSize: 48, fontWeight: !aWins ? 900 : 600, lineHeight: 1 }}>{content.side_b}</span>
                  <span style={{ color: !aWins ? '#ffd700' : 'rgba(255,255,255,0.6)', fontSize: 52, fontWeight: 800 }}>{bPercent}%</span>
                </div>
                <div style={{ height: 22, background: 'rgba(255,255,255,0.1)', borderRadius: 11, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bPercent}%`, background: bBarColor, borderRadius: 11 }} />
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, background: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: '48px 48px' }}>
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
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, background: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: '48px 48px' }}>
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
        <style>{`
          @keyframes avRevealPop {
            0% { transform: scale(0.91); opacity: 0.6; }
            65% { transform: scale(1.05); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes avRevealSweep {
            0% { left: -100%; }
            100% { left: 260%; }
          }
        `}</style>
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
          {header}
          {questionLine}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 28, background: 'rgba(0,0,0,0.75)', borderRadius: 24, padding: '56px 60px', position: 'relative', overflow: 'hidden' }}>
            {/* One-shot highlight sweep on reveal */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, width: '55%', background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)', animation: 'avRevealSweep 1.1s ease-in-out 0.15s 1 forwards', pointerEvents: 'none', zIndex: 0 }} />
            {/* Answer first and massive */}
            <div style={{ color: content.scrambled ? '#ffd700' : '#00f2ea', fontSize: 148, fontWeight: 900, lineHeight: 1.0, textShadow: '0 2px 24px rgba(0,0,0,0.9)', letterSpacing: -2, animation: 'avRevealPop 0.55s ease-out forwards', position: 'relative', zIndex: 1 }}>
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
            {/* Scramble reveal line — shows scrambled → ANSWER */}
            {content.scrambled && content.correct_answer && (
              <>
                <style>{`
                  @keyframes avGoldPulse {
                    0%, 100% { text-shadow: 0 0 20px rgba(255,215,0,0.4); }
                    50% { text-shadow: 0 0 50px rgba(255,215,0,0.75), 0 0 80px rgba(255,215,0,0.3); }
                  }
                `}</style>
                <div style={{
                  color: '#ffd700',
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: 10,
                  animation: 'avGoldPulse 2.5s ease-in-out infinite',
                }}>
                  {content.scrambled} → {content.correct_answer.toUpperCase()}
                </div>
              </>
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
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 32, padding: '80px 72px', width: '100%' }}>
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
