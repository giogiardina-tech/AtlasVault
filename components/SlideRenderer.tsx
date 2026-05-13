'use client';
import { Slide } from '@/lib/types';

interface Props {
  slide: Slide;
  scale?: number;
}

export default function SlideRenderer({ slide, scale = 1 }: Props) {
  const { slide_type, content, image_path } = slide;
  const W = 1080;
  const H = 1920;

  const containerStyle: React.CSSProperties = {
    width: W,
    height: H,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
    backgroundColor: '#0a0a0a',
    flexShrink: 0,
  };

  const bgStyle: React.CSSProperties = image_path
    ? {
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${image_path})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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
        ? 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.9) 100%)'
        : 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)',
  };

  if (slide_type === 'title') {
    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 80px', textAlign: 'center' }}>
          <span style={{ background: '#ff2d55', color: 'white', fontSize: 36, fontWeight: 700, padding: '8px 24px', borderRadius: 8, letterSpacing: 3, marginBottom: 60 }}>
            {content.category?.toUpperCase()}
          </span>
          <h1 style={{ color: 'white', fontSize: 96, fontWeight: 900, lineHeight: 1.05, marginBottom: 48, textShadow: '0 4px 40px rgba(0,0,0,0.8)' }}>
            {content.title}
          </h1>
          <p style={{ color: '#00f2ea', fontSize: 52, fontWeight: 500, lineHeight: 1.3, fontStyle: 'italic' }}>
            {content.hook}
          </p>
          {content.subtitle && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 36, marginTop: 40 }}>{content.subtitle}</p>
          )}
          <div style={{ position: 'absolute', bottom: 80, color: 'rgba(255,255,255,0.3)', fontSize: 28, letterSpacing: 4 }}>
            ATLASVAULT
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 60 }}>
            <span style={{ color: '#00f2ea', fontSize: 42, fontWeight: 800, letterSpacing: 4 }}>
              ROUND {content.round_number}
            </span>
            {content.difficulty && (
              <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 28, padding: '6px 20px', borderRadius: 40, textTransform: 'uppercase', letterSpacing: 2 }}>
                {content.difficulty}
              </span>
            )}
          </div>

          <h2 style={{ color: 'white', fontSize: 80, fontWeight: 800, lineHeight: 1.1, textShadow: '0 4px 40px rgba(0,0,0,0.9)', marginBottom: 60 }}>
            {content.question}
          </h2>

          {content.clues && (
            <div style={{ textAlign: 'left', width: '100%' }}>
              {content.clues.map((clue, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                  <span style={{ color: '#ff2d55', fontSize: 36, fontWeight: 700, minWidth: 40 }}>{i + 1}.</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 36, lineHeight: 1.4 }}>{clue}</span>
                </div>
              ))}
            </div>
          )}

          {content.events && (
            <div style={{ textAlign: 'left', width: '100%', marginTop: 20 }}>
              {content.events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-start' }}>
                  <span style={{ color: '#00f2ea', fontSize: 36, fontWeight: 700, background: 'rgba(0,242,234,0.1)', borderRadius: 8, padding: '4px 16px' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 36, lineHeight: 1.4 }}>{ev}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 100, left: 80, right: 80, display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,45,85,0.2)', border: '2px solid rgba(255,45,85,0.4)', borderRadius: 60, padding: '16px 60px', color: '#ff2d55', fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
              COMMENT YOUR ANSWER ↓
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide_type === 'reveal') {
    const answers = content.answers || [];
    const maxPoints = Math.max(...answers.map((a) => a.points), 1);

    return (
      <div style={containerStyle}>
        <div style={bgStyle} />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
            <span style={{ color: '#00f2ea', fontSize: 36, fontWeight: 800, letterSpacing: 4 }}>
              ROUND {content.round_number}
            </span>
            <span style={{ color: '#ff2d55', fontSize: 36, fontWeight: 800, letterSpacing: 4 }}>REVEAL</span>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 42, marginBottom: 60, lineHeight: 1.3 }}>
            {content.question}
          </p>

          {answers.length > 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
              {answers.map((ans, i) => {
                const barWidth = Math.max(8, (ans.points / maxPoints) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: ans.is_pointless ? '#00f2ea' : 'white', fontSize: 44, fontWeight: ans.is_pointless ? 800 : 600 }}>
                        {ans.text} {ans.is_pointless ? '★' : ''}
                      </span>
                      <span style={{ color: ans.is_pointless ? '#00f2ea' : 'rgba(255,255,255,0.6)', fontSize: 44, fontWeight: 700 }}>
                        {ans.is_pointless ? 'POINTLESS' : `${ans.points}pts`}
                      </span>
                    </div>
                    <div style={{ height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, background: ans.is_pointless ? '#00f2ea' : '#ff2d55', borderRadius: 8, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#00f2ea', fontSize: 96, fontWeight: 900 }}>{content.correct_answer}</div>
                {content.fun_fact && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 40, marginTop: 40, lineHeight: 1.4, fontStyle: 'italic' }}>
                    {content.fun_fact}
                  </p>
                )}
              </div>
            </div>
          )}
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
          <h1 style={{ color: 'white', fontSize: 100, fontWeight: 900, lineHeight: 1, marginBottom: 60 }}>
            {content.title}
          </h1>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '60px 60px' }}>
            {content.scoring_summary?.split('|').map((part, i) => (
              <p key={i} style={{ color: i === 0 ? '#00f2ea' : 'rgba(255,255,255,0.7)', fontSize: 44, lineHeight: 1.6, fontWeight: i === 0 ? 700 : 400 }}>
                {part.trim()}
              </p>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 32, marginTop: 80, letterSpacing: 4 }}>
            FOLLOW FOR MORE
          </p>
        </div>
      </div>
    );
  }

  return <div style={containerStyle} />;
}
