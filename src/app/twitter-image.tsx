import { nlBrandedImageResponse } from '@/lib/og-brand-image';

export const runtime = 'edge';
export const alt =
  'Nocturnal Labs — share preview: neon corners, vignette, and coin-style mark (1200×630)';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return nlBrandedImageResponse();
}
