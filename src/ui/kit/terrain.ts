/**
 * Dessin de la pelouse (composant Terrain du design system) : bandes de tonte,
 * brins d'herbe à graine fixe et lignes de craie, avec les couleurs des tokens.
 * Green code : les brins sont regroupés par couleur et opacité pour ne tracer
 * que quelques chemins, et le dessin n'a lieu qu'au redimensionnement ou au changement de thème.
 */
import { createRng } from '../../domain/core/rng';

export interface TerrainOptions {
  lignes: boolean;
  /** 0.2 (calme) à 0.8 (gazon épais). */
  densite: number;
  graine: number;
}

const MOBILE_WIDTH = 600;
const MOBILE_BAND_RATIO = 0.75;
const PIXELS_PER_BLADE = 40;
const ALPHA_LEVELS = [0.45, 0.6, 0.75] as const;
const LINE_ALPHA = 0.85;

type Token = (name: string) => string;

export function drawTerrain(canvas: HTMLCanvasElement, options: TerrainOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const styles = getComputedStyle(canvas);
  const token: Token = (name) => styles.getPropertyValue(`--${name}`).trim();
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawMowingBands(ctx, token, width, height);
  drawBlades(ctx, token, width, height, options);
  if (options.lignes) drawChalkLines(ctx, token, width, height);
}

function drawMowingBands(ctx: CanvasRenderingContext2D, token: Token, width: number, height: number): void {
  let band = parseFloat(token('bande-tonte')) || 64;
  if (width < MOBILE_WIDTH) band = Math.min(band, 64 * MOBILE_BAND_RATIO);
  ctx.fillStyle = token('terrain');
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = token('terrain-tonte');
  for (let x = band; x < width; x += band * 2) ctx.fillRect(x, 0, band, height);
}

function drawBlades(
  ctx: CanvasRenderingContext2D,
  token: Token,
  width: number,
  height: number,
  { densite, graine }: TerrainOptions,
): void {
  const rng = createRng(graine);
  const count = Math.round((width * height * densite) / PIXELS_PER_BLADE);
  const colors = [token('brin'), token('brin-ombre')];
  const paths = colors.map(() => ALPHA_LEVELS.map(() => new Path2D()));
  for (let k = 0; k < count; k++) {
    const x = rng.next() * width;
    const y = rng.next() * height;
    const bladeHeight = 3 + rng.next() * 6;
    const slope = (rng.next() - 0.5) * 4;
    const path = paths[rng.next() < 0.5 ? 0 : 1]![Math.floor(rng.next() * ALPHA_LEVELS.length)]!;
    path.moveTo(x, y);
    path.lineTo(x + slope, y - bladeHeight);
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  paths.forEach((byAlpha, colorIndex) => {
    ctx.strokeStyle = colors[colorIndex]!;
    byAlpha.forEach((path, alphaIndex) => {
      ctx.globalAlpha = ALPHA_LEVELS[alphaIndex]!;
      ctx.stroke(path);
    });
  });
  ctx.globalAlpha = 1;
}

function drawChalkLines(ctx: CanvasRenderingContext2D, token: Token, width: number, height: number): void {
  const line = token('ligne');
  ctx.strokeStyle = line;
  ctx.fillStyle = line;
  ctx.lineWidth = parseFloat(token('trait-epais')) || 3;
  ctx.globalAlpha = LINE_ALPHA;
  const centerX = width * 0.42;
  const centerY = height / 2;
  const radius = Math.min(height * 0.28, 90);
  ctx.beginPath();
  ctx.moveTo(centerX, -10);
  ctx.lineTo(centerX, height + 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();
  const boxWidth = Math.min(width * 0.16, 140);
  ctx.strokeRect(width - boxWidth, centerY - height * 0.34, boxWidth + 10, height * 0.68);
  ctx.globalAlpha = 1;
}
