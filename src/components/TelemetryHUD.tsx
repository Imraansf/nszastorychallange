import React, { useState } from 'react';
import {
  Compass,
  RotateCcw,
  Globe,
  Crosshair,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { Relic } from './CesiumGlobeViewer';

interface TelemetryHUDProps {
  selectedBody: 'MOON' | 'MARS' | 'moon' | 'mars';
  activeRelic: Relic | null;
  crosshairCoords: { lat: number; lon: number } | null;
  cameraHeightKm: number;
  activePreset: 'orbital' | 'north' | 'equator' | 'target';
  onFlyToPreset: (preset: 'orbital' | 'north' | 'equator' | 'target') => void;
  onZoom: (direction: 'in' | 'out') => void;
  onSelectRelic?: (relic: Relic) => void;
  className?: string;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  selectedBody,
  activeRelic,
  crosshairCoords,
  cameraHeightKm,
  activePreset,
  onFlyToPreset,
  onZoom,
  className = '',
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const normalizedBody = selectedBody.toUpperCase();
  const isMars = normalizedBody === 'MARS';

  const coordsString = crosshairCoords
    ? `${crosshairCoords.lat >= 0 ? `${crosshairCoords.lat.toFixed(1)}°N` : `${Math.abs(crosshairCoords.lat).toFixed(1)}°S`}, ${crosshairCoords.lon >= 0 ? `${crosshairCoords.lon.toFixed(1)}°E` : `${Math.abs(crosshairCoords.lon).toFixed(1)}°W`}`
    : activeRelic && activeRelic.coordinates
    ? `${activeRelic.coordinates.lat >= 0 ? `${activeRelic.coordinates.lat.toFixed(1)}°N` : `${Math.abs(activeRelic.coordinates.lat).toFixed(1)}°S`}, ${activeRelic.coordinates.lon >= 0 ? `${activeRelic.coordinates.lon.toFixed(1)}°E` : `${Math.abs(activeRelic.coordinates.lon).toFixed(1)}°W`}`
    : '28.5°N, 80.6°W';

  const altitudeString =
    cameraHeightKm > 0
      ? `${cameraHeightKm >= 1000 ? (cameraHeightKm / 1000).toFixed(1) + 'k' : cameraHeightKm.toLocaleString()} km`
      : 'Orbital';

  return (
    <div
      className={`pointer-events-auto select-none touch-manipulation transition-all duration-300 ${
        isMinimized ? 'w-auto' : 'w-56 sm:w-60'
      } ${className}`}
    >
      {/* 1. Minimized Mode */}
      {isMinimized ? (
        <div
          className={`flex items-center gap-1 backdrop-blur-xl rounded-full p-0.5 ${
            isMars
              ? 'bg-[rgba(28,20,15,0.85)] border border-[#57534E] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
              : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] shadow-none'
          }`}
        >
          <button
            onClick={() => setIsMinimized(false)}
            className={`px-2.5 py-1 flex items-center gap-1.5 rounded-full text-[10px] font-mono border transition-colors ${
              isMars
                ? 'bg-[#291D16] hover:bg-[#D97706]/20 text-[#F5E6D3] border-[#44403C]'
                : 'bg-[#27282D] hover:bg-[#34363C] text-[#F4F4F5] border-[#52525B]'
            }`}
            title="Expand Telemetry HUD"
          >
            <Activity className={`w-3 h-3 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
            <span className="font-black tracking-wider uppercase">
              HUD • {altitudeString}
            </span>
            <ChevronDown className={`w-3 h-3 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
          </button>
        </div>
      ) : (
        /* 2. Expanded Mode */
        <div
          className={`backdrop-blur-xl rounded-2xl p-2.5 flex flex-col gap-2 ${
            isMars
              ? 'bg-[rgba(28,20,15,0.85)] border border-[#57534E] shadow-[0_8px_30px_rgba(0,0,0,0.5)] text-[#F5E6D3]'
              : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] shadow-none text-[#F4F4F5]'
          }`}
        >
          {/* Header Bar */}
          <div
            className={`flex items-center justify-between pb-1.5 border-b ${
              isMars ? 'border-[#44403C]' : 'border-[#3F3F46]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMars
                    ? 'bg-[#D97706] shadow-[0_0_8px_#D97706]'
                    : 'bg-[#D4D4D8]'
                }`}
              />
              <span
                className={`text-[10px] font-mono uppercase tracking-widest font-black ${
                  isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'
                }`}
              >
                NASA {normalizedBody}
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className={`p-1 rounded-lg transition-colors ${
                isMars
                  ? 'hover:bg-[#D97706]/20 text-[#A8A29E] hover:text-[#F5E6D3]'
                  : 'hover:bg-[#34363C] text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
              title="Minimize Telemetry HUD"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Telemetry Metrics Line */}
          <div
            className={`rounded-xl px-2.5 py-1.5 border flex items-center justify-between text-[9px] font-mono tabular-nums ${
              isMars
                ? 'bg-[#291D16] border-[#44403C]'
                : 'bg-[#27282D] border-[#3F3F46]'
            }`}
          >
            <span className={`font-bold truncate ${isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'}`}>
              {coordsString}
            </span>
            <span
              className={`font-black shrink-0 ml-1 ${
                isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'
              }`}
            >
              {altitudeString}
            </span>
          </div>

          {/* Camera View Presets */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onFlyToPreset('orbital')}
              className={`py-1.5 px-1.5 rounded-xl text-[9px] font-mono transition-all flex items-center justify-center gap-1 border ${
                isMars
                  ? activePreset === 'orbital'
                    ? 'bg-[#D97706] text-[#1C140F] font-black border-[#F5E6D3] shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                    : 'bg-[#291D16] border-[#44403C] text-[#F5E6D3] font-bold hover:bg-[#D97706]/15 hover:border-[#D97706]'
                  : activePreset === 'orbital'
                  ? 'bg-[#3F4147] text-[#F4F4F5] font-black border-[#BAE6FD] shadow-none'
                  : 'bg-[#27282D] border-[#3F3F46] text-[#D4D4D8] font-bold hover:bg-[#34363C] hover:border-[#BAE6FD]/70 hover:text-[#F4F4F5]'
              }`}
              title="Orbital Overview"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Orbit</span>
            </button>

            <button
              onClick={() => onFlyToPreset('north')}
              className={`py-1.5 px-1.5 rounded-xl text-[9px] font-mono transition-all flex items-center justify-center gap-1 border ${
                isMars
                  ? activePreset === 'north'
                    ? 'bg-[#D97706] text-[#1C140F] font-black border-[#F5E6D3] shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                    : 'bg-[#291D16] border-[#44403C] text-[#F5E6D3] font-bold hover:bg-[#D97706]/15 hover:border-[#D97706]'
                  : activePreset === 'north'
                  ? 'bg-[#3F4147] text-[#F4F4F5] font-black border-[#BAE6FD] shadow-none'
                  : 'bg-[#27282D] border-[#3F3F46] text-[#D4D4D8] font-bold hover:bg-[#34363C] hover:border-[#BAE6FD]/70 hover:text-[#F4F4F5]'
              }`}
              title="North Pole"
            >
              <Compass className="w-2.5 h-2.5" />
              <span>North</span>
            </button>

            <button
              onClick={() => onFlyToPreset('equator')}
              className={`py-1.5 px-1.5 rounded-xl text-[9px] font-mono transition-all flex items-center justify-center gap-1 border ${
                isMars
                  ? activePreset === 'equator'
                    ? 'bg-[#D97706] text-[#1C140F] font-black border-[#F5E6D3] shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                    : 'bg-[#291D16] border-[#44403C] text-[#F5E6D3] font-bold hover:bg-[#D97706]/15 hover:border-[#D97706]'
                  : activePreset === 'equator'
                  ? 'bg-[#3F4147] text-[#F4F4F5] font-black border-[#BAE6FD] shadow-none'
                  : 'bg-[#27282D] border-[#3F3F46] text-[#D4D4D8] font-bold hover:bg-[#34363C] hover:border-[#BAE6FD]/70 hover:text-[#F4F4F5]'
              }`}
              title="Equator"
            >
              <Globe className="w-2.5 h-2.5" />
              <span>Equator</span>
            </button>
          </div>

          {/* Target Focus & Zoom Row */}
          <div
            className={`flex items-center gap-1.5 pt-1.5 border-t ${
              isMars ? 'border-[#44403C]' : 'border-[#3F3F46]'
            }`}
          >
            {activeRelic && (
              <button
                onClick={() => onFlyToPreset('target')}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[9px] font-mono font-black transition-all flex items-center justify-center gap-1 border active:translate-y-0.5 ${
                  isMars
                    ? activePreset === 'target'
                      ? 'bg-[#D97706] text-[#1C140F] border-[#F5E6D3] shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                      : 'bg-[#291D16] hover:bg-[#D97706]/20 border-[#44403C] hover:border-[#D97706] text-[#F5E6D3]'
                    : activePreset === 'target'
                    ? 'bg-[#3F4147] text-[#F4F4F5] border-[#BAE6FD] shadow-none'
                    : 'bg-[#27282D] hover:bg-[#34363C] border-[#3F3F46] hover:border-[#BAE6FD] text-[#F4F4F5]'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span>Focus</span>
              </button>
            )}

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                onClick={() => onZoom('in')}
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all border active:translate-y-0.5 ${
                  isMars
                    ? 'bg-[#291D16] hover:bg-[#D97706] text-[#F5E6D3] hover:text-[#1C140F] border-[#44403C] hover:border-[#F5E6D3]'
                    : 'bg-[#27282D] hover:bg-[#3F4147] text-[#F4F4F5] border-[#3F3F46] hover:border-[#BAE6FD]'
                }`}
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={() => onZoom('out')}
                className={`w-7 h-7 flex items-center justify-center rounded-xl transition-all border active:translate-y-0.5 ${
                  isMars
                    ? 'bg-[#291D16] hover:bg-[#D97706] text-[#F5E6D3] hover:text-[#1C140F] border-[#44403C] hover:border-[#F5E6D3]'
                    : 'bg-[#27282D] hover:bg-[#3F4147] text-[#F4F4F5] border-[#3F3F46] hover:border-[#BAE6FD]'
                }`}
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
