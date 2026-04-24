import { nlBrandedImageResponse } from '@/lib/og-brand-image';

export const runtime = 'edge';
export const alt = 'Nocturnal Labs — digital experiences studio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return nlBrandedImageResponse();
}
