import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Globe, Rocket, ArrowRight, Sparkles, Compass } from 'lucide-react';
import { playTelemetryBeep, playSuccessChime } from '../utils/audio';

import { CelestialBody } from '../types/space';

interface MapOnboardingPostcardsProps {
  /** Temporarily hide while a target or landmark card is open so cards never overlap */
  isTemporarilyHidden?: boolean;
  body?: CelestialBody;
}

interface TutorialStep {
  stepNumber: string;
  title: string;
  body: string;
  deepSpaceBody?: string;
  ctaLabel: string;
  tiltDeg: number;
  icon: React.ComponentType<{ className?: string }>;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepNumber: '01',
    title: 'BACK TO LOBBY',
    body: 'Click the Menu button in the top-left corner anytime to fly back to the spaceship lobby and choose another world: Moon, Mars, or Deepspace.',
    ctaLabel: 'Got it! Next',
    tiltDeg: -1,
    icon: Menu,
  },
  {
    stepNumber: '02',
    title: 'EXPLORE IN 3D',
    body: 'Drag with your mouse or finger to spin the 3D world, scroll to zoom in close, or use the Navigation Control box on the left to orbit and reset the camera.',
    deepSpaceBody:
      'Drag to rotate the 3D solar system and scroll to zoom! Use the System Orrery on the left to jump to planets or scrub mission time (1970–2040), and use the top tabs to filter spacecraft.',
    ctaLabel: 'Next',
    tiltDeg: 1,
    icon: Globe,
  },
  {
    stepNumber: '03',
    title: 'MISSION TIMELINE & RELICS',
    body: 'Use the timeline bar at the bottom to browse missions! Click any mission card—or tap any glowing beacon on the map—to zoom in and open its full story dossier.',
    deepSpaceBody:
      'Use the timeline bar at the bottom—or click any glowing spacecraft along its orbital path—to follow its trajectory, zoom in, and open its full story dossier.',
    ctaLabel: "Let's Explore!",
    tiltDeg: -1,
    icon: Rocket,
  },
];

export const MapOnboardingPostcards: React.FC<MapOnboardingPostcardsProps> = ({
  isTemporarilyHidden = false,
  body,
}) => {
  const isMars = body === 'mars';
  const isDeepSpace = body === 'deep_space';
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    setIsDismissed(false);
    setCurrentStepIndex(0);
  }, [body]);

  if (isDismissed || isTemporarilyHidden) {
    return null;
  }

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const stepBody = isDeepSpace && currentStep.deepSpaceBody ? currentStep.deepSpaceBody : currentStep.body;
  const StepIcon = currentStep.icon;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleAdvance = () => {
    if (!isLastStep) {
      playTelemetryBeep(540);
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      playSuccessChime();
      setIsDismissed(true);
    }
  };

  return (
    <aside
      aria-label="Map Exploration Quick Guide"
      className="pointer-events-none fixed top-16 sm:top-20 right-3 sm:right-5 z-30 w-[calc(100vw-24px)] max-w-[310px] sm:max-w-[330px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.stepNumber}
          initial={{ opacity: 0, x: 36, y: 10, scale: 0.94, rotate: currentStep.tiltDeg }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: currentStep.tiltDeg }}
          exit={{ opacity: 0, x: 40, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          className={`pointer-events-auto rounded-3xl overflow-hidden backdrop-blur-xl ${
            isMars
              ? 'bg-[rgba(28,20,15,0.94)] border-2 border-[#57534E] shadow-[0_12px_32px_rgba(0,0,0,0.55)] text-[#F5E6D3]'
              : 'bg-[rgba(28,29,33,0.95)] border-2 border-[#BAE6FD] shadow-none text-[#F4F4F5]'
          }`}
        >
          {/* Airmail Postcard Stripe */}
          <div
            className={`h-2 w-full border-b ${isMars ? 'border-[#44403C]' : 'border-[#3F3F46]'}`}
            style={{
              background: isMars
                ? 'repeating-linear-gradient(135deg, #F5E6D3 0px 12px, #291D16 12px 20px, #FFFFFF 20px 32px, #291D16 32px 40px)'
                : 'repeating-linear-gradient(135deg, #BAE6FD 0px 12px, #27282D 12px 20px, #FFFFFF 20px 32px, #27282D 32px 40px)',
            }}
            aria-hidden="true"
          />

          {/* Postcard Header */}
          <div
            className={`border-b px-4 py-3 flex items-center justify-between gap-2.5 ${
              isMars
                ? 'bg-[#291D16] border-[#57534E]'
                : 'bg-[#27282D] border-[#BAE6FD]/50'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`shrink-0 px-2 py-0.5 rounded-lg border text-[11px] font-black font-hud-display ${
                  isMars
                    ? 'bg-[#F5E6D3] border-[#F5E6D3] text-[#1C140F]'
                    : 'bg-[#BAE6FD] border-[#BAE6FD] text-[#1C1D21]'
                }`}
              >
                {currentStep.stepNumber}/03
              </span>
              <h3 className="font-hud-display text-sm sm:text-base font-bold uppercase tracking-wide leading-tight text-[#FFFFFF]">
                {currentStep.title}
              </h3>
            </div>

            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                isMars
                  ? 'bg-[#1C140F] border-[#57534E]'
                  : 'bg-[#1C1D21] border-[#BAE6FD]'
              }`}
            >
              <StepIcon className={`w-4 h-4 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
            </div>
          </div>

          {/* Postcard Body */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-2.5">
              <span
                className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center ${
                  isMars
                    ? 'bg-[#291D16] border-[#57534E]'
                    : 'bg-[#27282D] border-[#BAE6FD]/70'
                }`}
              >
                {isLastStep ? (
                  <Sparkles className={`w-3.5 h-3.5 ${isMars ? 'text-[#FFFFFF]' : 'text-[#BAE6FD]'}`} />
                ) : (
                  <Compass className={`w-3.5 h-3.5 ${isMars ? 'text-[#FFFFFF]' : 'text-[#BAE6FD]'}`} />
                )}
              </span>
              <p
                className={`font-hud-body text-xs sm:text-[13px] font-semibold leading-relaxed ${
                  isMars ? 'text-[#F5E6D3]' : 'text-[#FFFFFF]'
                }`}
              >
                {stepBody}
              </p>
            </div>

            {/* Step Progress Dots + Action Button */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {TUTORIAL_STEPS.map((step, idx) => (
                  <span
                    key={step.stepNumber}
                    className={`h-2 rounded-full border transition-all ${
                      isMars
                        ? idx === currentStepIndex
                          ? 'w-6 bg-[#FFFFFF] border-[#FFFFFF]'
                          : idx < currentStepIndex
                          ? 'w-2.5 bg-[#F5E6D3] border-[#F5E6D3]'
                          : 'w-2.5 bg-[#291D16] border-[#57534E]'
                        : idx === currentStepIndex
                        ? 'w-6 bg-[#BAE6FD] border-[#BAE6FD]'
                        : idx < currentStepIndex
                        ? 'w-2.5 bg-[#FFFFFF] border-[#BAE6FD]'
                        : 'w-2.5 bg-[#3F4147] border-[#52525B]'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleAdvance}
                className={`font-hud-display min-h-[38px] px-4 py-2 rounded-xl border active:translate-y-0.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                  isMars
                    ? 'bg-[#F5E6D3] hover:bg-[#FFFFFF] border-[#F5E6D3] text-[#1C140F] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
                    : 'bg-[#BAE6FD] hover:bg-[#FFFFFF] border-[#BAE6FD] text-[#1C1D21] shadow-none'
                }`}
              >
                <span>{currentStep.ctaLabel}</span>
                {!isLastStep && <ArrowRight className="w-3.5 h-3.5 stroke-[2.75]" />}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
};
