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

/**
 * Reduce font size until text fits on a single line within maxW.
 * Sets ctx.font to the winning font and returns the chosen size.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFn: (sz: number) => string,
  maxW: number,
  maxSz: number,
  minSz = 22
): number {
  let sz = maxSz;
  while (sz > minSz) {
    ctx.font = fontFn(sz);
    if (ctx.measureText(text).width <= maxW) break;
    sz -= 2;
  }
  return sz;
}

/**
 * Reduce font size until wrapped text fits within maxLines lines inside maxW.
 * Sets ctx.font to the winning font and returns size, wrapped lines, and line height.
 */
function fitWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFn: (sz: number) => string,
  maxW: number,
  maxLines: number,
  maxSz: number,
  minSz = 22
): { sz: number; lines: string[]; lineH: number } {
  let sz = maxSz;
  while (sz > minSz) {
    ctx.font = fontFn(sz);
    const lines = wrapLines(ctx, text, maxW);
    if (lines.length <= maxLines) return { sz, lines, lineH: Math.round(sz * 1.2) };
    sz -= 4;
  }
  ctx.font = fontFn(sz);
  return { sz, lines: wrapLines(ctx, text, maxW), lineH: Math.round(sz * 1.2) };
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
  // ── Overlays: radial vignette + top/bottom fade + subtle glow ──
  // Radial vignette — lighter centre lets background breathe, dark edges frame the text
  const vignette = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, W * 0.88);
  vignette.addColorStop(0, 'rgba(0,0,0,0.12)');
  vignette.addColorStop(0.55, 'rgba(0,0,0,0.52)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.88)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // Top/bottom gradient for badge + watermark readability
  const topBot = ctx.createLinearGradient(0, 0, 0, H);
  topBot.addColorStop(0, 'rgba(0,0,0,0.50)');
  topBot.addColorStop(0.20, 'rgba(0,0,0,0)');
  topBot.addColorStop(0.72, 'rgba(0,0,0,0)');
  topBot.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = topBot;
  ctx.fillRect(0, 0, W, H);

  // Subtle cyan atmospheric glow at centre — adds depth without fantasy look
  const glow = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, 380);
  glow.addColorStop(0, 'rgba(0,200,255,0.10)');
  glow.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle film grain — adds tactile texture, reduces flat AI look
  ctx.save();
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = Math.random() * 0.055 + 0.01;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a.toFixed(3)})` : `rgba(0,0,0,${a.toFixed(3)})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();

  // ── Layout measurement ──
  // Hook: stacked 2-words-per-line hero text
  const hookWords = (c.hook || '').toUpperCase().split(' ');
  const hookStackLines: string[] = [];
  for (let i = 0; i < hookWords.length; i += 2) {
    hookStackLines.push(hookWords.slice(i, Math.min(i + 2, hookWords.length)).join(' '));
  }
  const hookFontSize = 112;
  const hookLineH = Math.round(hookFontSize * 0.97);
  const hookTotalH = hookStackLines.length * hookLineH;

  const badgeH = 60;
  const badgeGap = 48;
  const dividerGap = 28;
  const dividerH = 4;
  const titleGap = 28;

  ctx.font = '600 46px Inter, system-ui, sans-serif';
  const titleLines = wrapLines(ctx, c.title || '', CW - 80);
  const titleLineH = 54;
  const titleTotalH = titleLines.length * titleLineH;

  const totalH = badgeH + badgeGap + hookTotalH + dividerGap + dividerH + titleGap + titleTotalH;
  let y = H / 2 - totalH / 2;

  // ── Category badge ──
  if (c.category) {
    const badge = c.category.toUpperCase();
    ctx.font = '800 28px Inter, system-ui, sans-serif';
    const bw = ctx.measureText(badge).width + 64;
    fillRR(ctx, W / 2 - bw / 2, y, bw, badgeH, 100, '#ff2d55');
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badge, W / 2, y + badgeH / 2);
    y += badgeH + badgeGap;
  }

  // ── Hook — massive stacked hero ──
  ctx.font = `900 ${hookFontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 40;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  hookStackLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * hookLineH));
  y += hookTotalH + dividerGap;
  ctx.shadowBlur = 0;

  // ── Gold accent divider ──
  fillRR(ctx, W / 2 - 36, y, 72, dividerH, 2, '#ffd700');
  y += dividerH + titleGap;

  // ── Title — supporting text ──
  ctx.font = '600 46px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * titleLineH));

  // ── Watermark ──
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('ATLASVAULT', W / 2, H - 110);
  ctx.letterSpacing = '0px';
}

function renderRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const PAD = 60;
  const hasExtra = !!(c.clues || c.events);

  // ── Round badge — upper safe zone ─────────────────────────────────────────
  const roundLabel = `ROUND ${c.round_number}`;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const rlW = ctx.measureText(roundLabel).width + 56;
  fillRR(ctx, W / 2 - rlW / 2, 268, rlW, 52, 40, 'rgba(0,242,234,0.16)');
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(roundLabel, W / 2, 294);

  // Difficulty pill below badge
  let diffBottom = 336;
  if (c.difficulty) {
    const dt = (c.difficulty as string).toUpperCase();
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    const dw = ctx.measureText(dt).width + 36;
    fillRR(ctx, W / 2 - dw / 2, diffBottom, dw, 38, 40, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dt, W / 2, diffBottom + 19);
    diffBottom += 52;
  }

  // ── Question — vertically centered in content zone ─────────────────────────
  const maxQLines = hasExtra ? 2 : 3;
  const { sz: qSz, lines: qLines, lineH: qLH } = fitWrapped(
    ctx, c.question || '', sz => `800 ${sz}px Inter, system-ui, sans-serif`,
    CW - PAD * 2, maxQLines, hasExtra ? 66 : 82, 28
  );
  const questionTotalH = qLines.length * qLH;
  const questionCenterY = hasExtra ? 660 : H / 2;
  const questionY = Math.max(diffBottom + 24, questionCenterY - questionTotalH / 2);

  ctx.font = `800 ${qSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 28;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, questionY + i * qLH));
  ctx.shadowBlur = 0;

  let y = questionY + questionTotalH + 48;

  // ── Clues ─────────────────────────────────────────────────────────────────
  if (c.clues) {
    const clueCardH = Math.min(H - 500 - y, 720);
    fillRR(ctx, M, y, CW, clueCardH, 24, 'rgba(0,0,0,0.42)');
    y += PAD;
    c.clues.forEach((clue, i) => {
      ctx.font = '700 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#ff2d55';
      drawLine(ctx, `${i + 1}.`, M + PAD, y, 'left');
      ctx.font = '400 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      const h = drawWrapped(ctx, clue, M + PAD + 60, y, CW - PAD * 2 - 60, 44, 'left');
      y += Math.max(h, 44) + 16;
    });
  }

  // ── Events ────────────────────────────────────────────────────────────────
  if (c.events) {
    const evCardH = Math.min(H - 500 - y, 740);
    fillRR(ctx, M, y, CW, evCardH, 24, 'rgba(0,0,0,0.42)');
    y += PAD;
    c.events.forEach((ev, i) => {
      const letter = String.fromCharCode(65 + i);
      fillRR(ctx, M + PAD, y, 52, 52, 8, 'rgba(0,242,234,0.15)');
      ctx.font = '700 32px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#00f2ea';
      drawLine(ctx, letter, M + PAD + 26, y + 10);
      ctx.font = '400 32px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      const h = drawWrapped(ctx, ev, M + PAD + 76, y, CW - PAD * 2 - 76, 42, 'left');
      y += Math.max(h, 52) + 20;
    });
  }

  // ── CTA — lower safe zone ─────────────────────────────────────────────────
  const cta = 'COMMENT YOUR ANSWER ↓';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 120, ctaH = 80;
  fillRR(ctx, W / 2 - ctaW / 2, H - 460, ctaW, ctaH, 60, 'rgba(255,45,85,0.85)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, H - 460 + ctaH / 2);
}

function renderPartialFlagRoundText(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const tierColors: Record<string, string> = { easy: '#22c55e', medium: '#f59e0b', hard: '#f97316', impossible: '#ef4444' };
  const tierColor = tierColors[c.difficulty as string] ?? 'rgba(255,255,255,0.4)';

  // Round badge — top safe zone, dark pill for contrast against any flag
  const roundLabel = `ROUND ${c.round_number}`;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const rlW = ctx.measureText(roundLabel).width + 56;
  fillRR(ctx, W / 2 - rlW / 2, 262, rlW, 52, 40, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(roundLabel, W / 2, 288);

  // Question — centered between badge and flag card (card top ≈ 770)
  ctx.font = '700 52px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 28;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  drawWrapped(ctx, 'Which country does this flag belong to?', W / 2, 478, CW - 40, 62);
  ctx.shadowBlur = 0;

  // Difficulty label above CTA
  if (c.difficulty) {
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.fillStyle = tierColor;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText((c.difficulty as string).toUpperCase(), W / 2, H - 420 - 56);
  }

  // CTA
  const cta = 'COMMENT YOUR ANSWER ↓';
  ctx.font = '700 36px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 136, ctaH = 84;
  fillRR(ctx, W / 2 - ctaW / 2, H - 420, ctaW, ctaH, 60, 'rgba(255,45,85,0.88)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, H - 420 + ctaH / 2);
}

function renderFlagRound(ctx: CanvasRenderingContext2D, c: SlideContent, isEmpire = false) {
  // Round badge — small dark pill in top safe zone, no heavy panel
  const roundLabel = `ROUND ${c.round_number}`;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const rlW = ctx.measureText(roundLabel).width + 56;
  fillRR(ctx, W / 2 - rlW / 2, 268, rlW, 52, 40, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(roundLabel, W / 2, 294);

  // Question — strong text shadow for readability over flag image
  const { sz: qSz, lines: qLines, lineH: qLH } = fitWrapped(
    ctx, c.question || '', sz => `800 ${sz}px Inter, system-ui, sans-serif`,
    CW - 80, 2, 64, 30
  );
  ctx.font = `800 ${qSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 36;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, 340 + i * qLH));
  ctx.shadowBlur = 0;

  // CTA — bottom safe zone
  const cta = 'COMMENT YOUR ANSWER ↓';
  ctx.font = '700 36px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 128;
  const ctaY = H - 420;
  fillRR(ctx, W / 2 - ctaW / 2, ctaY, ctaW, 80, 60, 'rgba(255,45,85,0.9)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, ctaY + 40);
}

// CTA phrases — rotated per round for variety
const EMPIRE_CTAS = [
  'NAME THE EMPIRE ↓',
  'COMMENT BEFORE REVEAL ↓',
  'ONLY HISTORY NERDS KNOW THIS ↓',
  "DON'T CHEAT ↓",
  'YOU GET 5 SECONDS ↓',
];

function renderEmpireRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const rn = ((c.round_number as number) ?? 1) - 1;

  // Cinematic glass panel — centered vertically, generous radius, subtle gold border
  const panelH = 450;
  const topY = Math.max(260, H / 2 - panelH / 2);
  fillRR(ctx, M, topY, CW, panelH, 36, 'rgba(8,4,18,0.54)');
  strokeRR(ctx, M, topY, CW, panelH, 36, 'rgba(255,200,80,0.22)', 1.5);

  let y = topY + 46;

  // Round badge — warm gold with letter spacing
  ctx.font = '700 30px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,200,80,0.88)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.letterSpacing = '5px';
  ctx.fillText(`ROUND ${c.round_number}`, W / 2, y);
  ctx.letterSpacing = '0px';
  y += 48;

  // Subtle gold divider
  ctx.strokeStyle = 'rgba(255,200,80,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(M + 120, y); ctx.lineTo(M + CW - 120, y);
  ctx.stroke();
  y += 28;

  // Question — auto-fit, bold white with strong text shadow
  const { sz: qSz, lines: qLines, lineH: qLH } = fitWrapped(
    ctx, c.question || '', sz => `800 ${sz}px Inter, system-ui, sans-serif`,
    CW - 100, 3, 62, 26
  );
  ctx.font = `800 ${qSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 22;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, y + i * qLH));
  ctx.shadowBlur = 0;
  y += qLines.length * qLH + 22;

  // Difficulty tier label
  if (c.difficulty) {
    const TIER_COLORS: Record<string, string> = {
      easy: '#22c55e', medium: '#f59e0b', hard: '#f97316', impossible: '#ef4444',
    };
    const tc = TIER_COLORS[c.difficulty as string] ?? 'rgba(255,255,255,0.35)';
    ctx.font = '600 19px Inter, system-ui, sans-serif';
    ctx.fillStyle = tc;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.letterSpacing = '3px';
    ctx.fillText((c.difficulty as string).toUpperCase(), W / 2, y);
    ctx.letterSpacing = '0px';
  }

  // Rotating CTA — amber/gold pill
  const ctaText = EMPIRE_CTAS[rn % EMPIRE_CTAS.length];
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(ctaText).width + 112, ctaH = 74;
  const ctaY = H - 420;
  fillRR(ctx, W / 2 - ctaW / 2, ctaY, ctaW, ctaH, 60, 'rgba(175,98,12,0.92)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, W / 2, ctaY + ctaH / 2);
}

function renderFightRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const PAD = 60;
  // Round label
  ctx.font = '800 42px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`ROUND ${c.round_number}`, W / 2, 240);

  const boxW = CW, boxH = 280;
  const centerY = H / 2;

  // Side A box — subtle red tint
  const aY = centerY - boxH - 60;
  fillRR(ctx, M, aY, boxW, boxH, 20, 'rgba(20,0,5,0.55)');
  strokeRR(ctx, M, aY, boxW, boxH, 20, 'rgba(255,45,85,0.55)', 3);
  const { sz: _saSz, lines: _saLines, lineH: _saLH } = fitWrapped(
    ctx, c.side_a || '', sz => `900 ${sz}px Inter, system-ui, sans-serif`,
    boxW - PAD * 2, 3, 68, 26
  );
  ctx.font = `900 ${_saSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  { const _saTH = _saLines.length * _saLH; _saLines.forEach((ln, i) => ctx.fillText(ln, W / 2, aY + (boxH - _saTH) / 2 + i * _saLH)); }

  // VS
  ctx.font = '900 80px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VS', W / 2, centerY);

  // Side B box — subtle blue tint
  const bY = centerY + 60;
  fillRR(ctx, M, bY, boxW, boxH, 20, 'rgba(0,5,20,0.55)');
  strokeRR(ctx, M, bY, boxW, boxH, 20, 'rgba(0,120,255,0.55)', 3);
  const { sz: _sbSz, lines: _sbLines, lineH: _sbLH } = fitWrapped(
    ctx, c.side_b || '', sz => `900 ${sz}px Inter, system-ui, sans-serif`,
    boxW - PAD * 2, 3, 68, 26
  );
  ctx.font = `900 ${_sbSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  { const _sbTH = _sbLines.length * _sbLH; _sbLines.forEach((ln, i) => ctx.fillText(ln, W / 2, bY + (boxH - _sbTH) / 2 + i * _sbLH)); }

  // CTA
  const cta = 'COMMENT YOUR PICK ↓';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 120, ctaH = 80;
  fillRR(ctx, W / 2 - ctaW / 2, H - 420, ctaW, ctaH, 60, 'rgba(255,45,85,0.85)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, H - 420 + ctaH / 2);
}

function renderFameBattleRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const PAD = 60;
  // Round label
  ctx.font = '800 42px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(`ROUND ${c.round_number}`, W / 2, 240);

  const boxW = CW, boxH = 280;
  const centerY = H / 2;

  // Side A box — subtle purple tint
  const aY = centerY - boxH - 60;
  fillRR(ctx, M, aY, boxW, boxH, 20, 'rgba(30,0,60,0.55)');
  strokeRR(ctx, M, aY, boxW, boxH, 20, 'rgba(160,80,255,0.55)', 3);
  const { sz: _saSz, lines: _saLines, lineH: _saLH } = fitWrapped(
    ctx, c.side_a || '', sz => `900 ${sz}px Inter, system-ui, sans-serif`,
    boxW - PAD * 2, 3, 68, 26
  );
  ctx.font = `900 ${_saSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  { const _saTH = _saLines.length * _saLH; _saLines.forEach((ln, i) => ctx.fillText(ln, W / 2, aY + (boxH - _saTH) / 2 + i * _saLH)); }

  // VS
  ctx.font = '900 80px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('VS', W / 2, centerY);

  // Side B box — subtle gold tint
  const bY = centerY + 60;
  fillRR(ctx, M, bY, boxW, boxH, 20, 'rgba(40,25,0,0.55)');
  strokeRR(ctx, M, bY, boxW, boxH, 20, 'rgba(220,160,0,0.55)', 3);
  const { sz: _sbSz, lines: _sbLines, lineH: _sbLH } = fitWrapped(
    ctx, c.side_b || '', sz => `900 ${sz}px Inter, system-ui, sans-serif`,
    boxW - PAD * 2, 3, 68, 26
  );
  ctx.font = `900 ${_sbSz}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  { const _sbTH = _sbLines.length * _sbLH; _sbLines.forEach((ln, i) => ctx.fillText(ln, W / 2, bY + (boxH - _sbTH) / 2 + i * _sbLH)); }

  // CTA
  const cta = 'COMMENT WHO WAS MORE FAMOUS ↓';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const ctaW = ctx.measureText(cta).width + 120, ctaH = 80;
  fillRR(ctx, W / 2 - ctaW / 2, H - 420, ctaW, ctaH, 60, 'rgba(160,80,255,0.85)');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(cta, W / 2, H - 420 + ctaH / 2);
}

function renderScrambleRound(ctx: CanvasRenderingContext2D, c: SlideContent) {
  const scrambled = c.scrambled || '';
  const charCount = scrambled.replace(/ /g, '').length;
  let fontSize   = charCount <= 5 ? 176 : charCount <= 7 ? 148 : charCount <= 9 ? 118 : 96;
  let letterGap  = charCount <= 5 ?  50 : charCount <= 7 ?  36 : charCount <= 9 ?  24 : 16;
  // Pre-measure and scale down if scramble overflows the card width
  {
    const _sw = scrambled.split(' ');
    ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
    const _iwg = fontSize * 0.36;
    let _tw = 0;
    _sw.forEach((w, wi) => {
      w.split('').forEach(ch => { _tw += ctx.measureText(ch).width; });
      if (w.length > 1) _tw += (w.length - 1) * letterGap;
      if (wi < _sw.length - 1) _tw += _iwg;
    });
    const _avail = CW - 120;
    if (_tw > _avail) {
      const _scale = _avail / _tw;
      fontSize = Math.max(52, Math.floor(fontSize * _scale));
      letterGap = Math.max(8, Math.floor(letterGap * _scale));
    }
  }
  const rn = (((c.round_number as number) ?? 1) - 1) % 5;

  // ── Background: Earth from space ──────────────────────────────────────────────

  // 1. Deep space base
  ctx.fillStyle = '#030c1a';
  ctx.fillRect(0, 0, W, H);

  // 2. Earth globe — per-round position variation
  const globeCenters: [number, number][] = [
    [W / 2,       H * 0.37],
    [W * 0.62,    H * 0.40],
    [W * 0.38,    H * 0.38],
    [W / 2,       H * 0.43],
    [W * 0.55,    H * 0.35],
  ];
  const [gx, gy] = globeCenters[rn];
  const gr = 440;

  // Clip to globe body
  ctx.save();
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI * 2);
  ctx.clip();

  // Ocean gradient — visible blue, not pure black
  const ocean = ctx.createRadialGradient(gx - gr * 0.28, gy - gr * 0.22, 0, gx, gy, gr);
  ocean.addColorStop(0, '#0d5080');
  ocean.addColorStop(0.45, '#062e55');
  ocean.addColorStop(1, '#021228');
  ctx.fillStyle = ocean;
  ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);

  // Latitude rings — visible at 0.20 opacity
  ctx.strokeStyle = 'rgba(80,180,255,0.20)';
  ctx.lineWidth = 1.2;
  [-0.76, -0.50, -0.25, 0, 0.25, 0.50, 0.76].forEach(factor => {
    const dy = gr * factor;
    const rx = Math.sqrt(Math.max(0, gr * gr - dy * dy));
    const ry = rx * 0.12;
    if (rx < 10) return;
    ctx.beginPath();
    ctx.ellipse(gx, gy + dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Meridians
  ctx.strokeStyle = 'rgba(80,180,255,0.15)';
  [0, 45, 90, 135].forEach(deg => {
    const a = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.ellipse(gx, gy, gr * 0.08, gr, a, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(gx, gy, gr * 0.55, gr, a, 0, Math.PI * 2);
    ctx.stroke();
  });

  // City lights — deterministic via seeded pseudo-random (no Math.random)
  const seed = ((c.round_number as number) ?? 1);
  const pseudo = (n: number) => Math.abs(Math.sin(n * seed * 127.1 + 311.7) * 43758.5453) % 1;
  for (let i = 0; i < 300; i++) {
    const angle = pseudo(i * 3) * Math.PI * 2;
    const dist  = pseudo(i * 3 + 1) * gr * 0.92;
    const lx    = gx + Math.cos(angle) * dist;
    const ly    = gy + Math.sin(angle) * dist;
    const alpha = pseudo(i * 3 + 2) * 0.55 + 0.20;
    ctx.fillStyle = `rgba(255,230,120,${alpha.toFixed(2)})`;
    ctx.fillRect(lx, ly, 2, 2);
  }

  ctx.restore(); // end globe clip

  // Globe outline
  ctx.strokeStyle = 'rgba(80,180,255,0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, 0, Math.PI * 2);
  ctx.stroke();

  // Atmospheric limb halo
  const limb = ctx.createRadialGradient(gx, gy, gr * 0.86, gx, gy, gr * 1.14);
  limb.addColorStop(0, 'transparent');
  limb.addColorStop(0.5, 'rgba(0,120,220,0.24)');
  limb.addColorStop(1, 'transparent');
  ctx.fillStyle = limb;
  ctx.fillRect(gx - gr * 1.2, gy - gr * 1.2, gr * 2.4, gr * 2.4);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, W * 0.92);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Edge darkening for TikTok safe zones
  const edges = ctx.createLinearGradient(0, 0, 0, H);
  edges.addColorStop(0, 'rgba(0,0,0,0.68)');
  edges.addColorStop(0.13, 'transparent');
  edges.addColorStop(0.79, 'transparent');
  edges.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = edges;
  ctx.fillRect(0, 0, W, H);

  // ── Content ──────────────────────────────────────────────────────────────────

  // Pre-calculate card height for vertical centering
  const cardPadY = 44;
  const labelRowH = 76;
  const letterRowH = fontSize + 40;
  const hintRowH = 56;
  const _cardH = cardPadY + labelRowH + letterRowH + hintRowH + cardPadY;

  // Pre-measure question height
  ctx.font = '700 60px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const _preQLines = wrapLines(ctx, c.question || '', CW);
  const _preQLH = 72;
  const _preQH = _preQLines.length * _preQLH;

  // Round badge — stays in top dark zone for readability
  const roundLabel = `ROUND ${c.round_number}`;
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  const rlW = ctx.measureText(roundLabel).width + 56;
  fillRR(ctx, W / 2 - rlW / 2, 256, rlW, 52, 40, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(roundLabel, W / 2, 282);

  let _badgeBottom = 316;
  if (c.difficulty) {
    const dt = (c.difficulty as string).toUpperCase();
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    const dw = ctx.measureText(dt).width + 36;
    fillRR(ctx, W / 2 - dw / 2, _badgeBottom, dw, 38, 40, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dt, W / 2, _badgeBottom + 19);
    _badgeBottom += 52;
  }

  // Center (question + card) block in the space between badge and CTA area
  const _contentH = _preQH + 44 + _cardH;
  const _spaceTop = _badgeBottom + 40;
  const _spaceBot = H - 480;
  const questionY = Math.max(_spaceTop, Math.round((_spaceTop + _spaceBot) / 2 - _contentH / 2));
  const cardY = questionY + _preQH + 44;

  // Question
  ctx.font = '700 60px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.92)'; ctx.shadowBlur = 24;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  _preQLines.forEach((ln, i) => ctx.fillText(ln, W / 2, questionY + i * _preQLH));
  ctx.shadowBlur = 0;

  // ── Scramble card: full-width, intentional layout ─────────────────────────────
  const cardH = _cardH;
  fillRR(ctx, M, cardY, CW, cardH, 28, 'rgba(1,8,22,0.85)');
  strokeRR(ctx, M, cardY, CW, cardH, 28, 'rgba(0,160,255,0.30)', 1.5);

  // "UNSCRAMBLE ↓" label
  ctx.font = '700 29px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(0,200,255,0.78)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '4px';
  ctx.fillText('UNSCRAMBLE  \u2193', W / 2, cardY + cardPadY);
  ctx.letterSpacing = '0px';

  // Separator line
  ctx.strokeStyle = 'rgba(0,160,255,0.16)';
  ctx.lineWidth = 1;
  const sepY = cardY + cardPadY + 48;
  ctx.beginPath();
  ctx.moveTo(M + 60, sepY);
  ctx.lineTo(M + CW - 60, sepY);
  ctx.stroke();

  // Scrambled letters — word by word with precise per-character spacing
  ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = '#00f2ea';
  ctx.shadowColor = 'rgba(0,200,255,0.42)';
  ctx.shadowBlur = 46;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const sWords = scrambled.split(' ');
  const interWordGap = fontSize * 0.36;

  // Measure total render width
  let totalW = 0;
  sWords.forEach((word, wi) => {
    word.split('').forEach(ch => { totalW += ctx.measureText(ch).width; });
    if (word.length > 1) totalW += (word.length - 1) * letterGap;
    if (wi < sWords.length - 1) totalW += interWordGap;
  });

  const lettersY = cardY + cardPadY + labelRowH + letterRowH / 2;
  let curX = W / 2 - totalW / 2;

  sWords.forEach((word, wi) => {
    word.split('').forEach((ch, ci) => {
      ctx.fillText(ch, curX, lettersY);
      curX += ctx.measureText(ch).width;
      if (ci < word.length - 1) curX += letterGap;
    });
    if (wi < sWords.length - 1) curX += interWordGap;
  });

  ctx.shadowBlur = 0;

  // Hint at bottom of card
  ctx.font = '400 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(140,200,255,0.52)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Every letter appears exactly once', W / 2, cardY + cardH - cardPadY);

  // CTA
  const cta = 'COMMENT YOUR ANSWER \u2193';
  ctx.font = '700 34px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const ctaW = ctx.measureText(cta).width + 120;
  const ctaH = 84;
  fillRR(ctx, W / 2 - ctaW / 2, H - 440, ctaW, ctaH, 60, '#ff2d55');
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(cta, W / 2, H - 440 + ctaH / 2);
}

function renderReveal(ctx: CanvasRenderingContext2D, c: SlideContent, isFame = false, isEmpire = false) {
  const scoringType = c.scoring_type || (c.answers && c.answers.length > 1 ? 'pointless' : 'difficulty');

  // Header — top of safe area
  let y = 220;
  ctx.font = '800 34px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#00f2ea';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const rnW = ctx.measureText(`ROUND ${c.round_number}`).width;
  ctx.fillText(`ROUND ${c.round_number}`, M, y);
  ctx.fillStyle = '#ff2d55';
  ctx.fillText(' REVEAL', M + rnW, y);
  y += 52;

  ctx.font = '500 36px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  y += drawWrapped(ctx, c.question || '', W / 2, y, CW - 40, 46) + 24;

  if (scoringType === 'fight' && c.side_a && c.side_b) {
    const aWins = c.winner === c.side_a;
    const aPercent = c.side_a_percent ?? 50;
    const bPercent = c.side_b_percent ?? 50;

    // Winner announcement — auto-fit so long names don't overflow
    const _winStr = `★ ${c.winner} WINS`;
    const _winSz = fitText(ctx, _winStr, sz => `900 ${sz}px Inter, system-ui, sans-serif`, CW - 40, 50, 24);
    ctx.font = `900 ${_winSz}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(_winStr, W / 2, y);
    y += 80;

    // Panel
    const panelH = 480;
    fillRR(ctx, M, y, CW, panelH, 28, 'rgba(0,0,0,0.6)');
    let py = y + 48;

    // Side A — auto-fit name so it doesn't overlap the percentage label
    const _sideNameMaxW = CW - 96 - 150;
    const _saRevSz = fitText(ctx, c.side_a, sz => `${aWins ? '900' : '600'} ${sz}px Inter, system-ui, sans-serif`, _sideNameMaxW, 44, 22);
    ctx.font = `${aWins ? '900' : '600'} ${_saRevSz}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = aWins ? '#ffd700' : 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(c.side_a, M + 48, py);
    ctx.font = '800 48px Inter, system-ui, sans-serif';
    ctx.fillStyle = aWins ? '#ffd700' : 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`${aPercent}%`, M + CW - 48, py);
    py += 64;
    fillRR(ctx, M + 48, py, CW - 96, 18, 9, 'rgba(255,255,255,0.1)');
    fillRR(ctx, M + 48, py, Math.max(18, (aPercent / 100) * (CW - 96)), 18, 9, aWins ? (isFame ? '#a050ff' : '#ff2d55') : (isFame ? 'rgba(160,80,255,0.4)' : 'rgba(255,45,85,0.4)'));
    py += 56;

    // Side B — auto-fit name
    const _sbRevSz = fitText(ctx, c.side_b, sz => `${!aWins ? '900' : '600'} ${sz}px Inter, system-ui, sans-serif`, _sideNameMaxW, 44, 22);
    ctx.font = `${!aWins ? '900' : '600'} ${_sbRevSz}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = !aWins ? '#ffd700' : 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(c.side_b, M + 48, py);
    ctx.font = '800 48px Inter, system-ui, sans-serif';
    ctx.fillStyle = !aWins ? '#ffd700' : 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(`${bPercent}%`, M + CW - 48, py);
    py += 64;
    fillRR(ctx, M + 48, py, CW - 96, 18, 9, 'rgba(255,255,255,0.1)');
    fillRR(ctx, M + 48, py, Math.max(18, (bPercent / 100) * (CW - 96)), 18, 9, !aWins ? (isFame ? '#dca000' : '#0078ff') : (isFame ? 'rgba(220,160,0,0.4)' : 'rgba(0,120,255,0.4)'));

    y += panelH + 40;

    if (c.fun_fact) {
      ctx.font = 'italic 400 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      drawWrapped(ctx, `"${c.fun_fact}"`, W / 2, y, CW - 80, 48);
    }
    return;
  }

  if (scoringType === 'pointless' && c.answers?.length) {
    const maxPts = Math.max(...c.answers.map(a => a.points), 1);
    const panelH = H - y - 100;
    fillRR(ctx, M, y, CW, panelH, 24, 'rgba(0,0,0,0.55)');
    y += 40;
    const itemH = (panelH - 80) / c.answers.length;

    c.answers.forEach(ans => {
      const barW = Math.max(4, (ans.points / maxPts) * (CW - 96));
      const _ansText = ans.text + (ans.is_pointless ? ' ★' : '');
      const _ptlSz = fitText(ctx, _ansText, sz => `${ans.is_pointless ? 800 : 600} ${sz}px Inter, system-ui, sans-serif`, CW - 96 - 150, 36, 20);
      ctx.font = `${ans.is_pointless ? 800 : 600} ${_ptlSz}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = ans.is_pointless ? '#00f2ea' : 'white';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(_ansText, M + 48, y);
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
      // Event name: auto-fit so long names don't overrun the year label
      const _evMaxW = CW - 200; // 100px left offset + 100px right margin for year
      const _evSz = fitText(ctx, item.event, sz => `700 ${sz}px Inter, system-ui, sans-serif`, _evMaxW, 38, 20);
      ctx.font = `700 ${_evSz}px Inter, system-ui, sans-serif`;
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
    // Difficulty mode — answer dominates center of screen
    const tiers: Record<string, { label: string; color: string; stars: number }> = {
      easy: { label: 'EASY', color: '#22c55e', stars: 1 },
      medium: { label: 'MEDIUM', color: '#f59e0b', stars: 2 },
      hard: { label: 'HARD', color: '#f97316', stars: 3 },
      impossible: { label: 'IMPOSSIBLE', color: '#ef4444', stars: 4 },
    };
    const tier = tiers[c.difficulty_tier || 'medium'];

    // Pre-measure answer so we can anchor it at screen center
    const { sz: _ansSz, lines: _ansLines, lineH: _ansLH } = fitWrapped(
      ctx, c.correct_answer || '', sz => `900 ${sz}px Inter, system-ui, sans-serif`,
      CW - 80, 2, 140, 52
    );
    const _ansBlockH = _ansLines.length * _ansLH;
    // Place answer slightly above center to leave breathing room for stars/fact below
    const _ansY = Math.max(y + 40, H / 2 - _ansBlockH / 2 - 60);

    // Panel behind the centered content block
    const _panelTop = Math.max(y, _ansY - 80);
    fillRR(ctx, M, _panelTop, CW, H - _panelTop - 80, 24,
      c.scrambled ? 'rgba(0,0,0,0.82)' : isEmpire ? 'rgba(6,2,14,0.78)' : 'rgba(0,0,0,0.60)');

    // Atmospheric glow centered on answer
    if (c.scrambled || isEmpire) {
      const _glowCY = _ansY + _ansBlockH / 2;
      const goldGlow = ctx.createRadialGradient(W / 2, _glowCY, 0, W / 2, _glowCY, isEmpire ? 420 : 340);
      goldGlow.addColorStop(0, isEmpire ? 'rgba(255,200,40,0.22)' : 'rgba(255,200,0,0.18)');
      goldGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = goldGlow;
      ctx.fillRect(M, _panelTop, CW, H - _panelTop - 80);
    }

    // Answer — anchored at vertical center
    ctx.font = `900 ${_ansSz}px Inter, system-ui, sans-serif`;
    if (c.scrambled) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 60;
    } else if (isEmpire) {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = 'rgba(255,200,0,0.75)';
      ctx.shadowBlur = 72;
    } else {
      ctx.fillStyle = '#00f2ea';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 24;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    _ansLines.forEach((ln, i) => ctx.fillText(ln, W / 2, _ansY + i * _ansLH));
    ctx.shadowBlur = 0;

    let _py = _ansY + _ansBlockH + 40;

    // Tier stars below answer
    if (tier) {
      const starSz = 40, gap = 8;
      const totalW = 4 * (starSz + gap) - gap + ctx.measureText(tier.label).width + 36;
      let sx = W / 2 - totalW / 2;
      ctx.font = `400 ${starSz}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < tier.stars ? tier.color : 'rgba(255,255,255,0.15)';
        ctx.textAlign = 'left';
        ctx.fillText('★', sx, _py);
        sx += starSz + gap;
      }
      ctx.font = '800 30px Inter, system-ui, sans-serif';
      ctx.fillStyle = tier.color;
      ctx.fillText(tier.label, sx + 8, _py + 8);
      _py += starSz + 40;
    }

    // Scramble transformation line — scrambled → ANSWER
    if (c.scrambled && c.correct_answer) {
      const transformLine = `${c.scrambled}  \u2192  ${c.correct_answer.toUpperCase()}`;
      const _trSz = fitText(ctx, transformLine, sz => `700 ${sz}px Inter, system-ui, sans-serif`, CW - 80, 40, 18);
      fillRR(ctx, M + 20, _py, CW - 40, 80, 16, 'rgba(255,200,0,0.10)');
      ctx.font = `700 ${_trSz}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,215,0,0.88)';
      ctx.letterSpacing = '4px';
      ctx.shadowColor = 'rgba(255,215,0,0.50)';
      ctx.shadowBlur = 24;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(transformLine, W / 2, _py + 40);
      ctx.letterSpacing = '0px';
      ctx.shadowBlur = 0;
      _py += 100;
    }

    if (c.fun_fact) {
      ctx.font = 'italic 400 34px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      drawWrapped(ctx, `"${c.fun_fact}"`, W / 2, _py, CW - 80, 48);
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
  const isFightRound = formatType === 'civilization-fight' && slide.slide_type === 'round';
  const isFameBattleRound = formatType === 'fame-battle' && slide.slide_type === 'round';
  const isFameBattleReveal = formatType === 'fame-battle' && slide.slide_type === 'reveal';
  const isScrambleRound = (formatType === 'scrambled-capitals' || formatType === 'scrambled-countries') && slide.slide_type === 'round';
  const isFlagStyleRound = isFlagRound || isPartialFlagRound; // empire has its own renderer
  const isEmpireReveal = formatType === 'guess-the-empire' && slide.slide_type === 'reveal';

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  if (slide.image_path) {
    try {
      const img = await loadImage(slide.image_path);
      if (isPartialFlagRound) {
        // Draw dark cinematic background — flag drawn later inside clipped card
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
        g.addColorStop(0, 'rgba(0,242,234,0.06)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Card dimensions
        const cardW = 880, cardH = 540;
        const cardX = (W - cardW) / 2;
        const cardY = H / 2 - cardH / 2 + 80;

        // Clip to card and draw flag fragment with offset — only 15-28% of flag visible
        ctx.save();
        rrPath(ctx, cardX, cardY, cardW, cardH, 28);
        ctx.clip();
        const CROP_CONFIGS = [
          { zoom: 1.15, xFrac: -0.05, yFrac: -0.10 },  // ~87% visible
          { zoom: 1.34, xFrac: -0.15, yFrac: -0.12 },  // ~75% visible
          { zoom: 1.57, xFrac: -0.20, yFrac: -0.15 },  // ~64% visible
          { zoom: 2.00, xFrac: -0.30, yFrac: -0.20 },  // ~50% visible
          { zoom: 2.85, xFrac: -0.45, yFrac: -0.30 },  // ~35% visible
        ];
        const roundNum = (slide.content.round_number ?? 1) as number;
        const cfg = CROP_CONFIGS[Math.min(roundNum - 1, 4)];
        const scaledW = cardW * cfg.zoom;
        const scaledH = scaledW / (img.width / img.height);
        ctx.fillStyle = '#111120';
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.drawImage(img, cardX + cfg.xFrac * cardW, cardY + cfg.yFrac * cardH, scaledW, scaledH);
        ctx.restore();

        // Card border + glow
        ctx.shadowColor = 'rgba(0,242,234,0.25)';
        ctx.shadowBlur = 60;
        strokeRR(ctx, cardX, cardY, cardW, cardH, 28, 'rgba(255,255,255,0.12)', 2);
        ctx.shadowBlur = 0;
      } else if (isFlagRound) {
        drawContain(ctx, img);
      } else {
        drawCover(ctx, img);
      }
    } catch {}
  }

  const { slide_type, content } = slide;

  if (slide_type === 'title') { renderTitle(ctx, content); }
  else if (isPartialFlagRound)  { renderPartialFlagRoundText(ctx, content); }
  else if (isEmpireRound)       { flagOverlay(ctx);  renderEmpireRound(ctx, content); }
  else if (isFlagStyleRound)    { flagOverlay(ctx);  renderFlagRound(ctx, content); }
  else if (isFightRound)        { stdOverlay(ctx);   renderFightRound(ctx, content); }
  else if (isFameBattleRound)   { stdOverlay(ctx);   renderFameBattleRound(ctx, content); }
  else if (isFameBattleReveal)  { stdOverlay(ctx);   renderReveal(ctx, content, true); }
  else if (isScrambleRound)     { renderScrambleRound(ctx, content); }
  else if (slide_type === 'round')  { stdOverlay(ctx); renderRound(ctx, content); }
  else if (slide_type === 'reveal') { stdOverlay(ctx); renderReveal(ctx, content, false, isEmpireReveal); }
  else if (slide_type === 'score')  { titleOverlay(ctx); renderScore(ctx, content); }

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
