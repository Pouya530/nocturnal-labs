import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0a0a12 0%, #1a1028 100%)',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            border: '14px solid #c4b5fd',
            boxSizing: 'border-box',
          }}
        />
      </div>
    ),
    { width: 180, height: 180 },
  );
}
