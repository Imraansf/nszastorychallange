/**
 * @file main.tsx
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * Voice narration uses Gemini TTS (/api/tts) with Web Speech fallback; all imagery and storytelling are human-created.
 */

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
