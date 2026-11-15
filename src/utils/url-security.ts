/**
 * @file url-security.ts
 * @si-attribution Security validation helpers structured using Super Intelligence (Google AI Studio / Gemini).
 */

const ALLOWED_EXTERNAL_HOST_SUFFIXES = [
  'nasa.gov',
  'github.com',
  'raw.githubusercontent.com',
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'cesium.com',
  'wikimedia.org',
] as const;

const YOUTUBE_HOSTS = new Set([
  'youtu.be',
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
]);

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const SAFE_RELATIVE_MODEL_REGEX = /^\/models?\/[A-Za-z0-9%._~/-]+$/;
const CESIUM_TOKEN_REGEX = /^[A-Za-z0-9._-]+$/;

function hostMatchesAllowlist(
  hostname: string,
  allowlist: readonly string[]
): boolean {
  const lower = hostname.toLowerCase();
  return allowlist.some(
    (allowed) => lower === allowed || lower.endsWith(`.${allowed}`)
  );
}

/**
 * Validates and normalizes an external HTTPS URL against an allowlist of trusted hosts.
 * Rejects non-HTTPS protocols, embedded credentials, and untrusted domains.
 */
export function sanitizeExternalUrl(
  rawUrl: string | null | undefined,
  allowedHostSuffixes: readonly string[] = ALLOWED_EXTERNAL_HOST_SUFFIXES
): string | null {
  if (typeof rawUrl !== 'string') return null;
  const cleaned = rawUrl.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (!hostMatchesAllowlist(parsed.hostname, allowedHostSuffixes)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts and validates an 11-character YouTube video ID strictly from allowlisted YouTube URLs.
 */
export function extractSafeYouTubeId(rawUrl: string | null | undefined): string | null {
  const safeUrl = sanitizeExternalUrl(rawUrl, ['youtu.be', 'youtube.com', 'youtube-nocookie.com']);
  if (!safeUrl) return null;

  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    let candidate: string | null = null;
    if (host === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (parsed.pathname.startsWith('/embed/')) {
      candidate = parsed.pathname.split('/')[2] ?? null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      candidate = parsed.pathname.split('/')[2] ?? null;
    } else {
      candidate = parsed.searchParams.get('v');
    }

    if (!candidate || !YOUTUBE_ID_REGEX.test(candidate)) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

/**
 * Validates that a 3D model URL points either to an expected local `/model/` or `/models/` asset
 * (with no path traversal) or to an allowlisted HTTPS origin.
 */
export function isAllowedModelUrl(rawUrl: string | null | undefined): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('..') || trimmed.includes('\\')) {
      return false;
    }
    return SAFE_RELATIVE_MODEL_REGEX.test(trimmed);
  }

  return (
    sanitizeExternalUrl(trimmed, ['raw.githubusercontent.com', 'nasa.gov']) !== null
  );
}

/**
 * Validates user-supplied Cesium Ion access tokens for expected characters and bounded length.
 */
export function sanitizeCesiumIonToken(rawToken: string | null | undefined): string {
  if (typeof rawToken !== 'string') return '';
  const trimmed = rawToken.trim();
  if (!trimmed || trimmed.length > 2048) return '';
  return CESIUM_TOKEN_REGEX.test(trimmed) ? trimmed : '';
}
