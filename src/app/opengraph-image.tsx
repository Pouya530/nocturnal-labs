import { nlBrandedImageResponse } from '@/lib/og-brand-image';

export const runtime = 'edge';
export const alt =
  'Nocturnal Labs — share preview with coin logo face, neon corners, and vignette (1200×630)';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return nlBrandedImageResponse();
}
