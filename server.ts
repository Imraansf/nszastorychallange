/**
 * @file server.ts
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * Audio narration (/api/tts) is dynamically synthesized using Google Gemini Text-to-Speech (TTS) models.
 * All archival photography and mission storytelling remain human-authored/curated.
 */

import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const portArgIdx = process.argv.indexOf('--port');
const cliPort =
  portArgIdx !== -1 && process.argv[portArgIdx + 1]
    ? Number(process.argv[portArgIdx + 1])
    : undefined;
const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
const nginxPort = process.env.NGINX_PORT ? Number(process.env.NGINX_PORT) : undefined;
const defaultAppPort = process.env.DEFAULT_APP_PORT
  ? Number(process.env.DEFAULT_APP_PORT)
  : 3000;
const PORT =
  cliPort ||
  (envPort && envPort !== nginxPort ? envPort : defaultAppPort);

// Baseline HTTP security headers (iframe embedding stays permitted for AI Studio hosting)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Strict JSON body limit for API requests
app.use('/api', express.json({ limit: '24kb' }));

// Origin / CORS enforcement for /api/*
const configuredOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const SAFE_HOST_HEADER_REGEX = /^[a-z0-9.-]+(?::\d{1,5})?$/i;

function isOriginAllowed(origin: string, req: Request): boolean {
  if (configuredOrigins.has(origin)) {
    return true;
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'https:' && parsedOrigin.protocol !== 'http:') {
    return false;
  }

  const isHttpsRequest =
    req.secure || req.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase() === 'https';
  if (process.env.NODE_ENV === 'production' && isHttpsRequest && parsedOrigin.protocol !== 'https:') {
    return false;
  }

  // Only accept x-forwarded-host when behind a TLS/proxy header; validate host syntax strictly
  const rawHost =
    (req.get('x-forwarded-proto') ? req.get('x-forwarded-host') : undefined) ||
    req.get('host') ||
    '';
  const hostHeader = rawHost.split(',')[0].trim().toLowerCase();

  if (hostHeader && SAFE_HOST_HEADER_REGEX.test(hostHeader) && parsedOrigin.host.toLowerCase() === hostHeader) {
    return true;
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    (parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1')
  ) {
    return true;
  }

  return false;
}

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  const origin = req.get('origin');
  const secFetchSite = req.get('sec-fetch-site');

  if (origin) {
    if (!isOriginAllowed(origin, req)) {
      res.status(403).json({ error: 'Origin not allowed.' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'X-SI-Generated, X-SI-Model');
  } else if (secFetchSite === 'cross-site') {
    res.status(403).json({ error: 'Cross-site API access denied.' });
    return;
  }

  res.setHeader('Access-Control-Expose-Headers', 'X-SI-Generated, X-SI-Model');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// Rate limiting (sliding window per client IP + global burst cap to prevent billing spikes)
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TTS_REQUESTS_PER_IP = 25;
const MAX_GLOBAL_UPSTREAM_CALLS_PER_WINDOW = 120;
const MAX_RATE_LIMIT_BUCKETS = 5000;

const ipBuckets = new Map<string, number[]>();
let globalUpstreamTimestamps: number[] = [];

function getClientIp(req: Request): string {
  return (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
}

function checkRateLimit(
  map: Map<string, number[]>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const recent = (map.get(key) || []).filter((ts) => ts > cutoff);

  if (recent.length >= limit) {
    map.set(key, recent);
    const oldest = recent[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  if (map.size >= MAX_RATE_LIMIT_BUCKETS && !map.has(key)) {
    for (const [k, timestamps] of map.entries()) {
      if (timestamps.every((ts) => ts <= cutoff)) {
        map.delete(k);
      }
      if (map.size < MAX_RATE_LIMIT_BUCKETS) break;
    }
    if (map.size >= MAX_RATE_LIMIT_BUCKETS) {
      const oldestKey = map.keys().next().value;
      if (oldestKey) map.delete(oldestKey);
    }
  }

  recent.push(now);
  map.set(key, recent);
  return { allowed: true, retryAfterSec: 0 };
}

function consumeGlobalUpstreamBudget(): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  globalUpstreamTimestamps = globalUpstreamTimestamps.filter((ts) => ts > cutoff);
  if (globalUpstreamTimestamps.length >= MAX_GLOBAL_UPSTREAM_CALLS_PER_WINDOW) {
    return false;
  }
  globalUpstreamTimestamps.push(now);
  return true;
}

const ALLOWED_VOICES = new Set(['Sami', 'Riko']);
const ALLOWED_BODY_KEYS = new Set(['text', 'voiceName']);
const MAX_TTS_TEXT_LENGTH = 4000;

// Server-owned narration style constant (never accepts untrusted client prompt/style overrides)
const SERVER_NARRATION_STYLE =
  'Warm, expressive, clear NASA spacecraft storyteller narrating a personal space diary';

const TTS_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();
const MAX_TTS_CACHE_ENTRIES = 64;

function sanitizeTtsText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getGeminiClient(): GoogleGenAI | null {
  // Strictly read GEMINI_API_KEY (supports both AQ. and AIza key formats; never falls back to GOOGLE_API_KEY)
  const apiKey = typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : '';
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: 'v1beta',
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateTtsWithRetry(
  ai: GoogleGenAI,
  text: string,
  voiceName: string
) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style: SERVER_NARRATION_STYLE,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          safetySettings: TTS_SAFETY_SETTINGS,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 0;
      const isRetryable =
        (status === 429 && attempt < 2) || status === 503 || status >= 500;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    if (!req.is('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json.' });
      return;
    }

    const clientIp = getClientIp(req);
    const rate = checkRateLimit(
      ipBuckets,
      clientIp,
      MAX_TTS_REQUESTS_PER_IP,
      RATE_LIMIT_WINDOW_MS
    );
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      res.status(429).json({
        error: 'Too many voice synthesis requests. Please wait a moment and try again.',
      });
      return;
    }

    if (!isPlainObject(req.body)) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    for (const key of Object.keys(req.body)) {
      if (!ALLOWED_BODY_KEYS.has(key)) {
        res.status(400).json({ error: 'Unsupported parameter in request payload.' });
        return;
      }
    }

    if (typeof req.body.text !== 'string') {
      res.status(400).json({ error: 'Text must be a non-empty string.' });
      return;
    }

    if (req.body.voiceName !== undefined && typeof req.body.voiceName !== 'string') {
      res.status(400).json({ error: 'voiceName must be a string.' });
      return;
    }

    const text = sanitizeTtsText(req.body.text);
    if (!text) {
      res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }
    if (text.length > MAX_TTS_TEXT_LENGTH) {
      res.status(400).json({
        error: `Text exceeds the maximum length of ${MAX_TTS_TEXT_LENGTH} characters.`,
      });
      return;
    }

    const requestedVoice =
      typeof req.body.voiceName === 'string' && req.body.voiceName.trim()
        ? req.body.voiceName.trim()
        : 'Sami';

    if (!ALLOWED_VOICES.has(requestedVoice)) {
      res.status(400).json({
        error: 'Unsupported voice requested.',
      });
      return;
    }

    const cacheKey = crypto
      .createHash('sha256')
      .update(`${requestedVoice}:${text}`)
      .digest('hex');

    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.setHeader('X-SI-Generated', 'true');
      res.setHeader('X-SI-Model', 'Gemini-TTS');
      res.json({ ...cached, voiceName: requestedVoice, cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      console.error('Server TTS unavailable: GEMINI_API_KEY is not configured.');
      res.status(503).json({
        error: 'Voice narration service is currently unavailable.',
        code: 'KEY_NOT_CONFIGURED',
        fallbackRecommended: true,
      });
      return;
    }

    if (!consumeGlobalUpstreamBudget()) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({
        error: 'Voice narration service is busy. Please try again shortly.',
        code: 'RATE_LIMITED',
        fallbackRecommended: true,
      });
      return;
    }

    const response = await generateTtsWithRetry(ai, text, requestedVoice);
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p.inlineData?.data);
    const audioBase64 = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      res.status(502).json({
        error: 'Unable to generate voice audio right now.',
        code: 'EMPTY_AUDIO',
        fallbackRecommended: true,
      });
      return;
    }

    if (ttsCache.size >= MAX_TTS_CACHE_ENTRIES) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, { audioBase64, mimeType });

    res.setHeader('X-SI-Generated', 'true');
    res.setHeader('X-SI-Model', 'Gemini-TTS');
    res.json({ audioBase64, mimeType, voiceName: requestedVoice });
  } catch (err: unknown) {
    const upstreamStatus =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status) || 500
        : 500;
    console.error('Server TTS generation failed with status:', upstreamStatus);

    if (upstreamStatus === 429) {
      res.setHeader('Retry-After', '30');
      res.status(429).json({
        error: 'Voice synthesis quota reached. Using browser voice narration.',
        code: 'RATE_LIMITED',
        fallbackRecommended: true,
      });
      return;
    }

    if (upstreamStatus === 403) {
      res.status(403).json({
        error: 'Voice synthesis unavailable for current API tier. Using browser voice narration.',
        code: 'TIER_RESTRICTED',
        fallbackRecommended: true,
      });
      return;
    }

    if (upstreamStatus === 404) {
      res.status(404).json({
        error: 'Requested voice model unavailable on current tier. Using browser voice narration.',
        code: 'MODEL_UNAVAILABLE',
        fallbackRecommended: true,
      });
      return;
    }

    if (upstreamStatus === 400 || upstreamStatus === 401) {
      res.status(503).json({
        error: 'Voice synthesis authentication failed. Using browser voice narration.',
        code: 'AUTH_OR_CONFIG_ERROR',
        fallbackRecommended: true,
      });
      return;
    }

    res.status(502).json({
      error: 'Unable to generate voice narration right now.',
      code: 'UPSTREAM_ERROR',
      fallbackRecommended: true,
    });
  }
});

// Unknown / unsupported /api/* routes fail closed with JSON (never SPA HTML fallback)
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Safe Express error handler (malformed JSON, payload too large, etc.) without stack leakage
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errObj = typeof err === 'object' && err !== null ? (err as { type?: string; status?: number }) : {};
  if (errObj.type === 'entity.too.large' || errObj.status === 413) {
    res.status(413).json({ error: 'Request payload too large.' });
    return;
  }
  if (err instanceof SyntaxError && errObj.status === 400) {
    res.status(400).json({ error: 'Malformed JSON payload.' });
    return;
  }
  console.error('Unhandled API middleware error:', errObj.status || 500);
  res.status(500).json({ error: 'Internal server error.' });
});

// Serve frontend in production or through Vite in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        dotfiles: 'ignore',
        maxAge: '1h',
      })
    );
    app.get('*', (req: Request, res: Response) => {
      if (
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/model/') ||
        req.path.startsWith('/models/') ||
        /\.(?:glb|gltf|wasm|js|css|map|png|jpe?g|webp|svg|ico|json)$/i.test(req.path)
      ) {
        res.status(404).send('Not found');
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`NASA Relics Server running at http://localhost:${PORT}`);
  });
}

startServer();
