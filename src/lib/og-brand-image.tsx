import { ImageResponse } from 'next/og';

const W = 1200;
const H = 630;

const bg = '#05050a';
const accent = '#c4b5fd';

/** Shared 1200×630 branded frame for Open Graph and Twitter cards. */
export function nlBrandedImageResponse(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 50% 38%, ${bg} 0%, #0c0618 42%, #12082a 100%)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 85% 70% at 50% 50%, transparent 0%, transparent 35%, rgba(124,58,237,0.12) 62%, rgba(236,72,153,0.18) 100%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            padding: 48,
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#fafafa',
              lineHeight: 1.05,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Nocturnal Labs
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: accent,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Digital experiences
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 22,
              color: 'rgba(228, 228, 235, 0.72)',
              maxWidth: 820,
              lineHeight: 1.45,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Full-service agency crafting standout digital experiences for leading brands.
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
