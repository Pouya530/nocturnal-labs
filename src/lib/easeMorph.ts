/** `cubic-bezier(0.65, 0, 0.35, 1)` — ambient glyph play ↔ pause morph. */
export function easeAmbientGlyphMorph(t: number): number {
  return cubicBezierY(0.65, 0, 0.35, 1, t);
}

function cubicBezierY(x1: number, y1: number, x2: number, y2: number, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const x =
      3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    const dx =
      3 * (1 - u) * (1 - u) * x1 +
      6 * (1 - u) * u * (x2 - x1) +
      3 * u * u * (1 - x2);
    if (Math.abs(x - t) < 1e-5) break;
    u -= (x - t) / (dx || 1);
    u = Math.min(1, Math.max(0, u));
  }
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
}
