import { ImageResponse } from 'next/og';

import { getSiteUrl } from '@/lib/site';

const W = 1200;
const H = 630;

/** Same front face as the 3D coin (`LogoCoin.tsx`) */
const COIN_FACE_PATH = '/brand/updated-latin-motto.png';

/**
 * 1200×630 share image inspired by the live landing: dark void centre, neon fractal-like
 * colour in the corners, iridescent coin rim with real logo face, and typographic hierarchy.
 */
export function nlBrandedImageResponse(): ImageResponse {
  const coinFaceSrc = `${getSiteUrl()}${COIN_FACE_PATH}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
          background: '#020204',
        }}
      >
        {/* Corner colour masses — palette aligned with Julia / iridescent UI */}
        <div
          style={{
            position: 'absolute',
            top: -140,
            left: -200,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(34,197,94,0.55) 0%, rgba(14,165,233,0.4) 38%, rgba(124,58,237,0.2) 62%, transparent 72%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -220,
            width: 580,
            height: 580,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(236,72,153,0.52) 0%, rgba(192,38,211,0.38) 40%, rgba(37,99,235,0.22) 65%, transparent 74%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            left: -180,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(234,179,8,0.45) 0%, rgba(249,115,22,0.38) 42%, rgba(236,72,153,0.22) 68%, transparent 76%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            right: -160,
            width: 540,
            height: 540,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(14,165,233,0.5) 0%, rgba(124,58,237,0.42) 45%, rgba(34,197,94,0.18) 70%, transparent 78%)',
          }}
        />

        {/* Circular vignette — transparent core, darker rim (matches site overlay) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 46%, transparent 0%, transparent 18%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.55) 68%, rgba(2,2,4,0.94) 100%)',
          }}
        />

        {/* Centre stack: coin + titles */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 8,
          }}
        >
          {/* Gradient rim + real coin face (matches hero LogoCoin front texture) */}
          <div
            style={{
              width: 232,
              height: 232,
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(125deg, #ff0080 0%, #7c3aed 22%, #2563eb 44%, #14b8a6 62%, #22c55e 78%, #eab308 92%, #f97316 100%)',
            }}
          >
            <div
              style={{
                width: 198,
                height: 198,
                borderRadius: 9999,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(196,181,253,0.35)',
                background: '#0a0814',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse requires native img for Satori */}
              <img
                src={coinFaceSrc}
                width={198}
                height={198}
                alt=""
                style={{
                  width: 198,
                  height: 198,
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 44,
              fontWeight: 700,
              color: '#fafafa',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Nocturnal Labs
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 19,
              color: 'rgba(228, 228, 235, 0.78)',
              maxWidth: 780,
              textAlign: 'center',
              lineHeight: 1.45,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            Full-service agency crafting standout digital experiences for leading brands.
          </div>
        </div>

        {/* Bottom accent strip — echoes marquee / iridescent rail */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            zIndex: 3,
            background:
              'linear-gradient(90deg, #ff0080 0%, #c026d3 14%, #7c3aed 28%, #2563eb 42%, #0ea5e9 56%, #14b8a6 70%, #22c55e 84%, #eab308 92%, #f97316 100%)',
            opacity: 0.92,
          }}
        />
      </div>
    ),
    { width: W, height: H },
  );
}
