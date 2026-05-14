'use client';
import { Slide, SlideContent } from './types';

const W = 1080, H = 1920, M = 80, CW = W - M * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const s = Math.max(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const s = Math.min(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  rrPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function strokeRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  rrPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function vgrad(ctx: CanvasRenderingContext2D, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = word; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number, align: CanvasTextAlign = 'center'): number {
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, text, maxW);
  lines.forEach((line, i) => ctx.fillText(line, cx, y + i * lh));
  return lines.length * lh;
}

function drawLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = 'center') {
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

const titleOverlay = (ctx: CanvasRenderingContext2D) =>
  vgrad(ctx, [[0, 'rgba(0,0,0,0.35)'], [0.45, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0.7)']]);

const stdOverlay = (ctx: CanvasRenderingContext2D) =>
  vgrad(ctx, [[0, 'rgba(0,0,0,0.65)'], [0.25, 'rgba(0,0,0,0.15)'], [0.70, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.7)']]);

const flagOverlay = (ctx: CanvasRenderingContext2D) =>
  vgrad(ctx, [[0, 'rgba(0,0,0,0.75)'], [0.2, 'rgba(0,0,0,0)'], [0.8, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.75)']]);

// ─── Slide renderers ──────────────────────────────────────────────────────────

function renderTitle(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const panelH = 760, panelY = H / 2 - panelH / 2;
  fillRR(ctx, M, panelY, CW, panelH, 32, 'rgba(0,0,0,0.55)');
  let y = panelY + 80;

  if (c.category) {
    const badge = c.category.toUpperCase();
    ctx.font = '700 36px Inter, system-ui, sans-serif';
    const bw = ctx.measureText(badge).width + 48, bh = 56;
    fillRR(ctx, W / 2 - bw / 2, y, bw, bh, 8, '#ff2d55');
    ctx.fillStyle = 'white';
    drawLine(ctx, badge, W / 2, y + 10);
    y += bh + 48;
  }

  ctx.font = '900 88px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  y += drawWrapped(ctx, c.title || '', W / 2, y, CW - 80, 104) + 48;

  ctx.font = 'italic 500 50px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  y += drawWrapped(ctx, c.hook || '', W / 2, y, CW - 80, 64);

  if (c.subtitle) {
    y += 36;
    ctx.font = '400 34px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    drawLine(ctx, c.subtitle, W / 2, y);
  }

  ctx.font = '400 28px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  drawLine(ctx, 'ATLASVAULT', W / 2, H - 120);
}

function renderRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const PAD = 60;
  const TOP_SAFE = 220;   // below TikTok top chrome
  const BOT_SAFE = 1480;  // above TikTok bottom chrome (H - 440)
  const hasExtra = !!(c.clues || c.events);
  const panelH = hasExtra ? 1100 : 600;
  // Centre the panel but clamp inside TikTok safe zone
  const panelY = Math.max(TOP_SAFE, Math.min(H / 2 - panelH / 2, BOT_SAFE - panelH));
  fillRR(ctx, M, panelY, CW, panelH, 28, 'rgba(0,0,0,0.6)');
  let y = panelY + PAD;

  // Round label
  ctx.font = '800 42px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  const rl = `ROUND ${c.round_number}`;
  drawLine(ctx, rl, M + PAD, y, 'left');
  if (c.difficulty) {
    const dx = M + PAD + ctx.measureText(rl).width + 20;
    const dt = (c.difficulty as string).toUpperCase();
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    const dw = ctx.measureText(dt).width + 40;
    fillRR(ctx, dx, y, dw, 46, 40, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    drawLine(ctx, dt, dx + dw / 2, y + 10);
  }
  y += 60 + 40;

  ctx.font = '800 72px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  y += drawWrapped(ctx, c.question || '', W / 2, y, CW - PAD * 2, 84) + (hasExtra ? 40 : 0);

  if (c.clues) {
    c.clues.forEach((clue, i) => {
      ctx.font = '700 36px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ff2d55';
      drawLine(ctx, `${i + 1}.`, M + PAD, y, 'left');
      ctx.font = '400 36px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      const h = drawWrapped(ctx, clue, M + PAD + 60, y, CW - PAD * 2 - 60, 46, 'left');
      y += Math.max(h, 46) + 16;
    });
  }

  if (c.events) {
    c.events.forEach((ev, i) => {
      const letter = String.fromCharCode(65 + i);
      fillRR(ctx, M + PAD, y, 56, 56, 8, 'rgba(0,242,234,0.15)');
      ctx.font = '700 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#00f2ea';
      drawLine(ctx, letter, M + PAD + 28, y + 10);
      ctx.font = '400 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      const h = drawWrapped(ctx, ev, M + PAD + 80, y, CW - PAD * 2 - 80, 44, 'left');
      y += Math.max(h, 56) + 20;
    });
  }

  // CTA — at H-420 to stay above TikTok bottom chrome
  const cta = 'COMMENT YOUR ANSWER ↓';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 120, ctaH = 80;
  fillRR(ctx, W / 2 - ctaW / 2, H - 420, ctaW, ctaH, 60, 'rgba(255,45,85,0.85)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, H - 420 + ctaH / 2);
}

function renderFlagRound(ctx: CanvasRenderingContext2D, c: SlideContent, isEmpire = false) {
  // Top panel — starts at 220px to clear TikTok top chrome
  const topY = 220;
  const qFontSize = isEmpire ? 52 : 64;
  const lineH = isEmpire ? 64 : 76;
  const panelH = isEmpire ? 380 : 300;
  fillRR(ctx, M, topY, CW, panelH, 24, 'rgba(0,0,0,0.72)');
  let y = topY + 36;

  ctx.font = '800 40px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  drawLine(ctx, `ROUND ${c.round_number}`, W / 2, y);
  y += 56;

  ctx.font = `800 ${qFontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  drawWrapped(ctx, c.question || '', W / 2, y, CW - 80, lineH);

  // CTA — bottom at H - 420 to clear TikTok bottom chrome
  const cta = 'COMMENT YOUR ANSWER ↓';
  ctx.font = '700 36px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 128;
  const ctaY = H - 420;
  fillRR(ctx, W / 2 - ctaW / 2, ctaY, ctaW, 80, 60, 'rgba(255,45,85,0.9)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, ctaY + 40);
}

function renderReveal(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const scoringType = c.scoring_type || (c.answers && c.answers.length > 1 ? 'pointless' : 'difficulty');

  // Header
  let y = 100;
  ctx.font = '800 36px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const rnW = ctx.measureText(`ROUND ${c.round_number}`).width;
  ctx.fillText(`ROUND ${c.round_number}`, M, y);
  ctx.fillStyle = '#ff2d55';
  ctx.fillText(' REVEAL', M + rnW, y);
  y += 56;

  ctx.font = '600 36px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  y += drawWrapped(ctx, c.question || '', W / 2, y, CW, 46) + 28;

  if (scoringType === 'pointless' && c.answers?.length) {
    const maxPts = Math.max(...c.answers.map(a => a.points), 1);
    const panelH = H - y - 100;
    fillRR(ctx, M, y, CW, panelH, 24, 'rgba(0,0,0,0.55)');
    y += 40;
    const itemH = (panelH - 80) / c.answers.length;

    c.answers.forEach(ans => {
      const barW = Math.max(4, (ans.points / maxPts) * (CW - 96));
      ctx.font = `${ans.is_pointless ? 800 : 600} 36px Inter, system-ui, sans-serif`;
      ctx.fillStyle = ans.is_pointless ? '#00f2ea' : 'white';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(ans.text + (ans.is_pointless ? ' ★' : ''), M + 48, y);
      ctx.font = '700 36px Inter, system-ui, sans-serif';
      ctx.fillStyle = ans.is_pointless ? '#00f2ea' : 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(ans.is_pointless ? 'POINTLESS' : `${ans.points}pts`, M + CW - 48, y);
      y += 48;
      fillRR(ctx, M + 48, y, CW - 96, 12, 6, 'rgba(255,255,255,0.12)');
      fillRR(ctx, M + 48, y, barW, 12, 6, ans.is_pointless ? '#00f2ea' : '#ff2d55');
      y += 12 + Math.max(itemH - 60, 20);
    });

    ctx.font = '400 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Lower score = rarer answer = better', W / 2, y + 12);

  } else if (scoringType === 'position' && c.correct_order?.length) {
    ctx.font = '600 36px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Correct chronological order:', M, y);
    y += 56;

    const listH = c.correct_order.length * 88 + 96;
    fillRR(ctx, M, y, CW, listH, 24, 'rgba(0,0,0,0.55)');
    y += 40;

    c.correct_order.forEach((item, i) => {
      ctx.font = '900 42px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#00f2ea';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(String(i + 1), M + 48, y);
      ctx.font = '700 38px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.fillText(item.event, M + 100, y);
      ctx.font = '800 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ff2d55';
      ctx.textAlign = 'right';
      ctx.fillText(String(item.year), M + CW - 48, y);
      y += 88;
    });
    y += 20;

    const guideH = 140;
    fillRR(ctx, M, y, CW, guideH, 20, 'rgba(0,0,0,0.55)');
    ctx.font = '400 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Score yourself — 1 point per correct position', W / 2, y + 24);
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#00f2ea';
    ctx.fillText(`${c.max_points || 4}/${c.max_points || 4} = perfect`, W / 2, y + 76);

  } else {
    // Difficulty mode
    const tiers: Record<string, { label: string; color: string; stars: number }> = {
      easy: { label: 'EASY', color: '#22c55e', stars: 1 },
      medium: { label: 'MEDIUM', color: '#f59e0b', stars: 2 },
      hard: { label: 'HARD', color: '#f97316', stars: 3 },
      impossible: { label: 'IMPOSSIBLE', color: '#ef4444', stars: 4 },
    };
    const tier = tiers[c.difficulty_tier || 'medium'];
    fillRR(ctx, M, y, CW, H - y - 80, 24, 'rgba(0,0,0,0.55)');
    y += 60;

    if (tier) {
      const starSz = 52, gap = 12;
      ctx.font = `400 ${starSz}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      let totalW = 4 * starSz + 3 * gap;
      ctx.font = '800 40px Inter, system-ui, sans-serif';
      totalW += ctx.measureText(tier.label).width + 28;
      let sx = W / 2 - totalW / 2;
      ctx.font = `400 ${starSz}px Inter, system-ui, sans-serif`;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < tier.stars ? tier.color : 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'left';
        ctx.fillText('★', sx, y);
        sx += starSz + gap;
      }
      ctx.font = '800 40px Inter, system-ui, sans-serif';
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.label, sx + 8, y + 8);
      y += starSz + 36;
    }

    ctx.font = '900 88px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#00f2ea';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    y += drawWrapped(ctx, c.correct_answer || '', W / 2, y, CW - 80, 104) + 36;

    if (c.clue_giveaway) {
      const cgt = `Most people get it from ${c.clue_giveaway}`;
      ctx.font = '600 32px Inter, system-ui, sans-serif';
      const cgW = ctx.measureText(cgt).width + 72;
      fillRR(ctx, W / 2 - cgW / 2, y, cgW, 62, 14, 'rgba(255,45,85,0.25)');
      strokeRR(ctx, W / 2 - cgW / 2, y, cgW, 62, 14, 'rgba(255,45,85,0.5)');
      ctx.fillStyle = '#ff2d55';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cgt, W / 2, y + 31);
      y += 62 + 36;
    }

    if (c.fun_fact) {
      ctx.font = 'italic 400 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      drawWrapped(ctx, `"${c.fun_fact}"`, W / 2, y, CW - 80, 48);
    }
  }
}

function renderScore(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const parts = (c.scoring_summary || '').split('|').map(p => p.trim());
  const panelH = Math.min(parts.length * 76 + 280, 1000);
  const panelY = H / 2 - panelH / 2;
  fillRR(ctx, M, panelY, CW, panelH, 32, 'rgba(0,0,0,0.6)');

  let y = panelY + 80;
  ctx.font = '900 88px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  y += drawWrapped(ctx, c.title || 'How Did You Score?', W / 2, y, CW - 80, 104) + 56;

  const innerH = parts.length * 72 + 60;
  fillRR(ctx, M + 20, y, CW - 40, innerH, 20, 'rgba(255,255,255,0.06)');
  strokeRR(ctx, M + 20, y, CW - 40, innerH, 20, 'rgba(255,255,255,0.12)');
  y += 48;

  parts.forEach((part, i) => {
    ctx.font = `${i === 0 ? '700' : '400'} 40px Inter, system-ui, sans-serif`;
    ctx.fillStyle = i === 0 ? '#00f2ea' : 'rgba(255,255,255,0.85)';
    drawWrapped(ctx, part, W / 2, y, CW - 80, 50);
    y += 72;
  });

  ctx.font = '400 30px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('FOLLOW FOR MORE', W / 2, H - 140);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function renderSlideToBlob(slide: Slide, formatType: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const isFlagRound = formatType === 'guess-the-flag' && slide.slide_type === 'round';
  const isPartialFlagRound = formatType === 'partial-flag' && slide.slide_type === 'round';
  const isEmpireRound = formatType === 'guess-the-empire' && slide.slide_type === 'round';
  const isFlagStyleRound = isFlagRound || isPartialFlagRound || isEmpireRound;

  ctx.fillStyle = isPartialFlagRound ? '#c8c8c8' : '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  if (slide.image_path) {
    try {
      const img = await loadImage(slide.image_path);
      if (isPartialFlagRound) {
        // Progressive centre zoom: each round shows less of the flag
        const PARTIAL_ZOOMS = [1.0, 1.4, 2.0, 3.2, 5.2];
        const roundNum = (slide.content.round_number ?? 1) as number;
        const zoom = PARTIAL_ZOOMS[Math.min(roundNum - 1, 4)];
        const scaledW = W * zoom;
        const scaledH = scaledW / (img.width / img.height);
        ctx.drawImage(img, (W - scaledW) / 2, (H - scaledH) / 2, scaledW, scaledH);
      } else if (isFlagRound) {
        drawContain(ctx, img);
      } else {
        drawCover(ctx, img);
      }
    } catch {}
  }

  const { slide_type, content } = slide;

  if (slide_type === 'title') { titleOverlay(ctx); renderTitle(ctx, content); }
  else if (isFlagStyleRound)  { flagOverlay(ctx);  renderFlagRound(ctx, content, isEmpireRound); }
  else if (slide_type === 'round')  { stdOverlay(ctx); renderRound(ctx, content); }
  else if (slide_type === 'reveal') { stdOverlay(ctx); renderReveal(ctx, content); }
  else if (slide_type === 'score')  { titleOverlay(ctx); renderScore(ctx, content); }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
