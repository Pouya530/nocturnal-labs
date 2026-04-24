/* eslint-disable react/no-danger -- JSON-LD must be embedded as a script payload */
type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Safe JSON-LD script for Schema.org (escapes `<` for HTML embedding).
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
