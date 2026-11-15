import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

app.use(express.json({ limit: '1mb' }));

const ALLOWED_VOICES = new Set(['Sami', 'Riko']);
const ttsCache = new Map<string, { audioBase64: string; mimeType: string }>();
const MAX_TTS_CACHE_ENTRIES = 64;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
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
  voiceName: string,
  style: string
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
                  style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
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
      const isRetryable = status === 429 || status === 503 || status >= 500;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError;
}

app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const requestedVoice = typeof req.body?.voiceName === 'string' ? req.body.voiceName.trim() : 'Sami';
    const style =
      typeof req.body?.style === 'string' && req.body.style.trim()
        ? req.body.style.trim()
        : 'Warm, expressive, clear NASA spacecraft storyteller narrating a personal space diary';

    if (!rawText) {
      res.status(400).json({ error: 'Text is required for speech synthesis.' });
      return;
    }

    if (!ALLOWED_VOICES.has(requestedVoice)) {
      res.status(400).json({ error: `Unsupported voice "${requestedVoice}". Expected "Sami" or "Riko".` });
      return;
    }

    const text = rawText.slice(0, 5000);
    const cacheKey = `${requestedVoice}:${text}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, voiceName: requestedVoice, cached: true });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Check the Settings > Secrets panel.',
      });
      return;
    }

    const response = await generateTtsWithRetry(ai, text, requestedVoice, style);
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p.inlineData?.data);
    const audioBase64 = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      res.status(502).json({ error: 'Gemini TTS did not return audio data.' });
      return;
    }

    if (ttsCache.size >= MAX_TTS_CACHE_ENTRIES) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, { audioBase64, mimeType });

    res.json({ audioBase64, mimeType, voiceName: requestedVoice });
  } catch (err: unknown) {
    console.error('Server TTS generation error:', err);
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status) || 500
        : 500;
    const message =
      err instanceof Error ? err.message : 'Failed to generate voice narration.';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
  }
});

// Serve frontend in production or through Vite in development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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
