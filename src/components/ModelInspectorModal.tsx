/**
 * @file ModelInspectorModal.tsx
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Artifact } from '../types/space';
import {
  X,
  Cpu,
  Zap,
  Weight,
  Ruler,
  Radio,
  ExternalLink,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { playWhooshSound } from '../utils/audio';
import { Artifact3DViewport, ModelViewportStatus } from './Artifact3DViewport';
import { getSpacecraftModelAsset } from '../utils/spacecraft-models';
import { sanitizeExternalUrl } from '../utils/url-security';

export interface ModelInspectorModalProps {
  artifact: Artifact | null;
  onClose: () => void;
}

export const ModelInspectorModal: React.FC<ModelInspectorModalProps> = ({
  artifact,
  onClose,
}) => {
  const [viewportStatus, setViewportStatus] =
    useState<ModelViewportStatus>('loading');
  const [assetLabel, setAssetLabel] = useState<string>('');

  useEffect(() => {
    if (!artifact) return;
    const asset = getSpacecraftModelAsset(artifact.id);
    setViewportStatus(asset.modelPath ? 'loading' : 'hologram_fallback');
    setAssetLabel(asset.assetLabel);
  }, [artifact]);

  useEffect(() => {
    if (!artifact) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playWhooshSound('out');
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [artifact, onClose]);

  const handleStatusChange = useCallback(
    (status: ModelViewportStatus, label: string) => {
      setViewportStatus(status);
      setAssetLabel(label);
    },
    []
  );

  // Technical engineering specifications
  const specs = useMemo(() => {
    if (!artifact) return null;

    const isRover = artifact.category === 'rover';
    const isLander = artifact.category === 'uncrewed_lander';
    const isApollo = artifact.category === 'apollo_crewed';
    const isProbe =
      artifact.category === 'interstellar_probe' ||
      artifact.category === 'space_telescope' ||
      artifact.category === 'planetary_orbiter';

    let dimensions = '1.8m × 1.5m × 1.2m';
    let powerSource = 'Multi-Junction Solar Array (GaAs/Ge)';
    let mass = artifact.massKg ? `${artifact.massKg.toLocaleString()} kg` : '185 kg';

    if (isRover) {
      dimensions =
        artifact.id.includes('opportunity')
          ? '1.6m (L) × 2.3m (W) × 1.5m (H)'
          : artifact.id.includes('ingenuity')
          ? '1.2m Rotor Span × 0.49m (H)'
          : '0.65m (L) × 0.48m (W) × 0.30m (H)';
      powerSource =
        artifact.id.includes('opportunity') ||
        artifact.id.includes('pathfinder') ||
        artifact.id.includes('ingenuity')
          ? 'Solar Photovoltaics + Rechargeable Batteries'
          : 'Radioisotope Power System';
      mass = artifact.massKg ? `${artifact.massKg} kg` : '185 kg';
    } else if (isApollo) {
      dimensions = '4.3m (H) × 9.4m (Diagonal Footpad Span)';
      powerSource = 'Ag-Zn Secondary Storage Batteries (28V DC, 1600 Ah)';
      mass = artifact.massKg ? `${artifact.massKg} kg` : '2,034 kg (Descent dry)';
    } else if (isProbe) {
      dimensions = '2.74m Dish Dia · Deep Space Bus';
      powerSource =
        artifact.id.includes('pioneer')
          ? '2× SNAP-19 Plutonium-238 RTGs'
          : 'Solar Array + Xenon / Hydrazine Propulsion';
      mass = artifact.massKg ? `${artifact.massKg} kg` : '258 kg';
    } else if (isLander) {
      dimensions = '2.4m (Span) × 1.5m (H)';
      powerSource =
        artifact.id.includes('viking')
          ? '2× SNAP-19 Plutonium-238 RTGs'
          : 'Twin Solar Arrays';
      mass = artifact.massKg ? `${artifact.massKg} kg` : '350 kg';
    }

    return {
      dimensions,
      powerSource,
      mass,
      agency: artifact.agency,
      mission: artifact.mission,
      location: artifact.locationName,
      status: artifact.statusLabel,
      components: artifact.keyComponents?.length
        ? artifact.keyComponents
        : ['High-Gain Parabolic Telemetry Antenna', 'Science Instrument Array', 'Avionics Bus'],
    };
  }, [artifact]);

  if (!artifact) return null;

  const isMars = artifact.body === 'mars';
  const modelAsset = getSpacecraftModelAsset(artifact.id);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200 ${
        isMars ? 'bg-[#1C140F]/85' : 'bg-[#090A0D]/85'
      }`}
    >
      {/* Modal Container */}
      <div
        className={`relative w-full max-w-5xl h-[88vh] max-h-[780px] rounded-3xl flex flex-col overflow-hidden ${
          isMars
            ? 'bg-[#291D16] border border-[#57534E] shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
            : 'bg-[#1C1D21] border-2 border-[#BAE6FD] shadow-none'
        }`}
      >
        {/* Top Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between gap-4 shrink-0 ${
            isMars
              ? 'bg-[#1C140F] border-[#44403C]'
              : 'bg-[#27282D] border-[#3F3F46]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                isMars
                  ? 'bg-[#291D16] border-[#57534E] text-[#F5E6D3]'
                  : 'bg-[#1C1D21] border-[#BAE6FD] text-[#BAE6FD]'
              }`}
            >
              <Cpu className={`w-4 h-4 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0 ${
                    isMars
                      ? 'bg-[#F5E6D3] text-[#1C140F] border-[#F5E6D3]'
                      : 'bg-[#BAE6FD] text-[#1C1D21] border-[#BAE6FD]'
                  }`}
                >
                  3D CAD INSPECTOR
                </span>
                <span
                  className={`text-xs font-mono truncate ${
                    isMars ? 'text-[#A8A29E]' : 'text-[#D4D4D8]'
                  }`}
                >
                  {artifact.agency} • {artifact.date}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-wide truncate mt-0.5 text-[#FFFFFF]">
                {artifact.name} ({artifact.moniker})
              </h3>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              playWhooshSound('out');
              onClose();
            }}
            className={`p-2 rounded-full transition-colors ${
              isMars
                ? 'hover:bg-[#291D16] text-[#F5E6D3] hover:text-[#FFFFFF]'
                : 'hover:bg-[#34363C] text-[#D4D4D8] hover:text-[#FFFFFF]'
            }`}
            title="Close Model Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content: 3D Viewport on Left, Telemetry Specs on Right */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* 3D WebGL Canvas Viewport with ErrorBoundary + Suspense + Draco GLB Loader */}
          <div className="flex-1 relative h-64 sm:h-80 lg:h-full">
            <Artifact3DViewport
              artifact={artifact}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Telemetry Side Panel: NASA Spec Sheet */}
          {specs && (
            <div
              className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l p-6 flex flex-col gap-5 overflow-y-auto ${
                isMars
                  ? 'bg-[#291D16] border-[#44403C]'
                  : 'bg-[#27282D] border-[#3F3F46]'
              }`}
            >
              <div>
                <span
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase block mb-1 ${
                    isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'
                  }`}
                >
                  SYSTEM TELEMETRY
                </span>
                <h4 className="text-base font-bold font-mono text-[#FFFFFF]">
                  Engineering Specifications
                </h4>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div
                  className={`p-4 rounded-2xl border ${
                    isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#1C1D21] border-[#3F3F46]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                      isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    <Weight className={`w-3.5 h-3.5 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
                    <span>Launch Mass</span>
                  </div>
                  <span className="text-sm font-semibold mt-1 block text-[#FFFFFF]">
                    {specs.mass}
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#1C1D21] border-[#3F3F46]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                      isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    <Ruler className={`w-3.5 h-3.5 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
                    <span>Dimensions</span>
                  </div>
                  <span className="text-sm font-semibold mt-1 block truncate text-[#FFFFFF]">
                    {specs.dimensions}
                  </span>
                </div>

                <div
                  className={`col-span-2 p-4 rounded-2xl border ${
                    isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#1C1D21] border-[#3F3F46]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                      isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
                    <span>Power Architecture</span>
                  </div>
                  <span className={`text-sm mt-1 block leading-snug ${isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'}`}>
                    {specs.powerSource}
                  </span>
                </div>

                <div
                  className={`col-span-2 p-4 rounded-2xl border ${
                    isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#1C1D21] border-[#3F3F46]'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider ${
                      isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    <Radio className={`w-3.5 h-3.5 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
                    <span>Resting Site</span>
                  </div>
                  <span className={`text-sm mt-1 block truncate ${isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'}`}>
                    {specs.location}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                        isMars
                          ? 'bg-[#291D16] text-[#F5E6D3] border-[#57534E]'
                          : 'bg-[#3F4147] text-[#F4F4F5] border-[#BAE6FD]'
                      }`}
                    >
                      {specs.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3D Asset Registry Status */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isMars ? 'bg-[#1C140F] border-[#44403C]' : 'bg-[#1C1D21] border-[#3F3F46]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-wider">
                  <span className={`uppercase ${isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'}`}>
                    3D ASSET PIPELINE
                  </span>
                  {viewportStatus === 'glb_loaded' ? (
                    <span className={`flex items-center gap-1 font-bold ${isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'}`}>
                      <CheckCircle className="w-3 h-3" /> GLB PBR ACTIVE
                    </span>
                  ) : viewportStatus === 'loading' ? (
                    <span className={`font-bold ${isMars ? 'text-[#FFFFFF]' : 'text-[#BAE6FD]'}`}>
                      STREAMING GLB...
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 font-bold ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`}>
                      <Sparkles className="w-3 h-3" /> HOLOGRAM MODE
                    </span>
                  )}
                </div>

                <div className={`text-[11px] font-mono truncate ${isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'}`}>
                  {assetLabel || modelAsset.assetLabel}
                </div>

                {modelAsset.modelPath ? (
                  <div className={`text-[10px] font-mono break-all ${isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'}`}>
                    Path: {modelAsset.modelPath}
                  </div>
                ) : (
                  <p className={`text-[10px] font-sans leading-relaxed ${isMars ? 'text-[#A8A29E]' : 'text-[#D4D4D8]'}`}>
                    {modelAsset.fallbackReason}
                  </p>
                )}

                <a
                  href={
                    sanitizeExternalUrl(artifact.nasa3dResourceUrl) ||
                    'https://github.com/nasa/NASA-3D-Resources'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-colors ${
                    isMars
                      ? 'bg-[#291D16] hover:bg-[#3A291F] text-[#F5E6D3] border-[#57534E]'
                      : 'bg-[#27282D] hover:bg-[#34363C] text-[#FFFFFF] border-[#BAE6FD]'
                  }`}
                >
                  <ExternalLink className={`w-3 h-3 ${isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'}`} />
                  <span>NASA 3D Resources GitHub</span>
                </a>
              </div>

              {/* Inspiring Scientific Legacy Callout */}
              <div
                className={`mt-auto p-4 rounded-2xl border text-xs font-sans ${
                  isMars
                    ? 'bg-[#1C140F] border-[#57534E] text-[#F5E6D3]'
                    : 'bg-[#1C1D21] border-[#BAE6FD] text-[#F4F4F5]'
                }`}
              >
                <span
                  className={`font-bold text-[10px] block mb-1.5 uppercase tracking-widest ${
                    isMars ? 'text-[#F5E6D3]' : 'text-[#BAE6FD]'
                  }`}
                >
                  IN MY OWN WORDS
                </span>
                <p className="text-[11px] font-sans leading-relaxed italic text-[#FFFFFF]">
                  “{artifact.story.forSchoolKids}”
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
