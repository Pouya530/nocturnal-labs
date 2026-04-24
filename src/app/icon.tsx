import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a12',
          borderRadius: 7,
        }}
      >
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: '#e9d5ff',
            boxShadow: '0 0 0 3px #c4b5fd',
          }}
        />
      </div>
    ),
    { width: 32, height: 32 },
  );
}
