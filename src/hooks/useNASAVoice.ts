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
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioUrlCacheRef = useRef<Map<string, string>>(new Map());
  const isSpeakingRef = useRef<boolean>(false);
  isSpeakingRef.current = isSpeaking;

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
    }
  }, []);

  const resume = useCallback(() => {
    if (audioElRef.current && audioElRef.current.paused) {
      audioElRef.current.play().catch(() => {});
      setIsPaused(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.currentTime = 0;
        audioElRef.current = null;
        setIsSpeaking(false);
        setIsPaused(false);
      }
      return next;
    });
  }, []);

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

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              typeof payload?.error === 'string' && payload.error
                ? payload.error
                : `Voice synthesis failed (${response.status})`
            );
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

        if (controller.signal.aborted) return;
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
        if (err instanceof DOMException && err.name === 'AbortError') {
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
    [defaultVoiceName, filterEnabled, isMuted, playQuindarTone, rate, stop, volume]
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
