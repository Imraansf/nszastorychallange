/**
 * @file SiDisclosureModal.tsx
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * Voice narration is dynamically synthesized using Gemini Text-to-Speech (TTS) voices with browser Web Speech fallback.
 * All archival photography, historical references, and storytelling copy are 100% human-created/curated (zero AI-generated images or videos).
 */

import React, { useEffect } from 'react';
import { X, Code2, Volume2 } from 'lucide-react';
import { CelestialBody } from '../types/space';

export interface SiDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeBody?: CelestialBody | 'landing';
}

export const SiDisclosureModal: React.FC<SiDisclosureModalProps> = ({
  isOpen,
  onClose,
  themeBody = 'moon',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMars = themeBody === 'mars';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020408]/80 backdrop-blur-md animate-in fade-in duration-150"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="si-disclosure-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)] ${
          isMars
            ? 'bg-[#1C140F] border-[#D97706] text-[#F5E6D3]'
            : 'bg-[#0D1119] border-[#BAE6FD] text-[#F8FAFC]'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-start justify-between gap-3 pb-4 border-b ${
            isMars ? 'border-[#44403C]' : 'border-[#273043]'
          }`}
        >
          <div>
            <p
              className={`text-[11px] font-mono font-bold uppercase tracking-widest ${
                isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'
              }`}
            >
              NASA Space Apps Challenge · Transparency Notice
            </p>
            <h2
              id="si-disclosure-modal-title"
              className="mt-1 text-lg sm:text-xl font-black tracking-tight"
            >
              Credits &amp; SI / AI Disclosure
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Credits and SI Disclosure dialog"
            className={`min-w-[40px] min-h-[40px] rounded-xl border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              isMars
                ? 'bg-[#291D16] hover:bg-[#D97706]/20 border-[#57534E] text-[#F5E6D3] focus-visible:ring-[#D97706]'
                : 'bg-[#182030] hover:bg-[#273248] border-[#3B4A68] text-[#F8FAFC] focus-visible:ring-[#BAE6FD]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Disclosure Sections */}
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <div
            className={`rounded-xl p-4 border ${
              isMars
                ? 'bg-[#291D16]/90 border-[#44403C]'
                : 'bg-[#141A26] border-[#273043]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono">
              <Code2 className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'}`} />
              <span>Code &amp; Architecture</span>
            </div>
            <p className={`mt-1.5 text-xs sm:text-sm ${isMars ? 'text-[#E7E5E4]' : 'text-[#E2E8F0]'}`}>
              Built and structured using Google AI Studio (Gemini).
            </p>
          </div>

          <div
            className={`rounded-xl p-4 border ${
              isMars
                ? 'bg-[#291D16]/90 border-[#44403C]'
                : 'bg-[#141A26] border-[#273043]'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono">
              <Volume2 className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'}`} />
              <span>Audio Narration</span>
            </div>
            <p className={`mt-1.5 text-xs sm:text-sm ${isMars ? 'text-[#E7E5E4]' : 'text-[#E2E8F0]'}`}>
              Voice narration is dynamically synthesized using Google Gemini Text-to-Speech (TTS)
              voices (with local browser Web Speech synthesis fallback when offline or rate-limited).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[40px] px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              isMars
                ? 'bg-[#D97706] hover:bg-[#F59E0B] text-[#1C140F] focus-visible:ring-[#F5E6D3]'
                : 'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#06090F] focus-visible:ring-[#F8FAFC]'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
