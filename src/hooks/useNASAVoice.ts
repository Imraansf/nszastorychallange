/**
 * @file useNASAVoice.ts
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * Voice narration connects to /api/tts (Google Gemini TTS) with graceful browser Web Speech fallback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ArtifactVoiceName } from '../utils/space-data';

export interface UseNASAVoiceOptions {
  defaultPitch?: number;
  defaultRate?: number;
  defaultVolume?: number;
  defaultFilterEnabled?: boolean;
  defaultVoiceName?: ArtifactVoiceName;
}

export interface UseNASAVoiceReturn {
  speakMissionLog: (
    text: string,
    enableRadioFilter?: boolean,
    voiceName?: ArtifactVoiceName
  ) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  toggleMute: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  activeVoiceName: ArtifactVoiceName;
  isLoading: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  isMuted: boolean;
  voiceError: string | null;
  filterEnabled: boolean;
  setFilterEnabled: (enabled: boolean) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  rate: number;
  setRate: (rate: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  analyserNode: AnalyserNode | null;
  audioContext: AudioContext | null;
  currentText: string | null;
}

function base64ToWavBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function useNASAVoice(options: UseNASAVoiceOptions = {}): UseNASAVoiceReturn {
  const {
    defaultPitch = 1.0,
    defaultRate = 1.0,
    defaultVolume = 1.0,
    defaultFilterEnabled = true,
    defaultVoiceName = 'Sami',
  } = options;

  const [voices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [activeVoiceName, setActiveVoiceName] = useState<ArtifactVoiceName>(defaultVoiceName);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState<boolean>(defaultFilterEnabled);
  const [pitch, setPitch] = useState<number>(defaultPitch);
  const [rate, setRate] = useState<number>(defaultRate);
  const [volume, setVolume] = useState<number>(defaultVolume);
  const [currentText, setCurrentText] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const isSpeakingRef = useRef<boolean>(false);
  isSpeakingRef.current = isSpeaking;
  const isMutedRef = useRef<boolean>(false);
  isMutedRef.current = isMuted;

  const ensureAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Apollo Quindar Tone Generator (2525 Hz intro, 2475 Hz outro push-to-talk beep)
  const playQuindarTone = useCallback(
    (freq = 2525, duration = 0.028) => {
      if (isMuted) return;
      try {
        const ctx = ensureAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.003);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + duration - 0.003);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Ignore tone errors if audio context is blocked
      }
    },
    [isMuted, ensureAudioContext]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.onended = null;
      audioElRef.current.onerror = null;
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
    if (filterEnabled && isSpeakingRef.current) {
      playQuindarTone(2475, 0.025);
    }
    setIsLoading(false);
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentText(null);
  }, [filterEnabled, playQuindarTone]);

  const pause = useCallback(() => {
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
      setIsPaused(true);
    } else if (
      utteranceRef.current &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioElRef.current && audioElRef.current.paused) {
      audioElRef.current.play().catch(() => {});
      setIsPaused(false);
    } else if (
      utteranceRef.current &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.paused
    ) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        if (audioElRef.current) {
          audioElRef.current.onended = null;
          audioElRef.current.onerror = null;
          audioElRef.current.pause();
          audioElRef.current.currentTime = 0;
          audioElRef.current = null;
        }
        if (utteranceRef.current) {
          utteranceRef.current.onend = null;
          utteranceRef.current.onerror = null;
          utteranceRef.current = null;
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }
        setIsLoading(false);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText(null);
      }
      return next;
    });
  }, []);

  const speakWithBrowserFallback = useCallback(
    (
      originalText: string,
      cleanedText: string,
      effectiveFilter: boolean,
      effectiveVoice: ArtifactVoiceName
    ): boolean => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return false;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'en-US';
      const availableVoices = synth.getVoices().filter((v) => v.lang.startsWith('en'));
      if (availableVoices.length > 0) {
        const prefersBrightVoice = effectiveVoice === 'Riko';
        const matched = availableVoices.find((v) => {
          const name = v.name.toLowerCase();
          return prefersBrightVoice
            ? /aria|jenny|samantha|victoria|karen|zira|female|natural/.test(name)
            : /guy|davis|alex|daniel|mark|david|male|natural/.test(name);
        });
        utterance.voice =
          matched ||
          availableVoices[prefersBrightVoice && availableVoices.length > 1 ? 1 : 0];
      }

      utterance.pitch = effectiveVoice === 'Riko' ? Math.min(1.25, pitch * 1.05) : pitch;
      utterance.rate = rate;
      utterance.volume = volume;
      utteranceRef.current = utterance;

      if (effectiveFilter) {
        playQuindarTone(2525, 0.028);
      }

      setIsLoading(false);
      setIsSpeaking(true);
      setIsPaused(false);
      setCurrentText(originalText);

      utterance.onend = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        if (effectiveFilter) {
          playQuindarTone(2475, 0.028);
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText(null);
      };

      utterance.onerror = () => {
        if (utteranceRef.current !== utterance) return;
        utteranceRef.current = null;
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText(null);
        setVoiceError('Unable to play browser voice narration.');
      };

      synth.speak(utterance);
      return true;
    },
    [pitch, playQuindarTone, rate, volume]
  );

  const speakMissionLog = useCallback(
    async (
      text: string,
      enableRadioFilterParam?: boolean,
      voiceNameParam?: ArtifactVoiceName
    ) => {
      if (isMuted) return;

      const effectiveFilter =
        enableRadioFilterParam !== undefined ? enableRadioFilterParam : filterEnabled;
      const effectiveVoice: ArtifactVoiceName = voiceNameParam || defaultVoiceName;

      // Cancel any ongoing playback or pending request
      stop();
      setVoiceError(null);
      setActiveVoiceName(effectiveVoice);

      const cleanedText = text
        .replace(/[*_#`~[\]]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanedText) return;

      const cacheKey = `${effectiveVoice}:${cleanedText}`;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let blobUrl = audioUrlCacheRef.current.get(cacheKey);

        if (!blobUrl) {
          setIsLoading(true);
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanedText,
              voiceName: effectiveVoice,
            }),
            signal: controller.signal,
          });

          const payload = await response.json().catch(() => null);
          const serverError =
            typeof payload?.error === 'string' && payload.error.trim()
              ? payload.error.trim()
              : '';

          if (!response.ok) {
            if (controller.signal.aborted || isMutedRef.current) {
              setIsLoading(false);
              return;
            }
            const shouldFallbackToBrowserSpeech =
              payload?.fallbackRecommended === true ||
              [403, 404, 429, 502, 503, 504].includes(response.status);

            if (shouldFallbackToBrowserSpeech) {
              abortControllerRef.current = null;
              if (
                speakWithBrowserFallback(
                  text,
                  cleanedText,
                  effectiveFilter,
                  effectiveVoice
                )
              ) {
                return;
              }
            }
            throw new Error(serverError || `Voice synthesis failed (${response.status})`);
          }

          if (typeof payload?.audioBase64 !== 'string' || !payload.audioBase64) {
            throw new Error('Server returned empty audio data.');
          }

          const wavBlob = base64ToWavBlob(
            payload.audioBase64,
            typeof payload?.mimeType === 'string' ? payload.mimeType : 'audio/wav'
          );
          blobUrl = URL.createObjectURL(wavBlob);
          audioUrlCacheRef.current.set(cacheKey, blobUrl);
        }

        if (controller.signal.aborted || isMutedRef.current) {
          setIsLoading(false);
          return;
        }
        abortControllerRef.current = null;
        setIsLoading(false);

        if (effectiveFilter) {
          playQuindarTone(2525, 0.028);
        }

        const audio = new Audio(blobUrl);
        audio.volume = volume;
        audio.playbackRate = rate;
        audioElRef.current = audio;

        setIsSpeaking(true);
        setIsPaused(false);
        setCurrentText(text);

        audio.onended = () => {
          if (audioElRef.current !== audio) return;
          audioElRef.current = null;
          if (effectiveFilter) {
            playQuindarTone(2475, 0.028);
          }
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentText(null);
        };

        audio.onerror = () => {
          if (audioElRef.current !== audio) return;
          audioElRef.current = null;
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentText(null);
          setVoiceError('Unable to play generated voice audio.');
        };

        await audio.play();
      } catch (err: unknown) {
        if ((err instanceof DOMException && err.name === 'AbortError') || isMutedRef.current) {
          setIsLoading(false);
          return;
        }
        // Network/fetch failure fallback when offline or backend unreachable
        if (
          err instanceof TypeError &&
          speakWithBrowserFallback(text, cleanedText, effectiveFilter, effectiveVoice)
        ) {
          return;
        }
        setIsLoading(false);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentText(null);
        setVoiceError(
          err instanceof Error ? err.message : 'Unable to play voice narration.'
        );
      }
    },
    [
      defaultVoiceName,
      filterEnabled,
      isMuted,
      playQuindarTone,
      rate,
      speakWithBrowserFallback,
      stop,
      volume,
    ]
  );

  // Sync live volume/playbackRate if updated while playing
  useEffect(() => {
    if (audioElRef.current) {
      audioElRef.current.volume = volume;
      audioElRef.current.playbackRate = rate;
    }
  }, [volume, rate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (audioElRef.current) {
        audioElRef.current.onended = null;
        audioElRef.current.onerror = null;
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current = null;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
      audioUrlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrlCacheRef.current.clear();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    speakMissionLog,
    stop,
    pause,
    resume,
    toggleMute,
    voices,
    selectedVoice,
    setSelectedVoice,
    activeVoiceName,
    isLoading,
    isSpeaking,
    isPaused,
    isMuted,
    voiceError,
    filterEnabled,
    setFilterEnabled,
    pitch,
    setPitch,
    rate,
    setRate,
    volume,
    setVolume,
    analyserNode: analyserRef.current,
    audioContext: audioCtxRef.current,
    currentText,
  };
}
