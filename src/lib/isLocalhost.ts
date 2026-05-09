/** True when running in the browser on a local dev hostname. */
export function isLocalhostHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

/**
 * Host header value may include a port (`localhost:3000`, `[::1]:3000`). Returns the hostname only.
 */
export function hostnameFromHostHeader(host: string): string {
  const h = host.trim();
  if (!h) return '';
  if (h.startsWith('[')) {
    const end = h.indexOf(']');
    return end !== -1 ? h.slice(1, end) : h;
  }
  const colon = h.lastIndexOf(':');
  if (colon > 0 && /^\d+$/.test(h.slice(colon + 1))) {
    return h.slice(0, colon);
  }
  return h;
}

/** Request `Host` header indicates loopback (dev server on machine). */
export function isLocalhostHostHeader(host: string): boolean {
  return isLocalhostHostname(hostnameFromHostHeader(host));
}
