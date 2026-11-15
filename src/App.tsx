import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Artifact, CelestialBody, PlanetaryLandmark } from './types/space';
import {
  getArtifacts,
  getPlanetaryLandmarks,
  getArtifactById,
} from './utils/space-data';
import { CelestialGlobe } from './components/CelestialGlobe';
import { CesiumGlobeViewer } from './components/CesiumGlobeViewer';
import { DeepSpaceExplorer } from './components/DeepSpaceExplorer';
import { StoryDrawer } from './components/StoryDrawer';
import { LandingIntro } from './components/LandingIntro';
import { MapOnboardingPostcards } from './components/MapOnboardingPostcards';
import {
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  Home,
  Footprints,
  Compass,
} from 'lucide-react';
import { ModelInspectorModal } from './components/ModelInspectorModal';
import { SurfaceExplorerGame } from './components/SurfaceExplorerGame';
import {
  toggleAudioMute,
  getAudioMuted,
  playPlanetWhoosh,
  playArtifactRememberingWhoosh,
  playWhooshSound,
} from './utils/audio';

const DESKTOP_MEDIA_QUERY = '(min-width: 1025px) and (pointer: fine)';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isReturningToLobby, setIsReturningToLobby] = useState(false);
  const [currentBody, setCurrentBody] = useState<CelestialBody>('moon');
  const [engineMode] = useState<'cesium' | 'globe'>('cesium');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [showSmallPopup, setShowSmallPopup] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<PlanetaryLandmark | null>(null);
  const [showLandmarks] = useState(true);
  const [inspectingArtifact, setInspectingArtifact] = useState<Artifact | null>(null);
  const [surfaceGameArtifact, setSurfaceGameArtifact] = useState<Artifact | null>(null);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.matchMedia(DESKTOP_MEDIA_QUERY).matches : false
  );
  const [isMuted, setIsMuted] = useState(() => getAudioMuted());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasSelectedPlanet, setHasSelectedPlanet] = useState(false);
  const [zoneVisitId, setZoneVisitId] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const desktopMql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsTimelineCollapsed(!e.matches);
    };
    setIsTimelineCollapsed(!desktopMql.matches);
    desktopMql.addEventListener('change', handleMediaChange);
    return () => desktopMql.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMenuOpen]);

  const artifacts = useMemo(() => getArtifacts(currentBody), [currentBody]);
  const landmarks = useMemo(() => getPlanetaryLandmarks(currentBody), [currentBody]);

  // Zoom onto object first; display small pop-up on the right hand side after zoom animation completes (2.0s duration)
  useEffect(() => {
    if (selectedArtifact && !isDossierOpen) {
      setShowSmallPopup(false);
      const timer = setTimeout(() => {
        setShowSmallPopup(true);
      }, 2100);
      return () => clearTimeout(timer);
    } else {
      setShowSmallPopup(false);
    }
  }, [selectedArtifact?.id, isDossierOpen]);

  const filteredArtifacts = artifacts;

  const handleToggleMute = useCallback(() => {
    const nextMuted = toggleAudioMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      playWhooshSound('ui');
    }
  }, []);

  const handleSelectArtifact = useCallback((artifact: Artifact | null) => {
    if (artifact) {
      playArtifactRememberingWhoosh();
    } else {
      playWhooshSound('out');
    }
    setSelectedArtifact(artifact);
    setIsDossierOpen(false);
    setSelectedLandmark(null);
  }, []);

  const handleOpenCadInspector = useCallback((artifact: Artifact) => {
    playWhooshSound('in');
    setInspectingArtifact(artifact);
  }, []);

  const handleSelectLandmark = useCallback((landmark: PlanetaryLandmark) => {
    playWhooshSound('in');
    setSelectedLandmark(landmark);
  }, []);

  const handleNextArtifact = useCallback(() => {
    if (!selectedArtifact || artifacts.length === 0) return;
    const idx = artifacts.findIndex((a) => a.id === selectedArtifact.id);
    const nextIdx = (idx + 1) % artifacts.length;
    handleSelectArtifact(artifacts[nextIdx]);
  }, [selectedArtifact, artifacts, handleSelectArtifact]);

  const handlePrevArtifact = useCallback(() => {
    if (!selectedArtifact || artifacts.length === 0) return;
    const idx = artifacts.findIndex((a) => a.id === selectedArtifact.id);
    const prevIdx = (idx - 1 + artifacts.length) % artifacts.length;
    handleSelectArtifact(artifacts[prevIdx]);
  }, [selectedArtifact, artifacts, handleSelectArtifact]);

  const handleSelectZoneFromLanding = useCallback((zone: CelestialBody) => {
    setCurrentBody(zone);
    setSelectedArtifact(null);
    setSelectedLandmark(null);
    setIsDossierOpen(false);
    setSurfaceGameArtifact(null);
    setIsReturningToLobby(false);
    setShowLanding(false);
    setZoneVisitId((id) => id + 1);
  }, []);

  const isMars = currentBody === 'mars';

  const isOverlayOpen = Boolean(
    (selectedArtifact && isDossierOpen) ||
    Boolean(inspectingArtifact) ||
    Boolean(surfaceGameArtifact)
  );

  if (showLanding) {
    return (
      <LandingIntro
        onSelectZone={handleSelectZoneFromLanding}
        playArrival={isReturningToLobby}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#06090F] text-[#F8FAFC] font-sans select-none">
      {/* 1. Main 3D Viewport (hidden when full-screen menus are open to conserve GPU/WebGL context) */}
      <div className={`absolute inset-0 z-0 ${isOverlayOpen ? 'hidden pointer-events-none' : 'block'}`}>
        <ViewportSection
          currentBody={currentBody}
          engineMode={engineMode}
          filteredArtifacts={filteredArtifacts}
          selectedArtifact={selectedArtifact}
          handleSelectArtifact={handleSelectArtifact}
          landmarks={landmarks}
          showLandmarks={showLandmarks}
          handleSelectLandmark={handleSelectLandmark}
          selectedLandmark={selectedLandmark}
          onPlanetFocusChange={setHasSelectedPlanet}
        />
      </div>

      {/* 2. Floating Top-Left Navigation Menu (Returns to Main Menu to select Moon / Mars / Deep Space) */}
      <nav
        aria-label="Main Navigation Menu"
        className="absolute top-3 left-2 sm:top-4 sm:left-4 z-40 flex flex-col items-start gap-2"
      >
        <button
          onClick={() => {
            playWhooshSound('ui');
            setIsMenuOpen((prev) => !prev);
          }}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl backdrop-blur-xl text-xs font-bold flex items-center gap-2 active:translate-y-0.5 transition-all ${
            isMars
              ? 'bg-[rgba(28,20,15,0.85)] hover:bg-[#291D16] border border-[#57534E] hover:border-[#D97706] text-[#F5E6D3] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
              : 'bg-[rgba(28,29,33,0.92)] hover:bg-[#2A2C32] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none'
          }`}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className={`w-4 h-4 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
          ) : (
            <Menu className={`w-4 h-4 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
          )}
          <span>Menu</span>
          <span className={`font-extrabold ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`}>
            · {currentBody === 'deep_space' ? 'Deep Space' : currentBody === 'mars' ? 'Mars' : 'Moon'}
          </span>
        </button>

        <div
          className={`${
            isMenuOpen ? 'flex' : 'hidden'
          } w-64 backdrop-blur-xl rounded-2xl p-1.5 flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isMars
              ? 'bg-[rgba(28,20,15,0.92)] border border-[#57534E] shadow-[0_12px_32px_rgba(0,0,0,0.55)]'
              : 'bg-[rgba(28,29,33,0.95)] border-2 border-[#BAE6FD] shadow-none'
          }`}
        >
          <button
            onClick={() => {
              playPlanetWhoosh();
              setIsMenuOpen(false);
              setSelectedArtifact(null);
              setSelectedLandmark(null);
              setIsDossierOpen(false);
              setSurfaceGameArtifact(null);
              setIsReturningToLobby(true);
              setShowLanding(true);
            }}
            className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center gap-2.5 transition-all ${
              isMars
                ? 'text-[#F5E6D3] bg-[#291D16] hover:bg-[#D97706]/15 border border-[#44403C] hover:border-[#D97706]'
                : 'text-[#F4F4F5] bg-[#27282D] hover:bg-[#34363C] border border-[#52525B] hover:border-[#BAE6FD]'
            }`}
          >
            <Home className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
            <div>
              <div className={`font-black ${isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'}`}>
                Back to Main Menu
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              playWhooshSound('in');
              setIsMenuOpen(false);
              setSelectedArtifact(null);
              setSelectedLandmark(null);
              setZoneVisitId((id) => id + 1);
            }}
            className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center gap-2.5 transition-all ${
              isMars
                ? 'text-[#F5E6D3] bg-[#291D16] hover:bg-[#D97706]/15 border border-[#44403C] hover:border-[#D97706]'
                : 'text-[#F4F4F5] bg-[#27282D] hover:bg-[#34363C] border border-[#52525B] hover:border-[#BAE6FD]'
            }`}
          >
            <Compass className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
            <span className="font-extrabold">Exploration Guide</span>
          </button>

          <button
            onClick={() => {
              handleToggleMute();
            }}
            className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center gap-2.5 transition-all ${
              isMars
                ? 'text-[#F5E6D3] bg-[#291D16] hover:bg-[#D97706]/15 border border-[#44403C] hover:border-[#D97706]'
                : 'text-[#F4F4F5] bg-[#27282D] hover:bg-[#34363C] border border-[#52525B] hover:border-[#BAE6FD]'
            }`}
          >
            {isMuted ? (
              <VolumeX className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'}`} />
            ) : (
              <Volume2 className={`w-4 h-4 shrink-0 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
            )}
            <span className="font-extrabold">{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </button>
        </div>
      </nav>

      {/* 3. Floating Planetary Landmark Card */}
      {selectedLandmark && currentBody !== 'deep_space' && (
        <div
          className={`absolute top-16 right-3 sm:right-4 left-3 sm:left-auto w-auto sm:w-64 max-w-[260px] z-30 rounded-xl p-2.5 sm:p-3 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 ${
            isMars
              ? 'bg-[rgba(28,20,15,0.85)] border border-[#57534E] shadow-[0_8px_28px_rgba(0,0,0,0.5)]'
              : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] shadow-none'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1.5 ${
              isMars ? 'border-[#44403C]' : 'border-[#3F3F46]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest font-mono ${
                isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isMars ? 'bg-[#D97706]' : 'bg-[#BAE6FD]'
                }`}
              />
              {selectedLandmark.type === 'volcano'
                ? 'Shield Volcano'
                : selectedLandmark.type === 'canyon'
                ? 'Tectonic Canyon'
                : selectedLandmark.type === 'crater'
                ? 'Impact Crater'
                : selectedLandmark.type === 'mare'
                ? 'Basaltic Plain'
                : 'Landmark'}
              {selectedLandmark.diameterKm ? ` • ${selectedLandmark.diameterKm} km` : ''}
            </div>
            <button
              onClick={() => setSelectedLandmark(null)}
              className={`p-1 rounded-md transition-colors ${
                isMars
                  ? 'hover:bg-[#D97706]/20 text-[#A8A29E] hover:text-[#F5E6D3]'
                  : 'hover:bg-[#34363C] text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
              aria-label="Close landmark info"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-0.5">
            <h3
              className={`text-sm font-bold tracking-tight truncate ${
                isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'
              }`}
            >
              {selectedLandmark.name}
            </h3>
            <div
              className={`text-[10px] font-mono tabular-nums truncate ${
                isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
              }`}
            >
              {selectedLandmark.coordinates.lat >= 0
                ? `${selectedLandmark.coordinates.lat.toFixed(1)}°N`
                : `${Math.abs(selectedLandmark.coordinates.lat).toFixed(1)}°S`}
              ,{' '}
              {selectedLandmark.coordinates.lon >= 0
                ? `${selectedLandmark.coordinates.lon.toFixed(1)}°E`
                : `${Math.abs(selectedLandmark.coordinates.lon).toFixed(1)}°W`}
            </div>
          </div>

          <p
            className={`text-xs mt-2 leading-relaxed line-clamp-2 ${
              isMars ? 'text-[#E7E5E4]' : 'text-[#E4E4E7]'
            }`}
          >
            {selectedLandmark.description}
          </p>

          {selectedLandmark.associatedArtifactId && (
            <button
              onClick={() => {
                const artifact = getArtifactById(
                  selectedLandmark.associatedArtifactId!
                );
                if (artifact) {
                  handleSelectArtifact(artifact);
                }
              }}
              className={`mt-2.5 w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                isMars
                  ? 'bg-[#F5E6D3] hover:bg-[#D97706] text-[#1C140F] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
                  : 'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#1C1D21] shadow-none'
              }`}
            >
              <span>View Hardware</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 4. Minimalist Bottom Carousel / Equipment Timeline */}
      {currentBody !== 'deep_space' && (
        <div
          className="absolute bottom-3 sm:bottom-4 inset-x-0 z-20 flex flex-col items-center gap-2 sm:gap-3 px-2 sm:px-4 pointer-events-none transition-all duration-500"
        >
          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={() => {
              playWhooshSound('ui');
              setIsTimelineCollapsed(!isTimelineCollapsed);
            }}
            className={`pointer-events-auto px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-black flex items-center gap-1.5 sm:gap-2 transition-all active:translate-y-0.5 backdrop-blur-xl ${
              isMars
                ? 'bg-[rgba(28,20,15,0.85)] hover:bg-[#291D16] border border-[#57534E] hover:border-[#D97706] shadow-[0_6px_20px_rgba(0,0,0,0.45)] text-[#F5E6D3]'
                : 'bg-[rgba(28,29,33,0.92)] hover:bg-[#2A2C32] border-2 border-[#BAE6FD] shadow-none text-[#F4F4F5]'
            }`}
          >
            {isTimelineCollapsed ? (
              <>
                <ChevronUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
                <span>Show Timeline</span>
              </>
            ) : (
              <>
                <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMars ? 'text-[#D97706]' : 'text-[#D4D4D8]'}`} />
                <span>Hide Timeline</span>
              </>
            )}
          </button>

          {/* Timeline Carousel Strip: Always mounted in the DOM; expanded on desktop, toggled via 'Show Timeline' on mobile */}
          <div
            className={`${
              isTimelineCollapsed ? 'hidden' : 'flex'
            } pointer-events-auto w-[678px] max-w-full h-[65.7875px] backdrop-blur-xl rounded-xl sm:rounded-2xl p-1 sm:p-1.5 items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none snap-x snap-mandatory ${
              isMars
                ? 'bg-[rgba(28,20,15,0.85)] border border-[#57534E] shadow-[0_10px_30px_rgba(0,0,0,0.55)]'
                : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] shadow-none'
            }`}
          >
            {filteredArtifacts.map((artifact: Artifact) => {
              const isSelected = selectedArtifact?.id === artifact.id;
              return (
                <button
                  key={artifact.id}
                  onClick={() => handleSelectArtifact(artifact)}
                  className={`flex-shrink-0 snap-center min-w-[105px] sm:min-w-[160px] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-left transition-all ${
                    isMars
                      ? isSelected
                        ? 'bg-[#D97706] border-[#F5E6D3] text-[#1C140F] shadow-[0_0_14px_rgba(217,119,6,0.45)] scale-[1.03]'
                        : 'bg-[#291D16] border-[#44403C] text-[#F5E6D3] hover:bg-[#D97706]/15 hover:border-[#D97706]'
                      : isSelected
                      ? 'bg-[#3F4147] border-[#BAE6FD] text-[#F4F4F5] shadow-none scale-[1.03]'
                      : 'bg-[#27282D] border-[#3F3F46] text-[#E4E4E7] hover:bg-[#34363C] hover:border-[#BAE6FD]/70'
                  }`}
                >
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-0.5 flex items-center gap-1 sm:gap-1.5 font-mono tabular-nums">
                    <span
                      className={
                        isMars
                          ? isSelected
                            ? 'text-[#1C140F]'
                            : 'text-[#D97706]'
                          : isSelected
                          ? 'text-[#E4E4E7]'
                          : 'text-[#A1A1AA]'
                      }
                    >
                      {artifact.year}
                    </span>
                    {isSelected && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isMars ? 'bg-[#1C140F]' : 'bg-[#BAE6FD]'
                        }`}
                      />
                    )}
                  </div>
                  <h4
                    className={`text-[11px] sm:text-xs font-extrabold truncate ${
                      isMars
                        ? isSelected
                          ? 'text-[#1C140F]'
                          : 'text-[#F5E6D3]'
                        : 'text-[#F4F4F5]'
                    }`}
                  >
                    {artifact.moniker}
                  </h4>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Small Target Popup (Appears after zoom) */}
      {selectedArtifact && !isDossierOpen && showSmallPopup && (
        <div
          className={`absolute top-16 right-3 sm:right-4 left-3 sm:left-auto w-auto sm:w-72 max-w-[300px] z-30 rounded-xl p-3 sm:p-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300 font-sans ${
            isMars
              ? 'bg-[rgba(28,20,15,0.88)] border border-[#57534E] shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
              : 'bg-[rgba(28,29,33,0.94)] border-2 border-[#BAE6FD] shadow-none'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1.5 ${
              isMars ? 'border-[#44403C]' : 'border-[#3F3F46]'
            }`}
          >
            <div
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isMars ? 'bg-[#D97706]' : 'bg-[#BAE6FD]'
                }`}
              />
              Hello from {selectedArtifact.moniker}
            </div>
            <button
              onClick={() => {
                playWhooshSound('out');
                setSelectedArtifact(null);
              }}
              className={`p-1 rounded-md transition-colors ${
                isMars
                  ? 'hover:bg-[#D97706]/20 text-[#A8A29E] hover:text-[#F5E6D3]'
                  : 'hover:bg-[#34363C] text-[#A1A1AA] hover:text-[#F4F4F5]'
              }`}
              aria-label="Close target info"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-0.5">
            <h3
              className={`text-sm font-bold tracking-tight truncate ${
                isMars ? 'text-[#F5E6D3]' : 'text-[#F4F4F5]'
              }`}
            >
              {selectedArtifact.name}
            </h3>
            <div
              className={`text-[11px] font-sans tabular-nums truncate ${
                isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
              }`}
            >
              {selectedArtifact.agency} • {selectedArtifact.year} • {selectedArtifact.locationName}
            </div>
            <p
              className={`mt-2 text-xs font-sans leading-relaxed line-clamp-3 ${
                isMars ? 'text-[#E7E5E4]' : 'text-[#E4E4E7]'
              }`}
            >
              “{selectedArtifact.story.forSchoolKids}”
            </p>
          </div>

          <button
            onClick={() => {
              playWhooshSound('in');
              setIsDossierOpen(true);
            }}
            className={`mt-2.5 w-full py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${
              isMars
                ? 'bg-[#F5E6D3] hover:bg-[#D97706] text-[#1C140F] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
                : 'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#1C1D21] shadow-none'
            }`}
          >
            <span>Read My Full Story</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {(selectedArtifact.body === 'moon' || selectedArtifact.body === 'mars') && (
            <button
              onClick={() => {
                playWhooshSound('in');
                setIsMenuOpen(false);
                setSurfaceGameArtifact(selectedArtifact);
              }}
              className={`mt-2 w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                selectedArtifact.body === 'mars'
                  ? 'bg-[#291D16] hover:bg-[#D97706]/20 text-[#F5E6D3] border border-[#57534E] hover:border-[#D97706] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
                  : 'bg-[#27282D] hover:bg-[#34363C] text-[#F4F4F5] border-2 border-[#BAE6FD] shadow-none'
              }`}
            >
              <Footprints
                className={`w-3.5 h-3.5 shrink-0 ${
                  selectedArtifact.body === 'mars' ? 'text-[#D97706]' : 'text-[#BAE6FD]'
                }`}
              />
              <span>GAME: Land on site</span>
            </button>
          )}
        </div>
      )}

      {/* 6. Full-Screen NASA Mission Dossier Window */}
      {selectedArtifact && isDossierOpen && (
        <StoryDrawer
          artifact={selectedArtifact}
          onClose={() => {
            playWhooshSound('out');
            setIsDossierOpen(false);
          }}
          onNextArtifact={handleNextArtifact}
          onPrevArtifact={handlePrevArtifact}
          onInspectModel={handleOpenCadInspector}
        />
      )}

      {/* 7. Interactive 3D CAD Model Inspector Modal */}
      {inspectingArtifact && (
        <ModelInspectorModal
          artifact={inspectingArtifact}
          onClose={() => {
            playWhooshSound('out');
            setInspectingArtifact(null);
          }}
        />
      )}

      {/* 7b. Interactive 3D Surface Exploration Mini-Game (Moon & Mars Only) */}
      {surfaceGameArtifact && (
        <SurfaceExplorerGame
          artifact={surfaceGameArtifact}
          onClose={() => {
            playWhooshSound('out');
            setSurfaceGameArtifact(null);
          }}
        />
      )}

      {/* 8. Per-Visit Exploration Guide Postcards */}
      <MapOnboardingPostcards
        key={`${currentBody}-${zoneVisitId}`}
        body={currentBody}
        isTemporarilyHidden={Boolean(
          selectedArtifact ||
            selectedLandmark ||
            isDossierOpen ||
            inspectingArtifact ||
            surfaceGameArtifact ||
            hasSelectedPlanet
        )}
      />
    </div>
  );
}

// Sub-component to isolate 3D viewport rendering and prevent refreshes on UI toggle
const ViewportSection = React.memo(({
  currentBody,
  engineMode,
  filteredArtifacts,
  selectedArtifact,
  handleSelectArtifact,
  landmarks,
  showLandmarks,
  handleSelectLandmark,
  selectedLandmark,
  onPlanetFocusChange,
}: any) => {
  return (
    <>
      {currentBody === 'deep_space' ? (
        <DeepSpaceExplorer
          key="deep_space"
          artifacts={filteredArtifacts}
          selectedArtifact={selectedArtifact}
          onSelectArtifact={handleSelectArtifact}
          onPlanetFocusChange={onPlanetFocusChange}
        />
      ) : engineMode === 'cesium' ? (
        <CesiumGlobeViewer
          key={currentBody}
          selectedBody={currentBody === 'mars' ? 'MARS' : 'MOON'}
          relics={filteredArtifacts}
          selectedRelicId={selectedArtifact?.id}
          onSelectRelic={(relic: any) => {
            const fullArtifact = filteredArtifacts.find((a: Artifact) => a.id === relic.id);
            if (fullArtifact) {
              handleSelectArtifact(fullArtifact);
            }
          }}
          landmarks={landmarks}
          showLandmarks={showLandmarks}
          onSelectLandmark={handleSelectLandmark}
          selectedLandmark={selectedLandmark}
        />
      ) : (
        <CelestialGlobe
          key={currentBody}
          body={currentBody}
          artifacts={filteredArtifacts}
          selectedArtifact={selectedArtifact}
          onSelectArtifact={handleSelectArtifact}
          landmarks={landmarks}
          showLandmarks={showLandmarks}
          onSelectLandmark={handleSelectLandmark}
          selectedLandmark={selectedLandmark}
        />
      )}
    </>
  );
});
