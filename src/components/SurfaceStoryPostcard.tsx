/**
 * @file SurfaceStoryPostcard.tsx
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * Story narration pairs with the project's Gemini TTS voice experience and local Web Speech playback.
 * All storytelling text is human-created/curated.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Artifact, CelestialBody } from '../types/space';

export interface SurfaceStoryPostcardProps {
  artifact: Artifact;
  isOpen: boolean;
  onClose: () => void;
  onReplay: () => void;
  isTouchOrCompact: boolean;
  isMobileHintVisible: boolean;
  isObscuredByInspectModal: boolean;
}

interface PostcardTheme {
  postmarkLabel: string;
  containerClass: string;
  dividerClass: string;
  accentTextClass: string;
  mutedTextClass: string;
  subtitleBgClass: string;
  progressTrackClass: string;
  progressFillClass: string;
  stampBorderClass: string;
  controlButtonClass: string;
  primaryButtonClass: string;
  eqBarClass: string;
  replayButtonClass: string;
}

function getPostcardTheme(body: CelestialBody): PostcardTheme {
  switch (body) {
    case 'mars':
      return {
        postmarkLabel: 'MARS DISPATCH',
        containerClass:
          'bg-[rgba(34,19,13,0.90)] border border-[#D97706]/45 text-[#F5E6D3] shadow-[0_14px_34px_rgba(0,0,0,0.55)]',
        dividerClass: 'border-[#D97706]/25',
        accentTextClass: 'text-[#F59E0B]',
        mutedTextClass: 'text-[#D6B8A3]',
        subtitleBgClass: 'bg-[rgba(20,11,7,0.68)] border border-[#D97706]/30',
        progressTrackClass: 'bg-[#573422]/60',
        progressFillClass: 'bg-[#F59E0B]',
        stampBorderClass: 'border-[#F59E0B]/60 text-[#FCD34D]',
        controlButtonClass:
          'bg-[rgba(55,31,20,0.85)] hover:bg-[#573422] border border-[#D97706]/40 text-[#F5E6D3]',
        primaryButtonClass:
          'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#1C100A] border border-[#FDE68A]/50',
        eqBarClass: 'bg-[#F59E0B]',
        replayButtonClass:
          'bg-[rgba(34,19,13,0.92)] hover:bg-[#3A2217] border border-[#D97706]/55 text-[#F5E6D3]',
      };
    case 'deep_space':
      return {
        postmarkLabel: 'DEEP SPACE TELEMETRY',
        containerClass:
          'bg-[rgba(11,14,30,0.90)] border border-[#38BDF8]/40 text-[#F8FAFC] shadow-[0_14px_36px_rgba(4,7,20,0.68)]',
        dividerClass: 'border-[#38BDF8]/25',
        accentTextClass: 'text-[#FBBF24]',
        mutedTextClass: 'text-[#A5B4FC]',
        subtitleBgClass: 'bg-[rgba(6,9,22,0.72)] border border-[#FBBF24]/25',
        progressTrackClass: 'bg-[#1E254A]',
        progressFillClass: 'bg-[#38BDF8]',
        stampBorderClass: 'border-[#FBBF24]/60 text-[#FDE68A]',
        controlButtonClass:
          'bg-[rgba(23,28,58,0.85)] hover:bg-[#1E254A] border border-[#38BDF8]/35 text-[#F8FAFC]',
        primaryButtonClass:
          'bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#060916] border border-[#BAE6FD]/60',
        eqBarClass: 'bg-[#38BDF8]',
        replayButtonClass:
          'bg-[rgba(11,14,30,0.92)] hover:bg-[#171C3A] border border-[#38BDF8]/50 text-[#F8FAFC]',
      };
    case 'moon':
    default:
      return {
        postmarkLabel: 'LUNAR POST',
        containerClass:
          'bg-[rgba(15,19,27,0.88)] border border-[#E2E8F0]/35 text-[#F8FAFC] shadow-[0_14px_34px_rgba(0,0,0,0.6)]',
        dividerClass: 'border-[#E2E8F0]/20',
        accentTextClass: 'text-[#BAE6FD]',
        mutedTextClass: 'text-[#CBD5E1]',
        subtitleBgClass: 'bg-[rgba(9,12,18,0.68)] border border-[#E2E8F0]/20',
        progressTrackClass: 'bg-[#263042]',
        progressFillClass: 'bg-[#BAE6FD]',
        stampBorderClass: 'border-[#BAE6FD]/55 text-[#E0F2FE]',
        controlButtonClass:
          'bg-[rgba(30,38,52,0.85)] hover:bg-[#2A3548] border border-[#E2E8F0]/30 text-[#F8FAFC]',
        primaryButtonClass:
          'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#0B111C] border border-white/50',
        eqBarClass: 'bg-[#BAE6FD]',
        replayButtonClass:
          'bg-[rgba(15,19,27,0.92)] hover:bg-[#1E2634] border border-[#BAE6FD]/55 text-[#F8FAFC]',
      };
  }
}

export function splitStoryIntoSegments(artifact: Artifact): string[] {
  const rawSource = (
    artifact.firstPersonMonologue ||
    artifact.story?.introduction ||
    artifact.story?.forSchoolKids ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!rawSource) {
    return [`${artifact.name} (${artifact.year}).`];
  }

  // Protect abbreviations like A.D. or U.S. before splitting at sentence boundaries
  const protectedText = rawSource
    .replace(/\bA\.D\./g, 'A\u0000D\u0000')
    .replace(/\bU\.S\./g, 'U\u0000S\u0000')
    .replace(/\bDr\./g, 'Dr\u0000')
    .replace(/\bSt\./g, 'St\u0000')
    .replace(/\bMr\./g, 'Mr\u0000');

  const rawSentences = protectedText
    .split(/(?<=[.!?]["'”’]?)\s+(?=[A-Z0-9“"‘'])/)
    .map((s) => s.replace(/\u0000/g, '.').trim())
    .filter(Boolean);

  const segments: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length > 165 && sentence.includes('—')) {
      const parts = sentence.split(/\s*—\s*/);
      if (parts.length === 2 && parts[0].length >= 35 && parts[1].length >= 35) {
        segments.push(`${parts[0].trim()}—`, parts[1].trim());
        continue;
      }
    }
    segments.push(sentence);
  }

  return segments.length > 0 ? segments : [rawSource];
}

function pickNaturalEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const englishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = englishVoices.length > 0 ? englishVoices : voices;

  const preferredMatchers = [
    /google us english/i,
    /google uk english/i,
    /microsoft.*natural/i,
    /microsoft aria/i,
    /microsoft jenny/i,
    /microsoft guy/i,
    /samantha/i,
    /daniel/i,
    /alex/i,
    /natural/i,
  ];

  for (const matcher of preferredMatchers) {
    const found = pool.find((v) => matcher.test(v.name));
    if (found) return found;
  }

  return pool.find((v) => v.default) || pool[0];
}

export const SurfaceStoryPostcard: React.FC<SurfaceStoryPostcardProps> = ({
  artifact,
  isOpen,
  onClose,
  onReplay,
  isTouchOrCompact,
  isMobileHintVisible,
  isObscuredByInspectModal,
}) => {
  const theme = getPostcardTheme(artifact.body);
  const segments = useMemo(() => splitStoryIntoSegments(artifact), [artifact]);

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompactCollapsed, setIsCompactCollapsed] = useState(false);
  const [voicesReady, setVoicesReady] = useState(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return true;
    return window.speechSynthesis.getVoices().length > 0;
  });

  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? pickNaturalEnglishVoice(window.speechSynthesis.getVoices())
      : null
  );
  const activeSessionRef = useRef(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isUnmountedRef = useRef(false);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const cancelSpeech = useCallback(() => {
    activeSessionRef.current += 1;
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onstart = null;
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
      currentUtteranceRef.current = null;
    }
    setIsSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancellation errors on unsupported environments
      }
    }
  }, []);

  // Resolve clear natural English Web Speech voice before starting narration
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoicesReady(true);
      return;
    }
    const synth = window.speechSynthesis;

    const refreshVoices = () => {
      const loaded = synth.getVoices();
      if (loaded.length > 0) {
        preferredVoiceRef.current = pickNaturalEnglishVoice(loaded);
        setVoicesReady(true);
        return true;
      }
      return false;
    };

    const alreadyLoaded = refreshVoices();
    synth.addEventListener?.('voiceschanged', refreshVoices);

    // Fallback guard in case a browser provides 0 voices or never fires voiceschanged
    const fallbackTimer = alreadyLoaded
      ? null
      : window.setTimeout(() => {
          refreshVoices();
          setVoicesReady(true);
        }, 450);

    return () => {
      synth.removeEventListener?.('voiceschanged', refreshVoices);
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
    };
  }, []);

  // Reset to start whenever artifact changes or card re-opens
  useEffect(() => {
    if (isOpen) {
      setSegmentIndex(0);
      setIsCompleted(false);
      setIsCompactCollapsed(false);
    } else {
      cancelSpeech();
    }
  }, [artifact.id, isOpen, cancelSpeech]);

  // Cleanup Web Speech API immediately on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      cancelSpeech();
    };
  }, [cancelSpeech]);

  // Speak current segment automatically once voices are ready and card is active
  useEffect(() => {
    if (
      isUnmountedRef.current ||
      !voicesReady ||
      !isOpen ||
      isCompleted ||
      isMuted ||
      isObscuredByInspectModal
    ) {
      if (!isOpen || isMuted || isCompleted || isObscuredByInspectModal) {
        cancelSpeech();
      }
      return;
    }

    const text = segments[segmentIndex];
    if (!text) return;

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    const sessionId = activeSessionRef.current + 1;
    activeSessionRef.current = sessionId;
    let localUtterance: SpeechSynthesisUtterance | null = null;

    try {
      if (currentUtteranceRef.current) {
        currentUtteranceRef.current.onstart = null;
        currentUtteranceRef.current.onend = null;
        currentUtteranceRef.current.onerror = null;
        currentUtteranceRef.current = null;
      }
      synth.cancel();

      if (isUnmountedRef.current || !isOpenRef.current || isMutedRef.current) {
        return;
      }

      const loadedNow = synth.getVoices();
      if (!preferredVoiceRef.current && loadedNow.length > 0) {
        preferredVoiceRef.current = pickNaturalEnglishVoice(loadedNow);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.98;
      utterance.pitch = 1.0;
      if (preferredVoiceRef.current) {
        utterance.voice = preferredVoiceRef.current;
      }

      utterance.onstart = () => {
        if (isUnmountedRef.current || activeSessionRef.current !== sessionId) return;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
        }
        if (isUnmountedRef.current || activeSessionRef.current !== sessionId) return;
        setIsSpeaking(false);
        if (!isOpenRef.current || isMutedRef.current) return;

        if (segmentIndex < segments.length - 1) {
          setSegmentIndex((prev) => prev + 1);
        } else {
          setIsCompleted(true);
        }
      };

      utterance.onerror = () => {
        if (currentUtteranceRef.current === utterance) {
          currentUtteranceRef.current = null;
        }
        if (isUnmountedRef.current || activeSessionRef.current !== sessionId) return;
        setIsSpeaking(false);
      };

      localUtterance = utterance;
      currentUtteranceRef.current = utterance;
      if (synth.paused) {
        synth.resume();
      }
      synth.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }

    return () => {
      if (activeSessionRef.current === sessionId) {
        activeSessionRef.current += 1;
      }
      if (localUtterance) {
        localUtterance.onstart = null;
        localUtterance.onend = null;
        localUtterance.onerror = null;
        if (currentUtteranceRef.current === localUtterance) {
          currentUtteranceRef.current = null;
        }
      }
      try {
        synth.cancel();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [
    artifact.id,
    voicesReady,
    isOpen,
    isMuted,
    isCompleted,
    isObscuredByInspectModal,
    segmentIndex,
    segments,
    cancelSpeech,
  ]);

  const handleSkipOrClose = useCallback(() => {
    cancelSpeech();
    onClose();
  }, [cancelSpeech, onClose]);

  const handleNextSegment = useCallback(() => {
    cancelSpeech();
    if (segmentIndex < segments.length - 1) {
      setIsCompleted(false);
      setSegmentIndex((prev) => prev + 1);
    } else {
      // Restart from first segment if already at the end
      setIsCompleted(false);
      setSegmentIndex(0);
    }
  }, [cancelSpeech, segmentIndex, segments.length]);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        cancelSpeech();
      } else if (isCompleted) {
        setIsCompleted(false);
      }
      return next;
    });
  }, [cancelSpeech, isCompleted]);

  const handleReplayFromStart = useCallback(() => {
    cancelSpeech();
    setIsCompleted(false);
    setSegmentIndex(0);
    setIsCompactCollapsed(false);
    onReplay();
  }, [cancelSpeech, onReplay]);

  if (isObscuredByInspectModal) {
    return null;
  }

  // Dismissed state: show compact "Replay Story" trigger in top-right
  if (!isOpen) {
    const replayTopClass = !isTouchOrCompact
      ? 'top-4'
      : isMobileHintVisible
      ? 'top-3 md:top-16'
      : 'top-3 md:top-4';
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className={`fixed right-3 sm:right-4 z-30 pointer-events-auto transition-all duration-200 ${replayTopClass}`}
      >
        <button
          type="button"
          onClick={handleReplayFromStart}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 whitespace-nowrap shrink-0 ${theme.replayButtonClass}`}
          aria-label="Replay story narration"
        >
          <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${theme.accentTextClass}`} />
          <span>Replay Story</span>
        </button>
      </div>
    );
  }

  const currentSentence = segments[segmentIndex] || '';
  const progressPct = ((segmentIndex + 1) / segments.length) * 100;
  const formattedIndex = String(segmentIndex + 1).padStart(2, '0');
  const formattedTotal = String(segments.length).padStart(2, '0');
  const cardTopClass = !isTouchOrCompact
    ? 'top-4'
    : isMobileHintVisible
    ? 'top-[112px] md:top-[76px]'
    : 'top-14 md:top-4';

  return (
    <aside
      aria-label={`${artifact.moniker} Story Postcard`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`fixed right-3 sm:right-4 z-30 pointer-events-auto w-[260px] max-w-[260px] md:w-[320px] md:max-w-[320px] lg:w-[368px] lg:max-w-[368px] rounded-2xl overflow-hidden transition-all duration-200 ${cardTopClass} ${theme.containerClass}`}
    >
      {/* Dynamic Environment Decorative SVG Backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {artifact.body === 'moon' && (
          <svg
            className="w-full h-full opacity-[0.14]"
            viewBox="0 0 360 240"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48H360M0 120H360M0 192H360M72 0V240M180 0V240M288 0V240"
              stroke="#E2E8F0"
              strokeWidth="0.7"
              strokeDasharray="3 5"
            />
            <circle cx="308" cy="46" r="28" stroke="#BAE6FD" strokeWidth="1" />
            <circle cx="308" cy="46" r="14" stroke="#E2E8F0" strokeWidth="0.7" />
          </svg>
        )}

        {artifact.body === 'mars' && (
          <svg
            className="w-full h-full opacity-[0.2]"
            viewBox="0 0 360 240"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M-20 185C55 150 115 215 190 175C255 140 310 185 380 155"
              stroke="#D97706"
              strokeWidth="1"
            />
            <path
              d="M-20 205C65 170 125 230 205 190C265 158 315 202 380 175"
              stroke="#F59E0B"
              strokeWidth="0.8"
            />
            <path
              d="M210 -10C245 35 275 55 340 65"
              stroke="#F5E6D3"
              strokeWidth="0.7"
              strokeDasharray="4 4"
            />
          </svg>
        )}

        {artifact.body === 'deep_space' && (
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at 85% 15%, rgba(56,189,248,0.16) 0%, transparent 45%), radial-gradient(circle at 12% 90%, rgba(251,191,36,0.12) 0%, transparent 45%)',
            }}
          />
        )}
      </div>

      {/* Postcard Header + Stamp + Skip/Collapse */}
      <div className={`relative z-10 px-3 sm:px-4 pt-3 pb-2.5 border-b ${theme.dividerClass}`}>
        <div className="flex items-start justify-between gap-2">
          {/* Postmark Stamp & Equalizer */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 border border-dashed rounded text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider uppercase whitespace-nowrap shrink-0 ${theme.stampBorderClass}`}
              >
                {artifact.body === 'deep_space' && (
                  <span
                    className="inline-block w-2 h-2 rounded-full border border-current"
                    aria-hidden="true"
                  />
                )}
                <span>
                  {theme.postmarkLabel} · {artifact.year}
                </span>
              </div>

              {/* Subtle Audio Equalizer Waveform Indicator */}
              <div
                className="flex items-end gap-[2px] h-3.5 shrink-0"
                aria-label={isSpeaking && !isMuted ? 'Narrating audio active' : 'Audio idle'}
              >
                {[0, 120, 240, 90, 180].map((delayMs, idx) => (
                  <span
                    key={idx}
                    style={{
                      animationDelay: `${delayMs}ms`,
                      height: idx % 2 === 0 ? '12px' : '9px',
                    }}
                    className={`w-[2.5px] rounded-full transition-opacity duration-150 ${
                      theme.eqBarClass
                    } ${
                      isSpeaking && !isMuted
                        ? 'animate-postcard-eq opacity-100'
                        : 'opacity-35 scale-y-[0.3]'
                    }`}
                  />
                ))}
              </div>
            </div>

            <h3 className="mt-1.5 text-xs sm:text-sm font-bold tracking-tight truncate">
              {artifact.mission} — {artifact.moniker}
            </h3>

            {/* Unboxed Metadata Line */}
            <div className={`mt-0.5 text-[10px] sm:text-[11px] truncate ${theme.mutedTextClass}`}>
              <span>{artifact.agency}</span>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span className="tabular-nums">{artifact.year}</span>
              <span className="mx-1.5 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline font-mono tabular-nums">
                {artifact.coordinates.display.split('|')[0].trim()}
              </span>
            </div>
          </div>

          {/* Mobile Collapse Toggle + Skip/Close */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsCompactCollapsed((prev) => !prev)}
              aria-expanded={!isCompactCollapsed}
              aria-label={isCompactCollapsed ? 'Expand story postcard' : 'Minimize story postcard'}
              className={`md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${theme.controlButtonClass}`}
            >
              {isCompactCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleSkipOrClose}
              aria-label="Skip and close story postcard"
              title="Skip story"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${theme.controlButtonClass}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Body: Coordinates (mobile), Synced Subtitle Box, Controls */}
      {!isCompactCollapsed && (
        <div className="relative z-10 p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* Compact Coordinates on narrow mobile */}
          <div
            className={`sm:hidden text-[10px] font-mono tabular-nums truncate ${theme.mutedTextClass}`}
          >
            {artifact.coordinates.display.split('|')[0].trim()}
          </div>

          {/* Synced Subtitle Box */}
          <div className={`rounded-xl p-2.5 sm:p-3 ${theme.subtitleBgClass}`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className={`text-[10px] font-mono tabular-nums font-medium ${theme.accentTextClass}`}
              >
                {isCompleted
                  ? 'Story complete'
                  : isMuted
                  ? 'Subtitles · Muted'
                  : isSpeaking
                  ? 'Narrating'
                  : 'Mission Log'}
              </span>
              <span className={`text-[10px] font-mono tabular-nums ${theme.mutedTextClass}`}>
                {formattedIndex} / {formattedTotal}
              </span>
            </div>

            <p
              key={`${artifact.id}-${segmentIndex}`}
              className="text-xs sm:text-[13px] leading-relaxed font-normal animate-in fade-in duration-200 min-h-[3.25rem]"
            >
              “{currentSentence}”
            </p>

            {/* Thin Progress Bar */}
            <div className={`mt-2.5 h-1 w-full rounded-full overflow-hidden ${theme.progressTrackClass}`}>
              <div
                className={`h-full transition-all duration-300 ${theme.progressFillClass}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Interactive Controls Row: Mute/Unmute, Next Segment, Skip */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-pressed={isMuted}
              aria-label={isMuted ? 'Unmute story narration' : 'Mute story narration'}
              className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 whitespace-nowrap shrink-0 ${theme.controlButtonClass}`}
            >
              {isMuted ? (
                <>
                  <VolumeX className={`w-3.5 h-3.5 shrink-0 ${theme.accentTextClass}`} />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className={`w-3.5 h-3.5 shrink-0 ${theme.accentTextClass}`} />
                  <span>Mute</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleSkipOrClose}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 whitespace-nowrap shrink-0 ${theme.controlButtonClass}`}
              >
                Skip
              </button>

              <button
                type="button"
                onClick={isCompleted ? handleReplayFromStart : handleNextSegment}
                aria-label={isCompleted ? 'Replay story' : 'Next story segment'}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 whitespace-nowrap shrink-0 ${theme.primaryButtonClass}`}
              >
                {isCompleted ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Replay</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p
            className={`text-[10px] font-mono leading-tight ${theme.mutedTextClass}`}
            title="Narration generated with Gemini AI voice"
          >
            Narration generated with Gemini AI voice
          </p>
        </div>
      )}
    </aside>
  );
};
