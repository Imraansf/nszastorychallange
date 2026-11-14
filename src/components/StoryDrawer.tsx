import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Artifact } from '../types/space';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Cpu,
  Clock,
  MapPin,
  Wrench,
  ExternalLink,
  ArrowLeft,
  Rocket,
  Camera,
  Youtube,
  Scale,
  Ruler,
  Zap,
  Award,
  Star,
  Stamp,
} from 'lucide-react';
import { useNASAVoice } from '../hooks/useNASAVoice';

interface StoryDrawerProps {
  artifact: Artifact | null;
  onClose: () => void;
  onNextArtifact: () => void;
  onPrevArtifact: () => void;
  onInspectModel?: (artifact: Artifact) => void;
}

function extractYouTubeId(url: string): string | null {
  try {
    const cleaned = url.replace(/\s+/g, '');
    const parsed = new URL(cleaned);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1) || null;
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function getZoneMeta(body: Artifact['body']) {
  switch (body) {
    case 'moon':
      return {
        label: 'MOON',
        badgeBg: 'bg-[#38BDF8]',
        pinText: 'Lunar Surface Pin',
      };
    case 'mars':
      return {
        label: 'MARS',
        badgeBg: 'bg-[#D97706]',
        pinText: 'Red Planet Pin',
      };
    default:
      return {
        label: 'DEEP SPACE',
        badgeBg: 'bg-[#E0F2FE]',
        pinText: 'Cosmic Trajectory Pin',
      };
  }
}

const INSTRUMENT_TAG_COLORS = [
  'bg-[#D1FAE5] border-[#06090F]',
  'bg-[#E0F2FE] border-[#06090F]',
  'bg-[#EDE9FE] border-[#06090F]',
  'bg-[#F8FAFC] border-[#06090F]',
  'bg-[#7DD3FC] border-[#06090F]',
  'bg-[#DDD6FE] border-[#06090F]',
];

const MARS_INSTRUMENT_TAG_COLORS = [
  'bg-[#E7E5E4] border-[#44403C]',
  'bg-[#FFFFFF] border-[#44403C]',
  'bg-[#F5E6D3] border-[#44403C]',
  'bg-[#D6D3D1] border-[#44403C]',
  'bg-[#FDE68A]/55 border-[#44403C]',
  'bg-[#FED7AA]/65 border-[#44403C]',
];

const POSTCARD_SHADOW =
  'shadow-[0_7px_0_#38BDF8,0_18px_36px_rgba(56,189,248,0.18)]';
const MARS_POSTCARD_SHADOW =
  'shadow-[0_7px_0_#D97706,0_18px_36px_rgba(0,0,0,0.45)]';

export const StoryDrawer: React.FC<StoryDrawerProps> = ({
  artifact,
  onClose,
  onNextArtifact,
  onPrevArtifact,
  onInspectModel,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [galleryErrors, setGalleryErrors] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const nasaVoice = useNASAVoice({
    defaultPitch: artifact?.id === 'spirit-and-opportunity' ? 1.02 : 0.95,
    defaultRate: 0.95,
    defaultFilterEnabled: true,
  });

  const stopVoiceRef = useRef(nasaVoice.stop);
  useEffect(() => {
    stopVoiceRef.current = nasaVoice.stop;
  }, [nasaVoice.stop]);

  useEffect(() => {
    if (!artifact?.id) return;
    setHeroImgError(false);
    setGalleryErrors({});
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      stopVoiceRef.current();
    };
  }, [artifact?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopVoiceRef.current();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!artifact) return null;

  const narrationText = `${artifact.name}. ${artifact.firstPersonMonologue}`;
  const cleanYoutubeUrl = artifact.youtubeUrl
    ? artifact.youtubeUrl.replace(/\s+/g, '')
    : undefined;
  const youtubeId = cleanYoutubeUrl ? extractYouTubeId(cleanYoutubeUrl) : null;
  const zoneMeta = getZoneMeta(artifact.body);

  const diaryPhotos = (artifact.galleryImages || []).filter(
    (g) => g.postcardTarget === 'diary'
  );
  const historyPhotos = (artifact.galleryImages || []).filter(
    (g) => g.postcardTarget === 'history'
  );
  const statsPhotos = (artifact.galleryImages || []).filter(
    (g) => g.postcardTarget === 'stats'
  );

  const statPills = artifact.statPills || {
    mass: artifact.massKg ? `${artifact.massKg.toLocaleString()} kg` : 'See Specs',
    size: 'Mission Hardware',
    power: 'Solar / RTG Power',
  };

  const isMars = artifact.body === 'mars';
  const postcardShadow = isMars ? MARS_POSTCARD_SHADOW : POSTCARD_SHADOW;

  const legacyBullets = [
    {
      lead: 'Big Moment:',
      text: artifact.storytellingHook,
      icon: Rocket,
      iconBg: isMars ? 'bg-[#D97706]' : 'bg-[#38BDF8]',
    },
    {
      lead: 'Why It Stayed:',
      text: artifact.story.whyLeftBehind,
      icon: MapPin,
      iconBg: isMars ? 'bg-[#E7E5E4]' : 'bg-[#DDD6FE]',
    },
    {
      lead: 'Amazing Discovery:',
      text: artifact.scientificDiscoveries,
      icon: Sparkles,
      iconBg: isMars ? 'bg-[#F5E6D3]' : 'bg-[#7DD3FC]',
    },
    ...(artifact.funFacts[0]
      ? [
          {
            lead: 'Cool Space Fact:',
            text: artifact.funFacts[0],
            icon: Star,
            iconBg: isMars ? 'bg-[#D6D3D1]' : 'bg-[#E0F2FE]',
          },
        ]
      : []),
  ];

  return (
    <div
      ref={scrollRef}
      className={`fixed inset-0 z-50 overflow-y-auto font-sans ${
        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
      }`}
      style={{
        background: isMars
          ? 'radial-gradient(ellipse at 18% 12%, rgba(217, 119, 6, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 85% 18%, rgba(168, 162, 158, 0.14) 0%, transparent 50%), linear-gradient(155deg, #1C140F 0%, #291D16 55%, #1C140F 100%)'
          : 'radial-gradient(ellipse at 18% 12%, rgba(56, 189, 248, 0.22) 0%, transparent 50%), radial-gradient(ellipse at 85% 18%, rgba(124, 58, 237, 0.25) 0%, transparent 50%), linear-gradient(155deg, #06090F 0%, #0D131F 55%, #06090F 100%)',
      }}
    >
      {/* Subtle Atmospheric Curtain Overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: isMars
            ? 'repeating-conic-gradient(from 0deg at 50% 15%, rgba(217,119,6,0.28) 0deg 10deg, transparent 10deg 26deg)'
            : 'repeating-conic-gradient(from 0deg at 50% 15%, rgba(56,189,248,0.35) 0deg 10deg, transparent 10deg 26deg)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 space-y-8 pb-14">
        {/* ================================================================ */}
        {/* 1. COMPACT MISSION HEADER BAR                                    */}
        {/* ================================================================ */}
        <header
          className={`rounded-3xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 ${
            isMars
              ? 'bg-[#291D16] border-[3px] border-[#57534E] shadow-[0_6px_0_#1C140F,0_14px_32px_rgba(0,0,0,0.45)]'
              : 'bg-[#F8FAFC] border-[3px] border-[#38BDF8] shadow-[0_6px_0_#38BDF8]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`shrink-0 px-3 py-1 rounded-xl border-2 -rotate-2 flex items-center gap-1 ${
                isMars
                  ? 'bg-[#D97706] border-[#1C140F] shadow-[0_2px_0_#1C140F]'
                  : 'bg-[#38BDF8] border-[#06090F] shadow-[0_2px_0_#06090F]'
              }`}
            >
              <span
                className={`text-sm font-black font-mono tabular-nums ${
                  isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                }`}
              >
                #{artifact.artifactNumber}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className={`text-lg sm:text-xl font-black tracking-tight truncate ${
                    isMars ? 'text-[#F5E6D3]' : 'text-[#06090F]'
                  }`}
                >
                  {artifact.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg ${zoneMeta.badgeBg} border-2 text-[10px] font-black uppercase tracking-wider ${
                    isMars
                      ? 'border-[#1C140F] text-[#1C140F]'
                      : 'border-[#06090F] text-[#06090F]'
                  }`}
                >
                  <Rocket className="w-3 h-3" />
                  {zoneMeta.label}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-lg border-2 text-[10px] font-black font-mono tabular-nums ${
                    isMars
                      ? 'bg-[#E7E5E4] border-[#1C140F] text-[#1C140F]'
                      : 'bg-[#E0F2FE] border-[#06090F] text-[#06090F]'
                  }`}
                >
                  {artifact.year}
                </span>
              </div>
              <p
                className={`text-xs font-bold truncate mt-0.5 ${
                  isMars ? 'text-[#A8A29E]' : 'text-[#7C3AED]'
                }`}
              >
                {artifact.agency} • {artifact.categoryLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {onInspectModel && artifact.model3dUrl && (
              <button
                onClick={() => onInspectModel(artifact)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl border-2 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center gap-1.5 transition-all ${
                  isMars
                    ? 'bg-[#E7E5E4] hover:bg-[#D97706] border-[#1C140F] shadow-[0_3px_0_#1C140F] text-[#1C140F]'
                    : 'bg-[#E0F2FE] hover:bg-[#DDD6FE] border-[#06090F] shadow-[0_3px_0_#06090F] text-[#06090F]'
                }`}
                title="Inspect 3D CAD Model"
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline">3D Model</span>
              </button>
            )}

            <button
              onClick={() => {
                nasaVoice.stop();
                onClose();
              }}
              className={`min-h-[40px] px-4 py-2 rounded-xl border-2 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center gap-1.5 transition-all ${
                isMars
                  ? 'bg-[#F5E6D3] hover:bg-[#D97706] border-[#1C140F] shadow-[0_3px_0_#1C140F] text-[#1C140F]'
                  : 'bg-[#38BDF8] hover:bg-[#0EA5E9] border-[#06090F] shadow-[0_3px_0_#06090F] text-[#06090F]'
              }`}
              title="Back to 3D Map (Esc)"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.75]" />
              <span>Back to Map</span>
            </button>
          </div>
        </header>

        {/* ================================================================ */}
        {/* 2. SEPARATE MEDIA BOXES (PHOTO BOX & VIDEO BOX)                  */}
        {/* ================================================================ */}
        <section
          className={`grid gap-6 items-start ${
            youtubeId ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Box 1: Standalone Mission Photo Box */}
          <div
            className={`flex flex-col rounded-3xl overflow-hidden ${
              isMars
                ? 'bg-[#F5E6D3] border-[3px] border-[#44403C] shadow-[0_6px_0_#D97706,0_16px_36px_rgba(0,0,0,0.4)]'
                : 'bg-[#F8FAFC] border-[3px] border-[#38BDF8] shadow-[0_6px_0_#38BDF8]'
            }`}
          >
            {/* Photo Box Header */}
            <div
              className={`px-4 py-2.5 border-b-[3px] flex items-center justify-between gap-2 ${
                isMars ? 'bg-[#E7E5E4] border-[#44403C]' : 'bg-[#E0F2FE] border-[#06090F]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border-2 text-[11px] font-black uppercase tracking-wider ${
                  isMars
                    ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F]'
                    : 'bg-[#38BDF8] border-[#06090F] text-[#06090F]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mission Photo</span>
              </div>

              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 text-[10px] font-black uppercase ${
                  isMars
                    ? 'bg-[#F5E6D3] border-[#1C140F] text-[#1C140F]'
                    : 'bg-[#F8FAFC] border-[#06090F] text-[#06090F]'
                }`}
              >
                <Award className={`w-3 h-3 ${isMars ? 'text-[#D97706]' : 'text-[#7C3AED]'}`} />
                <span>{youtubeId ? 'NASA Archive Frame' : 'Rare Archive Snapshot'}</span>
              </div>
            </div>

            {/* Full Uncropped Photo Frame */}
            <div
              className={`flex items-center justify-center p-3 sm:p-4 ${
                isMars ? 'bg-[#1C140F]' : 'bg-[#06090F]'
              }`}
            >
              {artifact.imageUrl && !heroImgError ? (
                <img
                  src={artifact.imageUrl}
                  alt={artifact.name}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-auto max-h-[340px] sm:max-h-[400px] object-contain mx-auto rounded-xl"
                />
              ) : (
                <div
                  className={`w-full h-56 flex flex-col items-center justify-center p-4 text-center rounded-xl bg-gradient-to-br ${
                    isMars
                      ? 'from-[#291D16] to-[#1C140F] text-[#F5E6D3]'
                      : 'from-[#0D131F] to-[#06090F] text-[#F8FAFC]'
                  }`}
                >
                  <Rocket className={`w-8 h-8 mb-1 ${isMars ? 'text-[#D97706]' : 'text-[#38BDF8]'}`} />
                  <p className="text-xs font-black">{artifact.name}</p>
                  <p className={`text-[11px] font-bold ${isMars ? 'text-[#A8A29E]' : 'text-[#E0F2FE]/80'}`}>
                    NASA Archive • {artifact.year}
                  </p>
                </div>
              )}
            </div>

            {/* Photo Caption Footer */}
            <div
              className={`px-4 py-3 text-xs font-bold border-t-2 ${
                isMars
                  ? 'text-[#1C140F] bg-[#F5E6D3] border-[#44403C]/30'
                  : 'text-[#06090F] bg-[#F8FAFC] border-[#06090F]/15'
              }`}
            >
              <p className="leading-snug">
                {artifact.imageCaption || `${artifact.name} — NASA Historical Archive`}
              </p>
            </div>
          </div>

          {/* Box 2: Standalone Embedded YouTube Video Box (Strict 16:9 frame) */}
          {youtubeId && (
            <div
              className={`flex flex-col rounded-3xl overflow-hidden ${
                isMars
                  ? 'bg-[#291D16] border-[3px] border-[#44403C] shadow-[0_6px_0_#D97706,0_16px_36px_rgba(0,0,0,0.4)]'
                  : 'bg-[#0D131F] border-[3px] border-[#38BDF8] shadow-[0_6px_0_#38BDF8]'
              }`}
            >
              <div
                className={`px-4 py-2.5 border-b-[3px] flex items-center justify-between gap-2 ${
                  isMars ? 'bg-[#291D16] border-[#44403C]' : 'bg-[#0D131F] border-[#38BDF8]/40'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider ${
                    isMars ? 'text-[#F5E6D3]' : 'text-[#F8FAFC]'
                  }`}
                >
                  <Youtube className={`w-4 h-4 ${isMars ? 'text-[#D97706]' : 'text-[#38BDF8]'}`} />
                  <span>Mission Video Feed</span>
                </div>
                {cleanYoutubeUrl && (
                  <a
                    href={cleanYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black transition-colors ${
                      isMars
                        ? 'bg-[#F5E6D3] hover:bg-[#D97706] border-[#1C140F] text-[#1C140F]'
                        : 'bg-[#F8FAFC] hover:bg-[#38BDF8] border-[#06090F] text-[#06090F]'
                    }`}
                  >
                    <span>Open YouTube</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              <div className="relative w-full aspect-video bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title={`${artifact.name} Mission Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div
                className={`px-4 py-3 text-xs font-bold border-t-2 ${
                  isMars
                    ? 'text-[#E7E5E4] bg-[#1C140F] border-[#44403C]'
                    : 'text-[#E0F2FE] bg-[#06090F] border-[#38BDF8]/25'
                }`}
              >
                <p className="leading-snug truncate">
                  NASA Archival Mission Footage • {artifact.mission} ({artifact.year})
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* 3. POSTCARDS AREA (RESETS ANIMATIONS PER ARTIFACT)               */}
        {/* ================================================================ */}
        <div key={artifact.id} className="space-y-8">
          {/* POSTCARD 01 — WIDE CENTERED FEATURE CARD (-1deg tilt) */}
          <motion.article
            initial={{ opacity: 0, y: 28, rotate: -1 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1 }}
            viewport={{ once: true, amount: 0.2 }}
            whileHover={{ rotate: 0, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className={`max-w-4xl mx-auto border-[3px] rounded-3xl overflow-hidden ${postcardShadow} ${
              isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
            }`}
          >
            {/* Airmail Postcard Top Strip */}
            <div
              className={`h-2.5 w-full border-b-2 ${isMars ? 'border-[#44403C]' : 'border-[#06090F]'}`}
              style={{
                background: isMars
                  ? 'repeating-linear-gradient(135deg, #D97706 0px 14px, #F5E6D3 14px 24px, #44403C 24px 38px, #F5E6D3 38px 48px)'
                  : 'repeating-linear-gradient(135deg, #38BDF8 0px 14px, #F8FAFC 14px 24px, #7C3AED 24px 38px, #F8FAFC 38px 48px)',
              }}
              aria-hidden="true"
            />

            <div
              className={`border-b-[3px] px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${
                isMars
                  ? 'bg-[#D97706] border-[#44403C]'
                  : 'bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#7DD3FC] border-[#06090F]'
              }`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-xl border-2 text-xs font-black uppercase ${
                    isMars
                      ? 'bg-[#F5E6D3] border-[#1C140F] text-[#1C140F] shadow-[0_2px_0_#1C140F]'
                      : 'bg-[#F8FAFC] border-[#06090F] text-[#06090F] shadow-[0_2px_0_#06090F]'
                  }`}
                >
                  01
                </span>
                <div>
                  <h2
                    className={`text-lg sm:text-xl font-black uppercase tracking-tight ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    My Space Diary
                  </h2>
                  <p
                    className={`text-xs font-bold ${
                      isMars ? 'text-[#1C140F]/90' : 'text-[#06090F]/85'
                    }`}
                  >
                    A postcard straight from {zoneMeta.label.toLowerCase()}!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (nasaVoice.isSpeaking) {
                      nasaVoice.stop();
                    } else {
                      nasaVoice.speakMissionLog(
                        narrationText,
                        nasaVoice.filterEnabled
                      );
                    }
                  }}
                  className={`min-h-[40px] px-4 py-2 rounded-xl border-2 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center gap-2 transition-all ${
                    isMars
                      ? nasaVoice.isSpeaking
                        ? 'bg-[#1C140F] text-[#F5E6D3] border-[#1C140F] shadow-[0_3px_0_#291D16]'
                        : 'bg-[#F5E6D3] hover:bg-[#E7E5E4] text-[#1C140F] border-[#1C140F] shadow-[0_3px_0_#1C140F]'
                      : nasaVoice.isSpeaking
                      ? 'bg-[#7C3AED] text-[#F8FAFC] border-[#06090F] shadow-[0_3px_0_#06090F]'
                      : 'bg-[#F8FAFC] hover:bg-[#E0F2FE] text-[#06090F] border-[#06090F] shadow-[0_3px_0_#06090F]'
                  }`}
                >
                  {nasaVoice.isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Stop Story</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className={`w-4 h-4 ${isMars ? 'text-[#92400E]' : 'text-[#7C3AED]'}`} />
                      <span>Listen to Story</span>
                    </>
                  )}
                </button>

                {/* Decorative Postage Stamp */}
                <div
                  className={`hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 border-dashed rotate-3 shadow-sm shrink-0 ${
                    isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
                  }`}
                >
                  <Stamp className={`w-5 h-5 ${isMars ? 'text-[#B45309]' : 'text-[#7C3AED]'}`} />
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    NASA
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-6 sm:p-8 space-y-5 ${isMars ? 'bg-[#F5E6D3]' : 'bg-[#E0F2FE]/35'}`}>
              <p
                className={`text-sm font-black uppercase tracking-wide ${
                  isMars ? 'text-[#92400E]' : 'text-[#7C3AED]'
                }`}
              >
                “{artifact.story.headline}”
              </p>

              <div
                className={`grid gap-6 items-center ${
                  diaryPhotos.length > 0 ? 'md:grid-cols-12' : 'grid-cols-1'
                }`}
              >
                <blockquote
                  className={`text-base leading-relaxed font-semibold border-2 rounded-2xl p-6 shadow-sm ${
                    isMars
                      ? 'text-[#1C140F] bg-[#E7E5E4] border-[#44403C]'
                      : 'text-[#06090F] bg-[#F8FAFC] border-[#06090F]'
                  } ${diaryPhotos.length > 0 ? 'md:col-span-8' : ''}`}
                >
                  “{artifact.firstPersonMonologue}”
                </blockquote>

                {diaryPhotos.map((photo) =>
                  !galleryErrors[photo.url] ? (
                    <figure
                      key={photo.url}
                      className={`md:col-span-4 border-2 rounded-2xl p-2.5 ${
                        isMars
                          ? 'bg-[#E7E5E4] border-[#44403C] shadow-[0_4px_0_#44403C]'
                          : 'bg-[#F8FAFC] border-[#06090F] shadow-[0_4px_0_#06090F]'
                      }`}
                    >
                      <div
                        className={`rounded-xl overflow-hidden border p-1.5 ${
                          isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#06090F] border-[#06090F]'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setGalleryErrors((prev) => ({
                              ...prev,
                              [photo.url]: true,
                            }))
                          }
                          className="w-full h-auto max-h-60 object-contain mx-auto rounded-lg"
                        />
                      </div>
                      <figcaption
                        className={`mt-2 px-1 text-xs font-bold leading-snug ${
                          isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                        }`}
                      >
                        {photo.caption}
                      </figcaption>
                    </figure>
                  ) : null
                )}
              </div>
            </div>
          </motion.article>

          {/* ============================================================== */}
          {/* STAGGERED 2-COLUMN INCLINED POSTCARD GRID (02, 03, 04, 05)     */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-2">
            {/* POSTCARD 02 — "WHERE AM I?" (-1.5deg tilt) */}
            <motion.article
              initial={{ opacity: 0, y: 36, rotate: -1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={`border-[3px] rounded-3xl overflow-hidden ${postcardShadow} ${
                isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
              }`}
            >
              <div
                className={`border-b-[3px] px-6 py-4 flex items-center justify-between gap-3 ${
                  isMars ? 'bg-[#E7E5E4] border-[#44403C]' : 'bg-[#E0F2FE] border-[#06090F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-xl border-2 text-xs font-black uppercase ${
                      isMars
                        ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F] shadow-[0_2px_0_#1C140F]'
                        : 'bg-[#F8FAFC] border-[#06090F] text-[#06090F] shadow-[0_2px_0_#06090F]'
                    }`}
                  >
                    02
                  </span>
                  <div>
                    <h2
                      className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      Where Am I?
                    </h2>
                    <p
                      className={`text-xs font-bold ${
                        isMars ? 'text-[#44403C]' : 'text-[#06090F]/80'
                      }`}
                    >
                      Cosmic GPS spot &amp; coordinates
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                    isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#0D131F] border-[#06090F]'
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${isMars ? 'text-[#D97706]' : 'text-[#38BDF8]'}`} />
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div
                  className={`inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-black ${
                    isMars
                      ? 'bg-[#E7E5E4] border-[#44403C] text-[#1C140F]'
                      : 'bg-[#E0F2FE] border-[#06090F] text-[#06090F]'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isMars ? 'text-[#B45309]' : 'text-[#7C3AED]'}`} />
                  <span>{zoneMeta.pinText}</span>
                </div>

                <div
                  className={`border-2 rounded-2xl p-4 sm:p-5 space-y-1 ${
                    isMars
                      ? 'bg-[#FFFFFF]/80 border-[#44403C]'
                      : 'bg-[#F8FAFC] border-[#06090F]'
                  }`}
                >
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider block ${
                      isMars ? 'text-[#92400E]' : 'text-[#7C3AED]'
                    }`}
                  >
                    Landing Spot / Region
                  </span>
                  <p
                    className={`text-sm sm:text-base font-bold leading-snug ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    {artifact.locationName}
                  </p>
                </div>

                <div
                  className={`border-2 rounded-2xl p-4 sm:p-5 space-y-1.5 ${
                    isMars
                      ? 'bg-[#E7E5E4] border-[#44403C]'
                      : 'bg-[#E0F2FE]/65 border-[#06090F]'
                  }`}
                >
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider block ${
                      isMars ? 'text-[#44403C]' : 'text-[#0284C7]'
                    }`}
                  >
                    {artifact.hasSurfaceCoordinates
                      ? 'GPS Coordinates'
                      : 'Orbit / Trajectory'}
                  </span>
                  <p
                    className={`text-sm font-black font-mono tabular-nums leading-snug ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    {artifact.coordinates.display}
                  </p>
                  {artifact.distanceAu && (
                    <p
                      className={`text-xs font-bold pt-1 ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      Distance: {artifact.distanceAu}
                    </p>
                  )}
                </div>
              </div>
            </motion.article>

            {/* POSTCARD 03 — "MISSION CLOCK" (+1.5deg tilt, staggered offset) */}
            <motion.article
              initial={{ opacity: 0, y: 36, rotate: 1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 1.5 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={`md:mt-10 border-[3px] rounded-3xl overflow-hidden ${postcardShadow} ${
                isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
              }`}
            >
              <div
                className={`border-b-[3px] px-6 py-4 flex items-center justify-between gap-3 ${
                  isMars ? 'bg-[#291D16] border-[#44403C]' : 'bg-[#DDD6FE] border-[#06090F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-xl border-2 text-xs font-black uppercase ${
                      isMars
                        ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F] shadow-[0_2px_0_#1C140F]'
                        : 'bg-[#F8FAFC] border-[#06090F] text-[#06090F] shadow-[0_2px_0_#06090F]'
                    }`}
                  >
                    03
                  </span>
                  <div>
                    <h2
                      className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                        isMars ? 'text-[#F5E6D3]' : 'text-[#06090F]'
                      }`}
                    >
                      Mission Clock
                    </h2>
                    <p
                      className={`text-xs font-bold ${
                        isMars ? 'text-[#A8A29E]' : 'text-[#06090F]/80'
                      }`}
                    >
                      Launch, landing &amp; survival time
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                    isMars ? 'bg-[#1C140F] border-[#D97706]' : 'bg-[#0D131F] border-[#06090F]'
                  }`}
                >
                  <Clock className={`w-5 h-5 ${isMars ? 'text-[#D97706]' : 'text-[#38BDF8]'}`} />
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className={`border-2 rounded-2xl p-3 text-center ${
                      isMars
                        ? 'bg-[#E7E5E4] border-[#44403C]'
                        : 'bg-[#D1FAE5]/50 border-[#06090F]'
                    }`}
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase mb-1 ${
                        isMars
                          ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F]'
                          : 'bg-[#38BDF8] border-[#06090F] text-[#06090F]'
                      }`}
                    >
                      Launch
                    </span>
                    <p
                      className={`text-xs font-black font-mono tabular-nums break-words ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {artifact.timeline.launched}
                    </p>
                  </div>

                  <div
                    className={`border-2 rounded-2xl p-3 text-center ${
                      isMars
                        ? 'bg-[#FFFFFF]/80 border-[#44403C]'
                        : 'bg-[#EDE9FE]/60 border-[#06090F]'
                    }`}
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase mb-1 ${
                        isMars
                          ? 'bg-[#F5E6D3] border-[#44403C] text-[#1C140F]'
                          : 'bg-[#DDD6FE] border-[#06090F] text-[#06090F]'
                      }`}
                    >
                      Arrival
                    </span>
                    <p
                      className={`text-xs font-black font-mono tabular-nums break-words ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {artifact.timeline.landed || 'Flyby'}
                    </p>
                  </div>

                  <div
                    className={`border-2 rounded-2xl p-3 text-center ${
                      isMars
                        ? 'bg-[#E7E5E4] border-[#44403C]'
                        : 'bg-[#E0F2FE]/60 border-[#06090F]'
                    }`}
                  >
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase mb-1 ${
                        isMars
                          ? 'bg-[#44403C] border-[#1C140F] text-[#F5E6D3]'
                          : 'bg-[#E0F2FE] border-[#06090F] text-[#06090F]'
                      }`}
                    >
                      Ended
                    </span>
                    <p
                      className={`text-xs font-black font-mono tabular-nums break-words ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {artifact.timeline.ended || 'Ongoing'}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-xs sm:text-sm font-bold font-mono border-2 rounded-2xl px-4 py-3 leading-snug ${
                    isMars
                      ? 'text-[#1C140F] bg-[#FFFFFF]/80 border-[#44403C]/40'
                      : 'text-[#06090F] bg-[#F8FAFC] border-[#06090F]/25'
                  }`}
                >
                  {artifact.timeline.summary}
                </p>

                <div
                  className={`border-2 rounded-2xl p-4 sm:p-5 space-y-2 ${
                    isMars
                      ? 'bg-[#E7E5E4] border-[#44403C]'
                      : 'bg-[#D1FAE5]/60 border-[#06090F]'
                  }`}
                >
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                      isMars
                        ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F]'
                        : 'bg-[#38BDF8] border-[#06090F] text-[#06090F]'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Planned vs. Actual</span>
                  </div>
                  <p
                    className={`text-sm font-bold leading-relaxed ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    {artifact.plannedVsActual}
                  </p>
                </div>
              </div>
            </motion.article>

            {/* POSTCARD 04 — "HISTORY & SCIENTIFIC LEGACY" (-1.5deg tilt) */}
            <motion.article
              initial={{ opacity: 0, y: 36, rotate: -1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: -1.5 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={`border-[3px] rounded-3xl overflow-hidden ${postcardShadow} ${
                isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
              }`}
            >
              <div
                className={`border-b-[3px] px-6 py-4 flex items-center justify-between gap-3 ${
                  isMars ? 'bg-[#D97706] border-[#44403C]' : 'bg-[#38BDF8] border-[#06090F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-xl border-2 text-xs font-black uppercase ${
                      isMars
                        ? 'bg-[#F5E6D3] border-[#1C140F] text-[#1C140F] shadow-[0_2px_0_#1C140F]'
                        : 'bg-[#F8FAFC] border-[#06090F] text-[#06090F] shadow-[0_2px_0_#06090F]'
                    }`}
                  >
                    04
                  </span>
                  <div>
                    <h2
                      className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      History &amp; Scientific Legacy
                    </h2>
                    <p
                      className={`text-xs font-bold ${
                        isMars ? 'text-[#1C140F]/90' : 'text-[#06090F]/85'
                      }`}
                    >
                      Quick facts on why it mattered
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                    isMars ? 'bg-[#1C140F] border-[#1C140F]' : 'bg-[#0D131F] border-[#06090F]'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${isMars ? 'text-[#D97706]' : 'text-[#38BDF8]'}`} />
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <ul className="space-y-4">
                  {legacyBullets.map((item) => {
                    const BulletIcon = item.icon;
                    return (
                      <li
                        key={item.lead}
                        className={`flex items-start gap-3.5 border-2 rounded-2xl p-4 ${
                          isMars
                            ? 'bg-[#E7E5E4] border-[#44403C]'
                            : 'bg-[#F8FAFC] border-[#06090F]'
                        }`}
                      >
                        <span
                          className={`shrink-0 w-9 h-9 rounded-xl ${item.iconBg} border-2 flex items-center justify-center mt-0.5 ${
                            isMars ? 'border-[#1C140F]' : 'border-[#06090F]'
                          }`}
                        >
                          <BulletIcon className={`w-4 h-4 ${isMars ? 'text-[#1C140F]' : 'text-[#06090F]'}`} />
                        </span>
                        <p
                          className={`text-sm leading-relaxed font-medium ${
                            isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                          }`}
                        >
                          <strong
                            className={`font-black mr-1.5 ${
                              isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                            }`}
                          >
                            {item.lead}
                          </strong>
                          {item.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                {historyPhotos.map((photo) =>
                  !galleryErrors[photo.url] ? (
                    <figure
                      key={photo.url}
                      className={`border-2 rounded-2xl p-3 flex flex-col gap-2.5 ${
                        isMars
                          ? 'bg-[#E7E5E4] border-[#44403C]'
                          : 'bg-[#E0F2FE]/45 border-[#06090F]'
                      }`}
                    >
                      <div
                        className={`rounded-xl overflow-hidden border p-1.5 ${
                          isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#06090F] border-[#06090F]'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setGalleryErrors((prev) => ({
                              ...prev,
                              [photo.url]: true,
                            }))
                          }
                          className="w-full h-auto max-h-64 object-contain mx-auto rounded-lg"
                        />
                      </div>
                      <figcaption
                        className={`px-1 text-xs font-bold leading-snug ${
                          isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                        }`}
                      >
                        {photo.caption}
                      </figcaption>
                    </figure>
                  ) : null
                )}
              </div>
            </motion.article>

            {/* POSTCARD 05 — "SPACECRAFT STATS" (+1.5deg tilt, staggered offset) */}
            <motion.article
              initial={{ opacity: 0, y: 36, rotate: 1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 1.5 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ rotate: 0, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className={`md:mt-10 border-[3px] rounded-3xl overflow-hidden ${postcardShadow} ${
                isMars ? 'bg-[#F5E6D3] border-[#44403C]' : 'bg-[#F8FAFC] border-[#06090F]'
              }`}
            >
              <div
                className={`border-b-[3px] px-6 py-4 flex items-center justify-between gap-3 ${
                  isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#0D131F] border-[#06090F]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-xl border-2 text-xs font-black uppercase ${
                      isMars
                        ? 'bg-[#D97706] border-[#1C140F] text-[#1C140F] shadow-[0_2px_0_#F5E6D3]'
                        : 'bg-[#38BDF8] border-[#06090F] text-[#06090F] shadow-[0_2px_0_#38BDF8]'
                    }`}
                  >
                    05
                  </span>
                  <div>
                    <h2
                      className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                        isMars ? 'text-[#F5E6D3]' : 'text-[#F8FAFC]'
                      }`}
                    >
                      Spacecraft Stats
                    </h2>
                    <p
                      className={`text-xs font-bold ${
                        isMars ? 'text-[#A8A29E]' : 'text-[#E0F2FE]/85'
                      }`}
                    >
                      Size, power &amp; science gadgets
                    </p>
                  </div>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                    isMars ? 'bg-[#F5E6D3] border-[#D97706]' : 'bg-[#F8FAFC] border-[#38BDF8]'
                  }`}
                >
                  <Wrench className={`w-5 h-5 ${isMars ? 'text-[#1C140F]' : 'text-[#06090F]'}`} />
                </div>
              </div>

              <div className="p-6 sm:p-7 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className={`border-2 rounded-2xl p-3 ${
                      isMars ? 'bg-[#E7E5E4] border-[#44403C]' : 'bg-[#D1FAE5] border-[#06090F]'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 text-[10px] font-black uppercase ${
                        isMars ? 'text-[#92400E]' : 'text-[#065F46]'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Mass</span>
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-black mt-1 leading-tight ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {statPills.mass}
                    </p>
                  </div>

                  <div
                    className={`border-2 rounded-2xl p-3 ${
                      isMars ? 'bg-[#FFFFFF]/80 border-[#44403C]' : 'bg-[#E0F2FE] border-[#06090F]'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 text-[10px] font-black uppercase ${
                        isMars ? 'text-[#44403C]' : 'text-[#075985]'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size</span>
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-black mt-1 leading-tight ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {statPills.size}
                    </p>
                  </div>

                  <div
                    className={`border-2 rounded-2xl p-3 ${
                      isMars ? 'bg-[#E7E5E4] border-[#44403C]' : 'bg-[#EDE9FE] border-[#06090F]'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1 text-[10px] font-black uppercase ${
                        isMars ? 'text-[#92400E]' : 'text-[#5B21B6]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Power</span>
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-black mt-1 leading-tight ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      {statPills.power}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-xs sm:text-sm font-semibold border-2 rounded-2xl p-4 leading-relaxed ${
                    isMars
                      ? 'text-[#1C140F] bg-[#FFFFFF]/80 border-[#44403C]/40'
                      : 'text-[#06090F] bg-[#F8FAFC] border-[#06090F]/25'
                  }`}
                >
                  {artifact.specs}
                </p>

                <div>
                  <h3
                    className={`text-xs font-black uppercase tracking-wider mb-2.5 ${
                      isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                    }`}
                  >
                    Key Onboard Gadgets
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {artifact.instruments.map((inst, idx) => {
                      const palette = isMars ? MARS_INSTRUMENT_TAG_COLORS : INSTRUMENT_TAG_COLORS;
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold ${
                            isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                          } ${palette[idx % palette.length]}`}
                        >
                          <span className="font-mono text-[10px] opacity-75">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span>{inst}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {statsPhotos.map((photo) =>
                  !galleryErrors[photo.url] ? (
                    <figure
                      key={photo.url}
                      className={`border-2 rounded-2xl p-3 flex flex-col gap-2.5 ${
                        isMars
                          ? 'bg-[#E7E5E4] border-[#44403C]'
                          : 'bg-[#E0F2FE]/45 border-[#06090F]'
                      }`}
                    >
                      <div
                        className={`rounded-xl overflow-hidden border p-1.5 ${
                          isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#06090F] border-[#06090F]'
                        }`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setGalleryErrors((prev) => ({
                              ...prev,
                              [photo.url]: true,
                            }))
                          }
                          className="w-full h-auto max-h-64 object-contain mx-auto rounded-lg"
                        />
                      </div>
                      <figcaption
                        className={`px-1 text-xs font-bold leading-snug ${
                          isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                        }`}
                      >
                        {photo.caption}
                      </figcaption>
                    </figure>
                  ) : null
                )}

                {artifact.officialSource && (
                  <div
                    className={`pt-3 border-t-2 flex items-center justify-between gap-3 text-xs ${
                      isMars ? 'border-[#44403C]/25' : 'border-[#06090F]/15'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono font-bold truncate ${
                        isMars ? 'text-[#1C140F]' : 'text-[#06090F]'
                      }`}
                    >
                      <BookOpen
                        className={`w-4 h-4 shrink-0 ${
                          isMars ? 'text-[#B45309]' : 'text-[#7C3AED]'
                        }`}
                      />
                      {artifact.catalogRef || 'NASA Archive'}
                    </span>
                    <a
                      href={artifact.officialSource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-black shrink-0 transition-colors ${
                        isMars
                          ? 'bg-[#E7E5E4] hover:bg-[#D97706] border-[#44403C] text-[#1C140F]'
                          : 'bg-[#F8FAFC] hover:bg-[#38BDF8] border-[#06090F] text-[#06090F]'
                      }`}
                    >
                      <span>NASA Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </motion.article>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 4. BOTTOM NAVIGATION STRIP (PREV / NEXT ARTIFACT)                */}
        {/* ================================================================ */}
        <footer className="flex items-center justify-between gap-4 pt-4">
          <button
            onClick={onPrevArtifact}
            className={`min-h-[44px] px-5 py-2.5 rounded-2xl border-[3px] active:translate-y-0.5 active:shadow-none text-sm font-black flex items-center gap-2 transition-all ${
              isMars
                ? 'bg-[#291D16] hover:bg-[#D97706] border-[#57534E] hover:border-[#1C140F] shadow-[0_4px_0_#1C140F] text-[#F5E6D3] hover:text-[#1C140F]'
                : 'bg-[#F8FAFC] hover:bg-[#E0F2FE] border-[#38BDF8] shadow-[0_4px_0_#38BDF8] text-[#06090F]'
            }`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.75]" />
            <span>Previous Artifact</span>
          </button>

          <button
            onClick={() => {
              nasaVoice.stop();
              onClose();
            }}
            className={`min-h-[42px] px-4 py-2 rounded-2xl border-2 text-xs font-black transition-colors hidden sm:inline-flex ${
              isMars
                ? 'bg-[#1C140F] hover:bg-[#F5E6D3] border-[#57534E] text-[#F5E6D3] hover:text-[#1C140F]'
                : 'bg-[#0D131F] hover:bg-[#38BDF8] border-[#38BDF8] text-[#F8FAFC] hover:text-[#06090F]'
            }`}
          >
            Back to {zoneMeta.label} Globe
          </button>

          <button
            onClick={onNextArtifact}
            className={`min-h-[44px] px-5 py-2.5 rounded-2xl border-[3px] active:translate-y-0.5 active:shadow-none text-sm font-black flex items-center gap-2 transition-all ${
              isMars
                ? 'bg-[#F5E6D3] hover:bg-[#D97706] border-[#1C140F] shadow-[0_4px_0_#D97706] text-[#1C140F]'
                : 'bg-[#38BDF8] hover:bg-[#0EA5E9] border-[#06090F] shadow-[0_4px_0_#7C3AED] text-[#06090F]'
            }`}
          >
            <span>Next Artifact</span>
            <ChevronRight className="w-4 h-4 stroke-[2.75]" />
          </button>
        </footer>
      </div>
    </div>
  );
};
