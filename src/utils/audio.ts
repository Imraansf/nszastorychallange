// Web Audio API helper for sophisticated, atmospheric cinematic whooshes & surface audio
let audioCtx: AudioContext | null = null;
let isMuted = false;
let pinkNoiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Generates a smooth Paul Kellet pink-noise buffer so air whooshes sound
 * organic, warm, and cinematic rather than harsh white-noise static.
 */
function getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (pinkNoiseBuffer && pinkNoiseBuffer.sampleRate === ctx.sampleRate) {
    return pinkNoiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
    data[i] = Math.max(-1, Math.min(1, sample));
  }

  pinkNoiseBuffer = buffer;
  return buffer;
}

export function toggleAudioMute(muted?: boolean): boolean {
  if (muted !== undefined) {
    isMuted = muted;
  } else {
    isMuted = !isMuted;
  }
  return isMuted;
}

export function getAudioMuted(): boolean {
  return isMuted;
}

/**
 * Quick cinematic whoosh used specifically when transitioning between planets or celestial zones.
 */
export function playPlanetWhoosh() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = getPinkNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.setValueAtTime(1.4, now);
    bandpass.frequency.setValueAtTime(240, now);
    bandpass.frequency.exponentialRampToValueAtTime(1150, now + 0.11);
    bandpass.frequency.exponentialRampToValueAtTime(360, now + 0.28);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.075);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.29);

    src.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + 0.32);

    // Subtle warm sub-air glide underneath
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(68, now + 0.24);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.025, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.27);
  } catch {
    // Ignore audio error
  }
}

/**
 * Nostalgic "remembering whoosh" played when clicking or inspecting an artifact.
 * Blends a gentle breathy stardust swell with a warm, filtered memory resonance.
 */
export function playArtifactRememberingWhoosh() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Airy memory wind swell
    const src = ctx.createBufferSource();
    src.buffer = getPinkNoiseBuffer(ctx);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.setValueAtTime(1.8, now);
    bandpass.frequency.setValueAtTime(210, now);
    bandpass.frequency.exponentialRampToValueAtTime(760, now + 0.24);
    bandpass.frequency.exponentialRampToValueAtTime(320, now + 0.62);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.075, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    src.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.68);

    // 2. Evocative, ultra-soft celestial harmonic shimmer (warm fifth + ninth)
    const freqs = [293.66, 440.0, 659.25]; // D4, A4, E5
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.992, now + idx * 0.055);
      osc.frequency.linearRampToValueAtTime(f, now + idx * 0.055 + 0.25);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      const start = now + idx * 0.055;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.018, start + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.9);
    });
  } catch {
    // Ignore audio error
  }
}

/**
 * Other soft whoosh sounds used for opening/closing dossiers, CAD models, HUD panels, and surface mode.
 */
export function playWhooshSound(variant: 'in' | 'out' | 'ui' = 'in') {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = getPinkNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';

    const gain = ctx.createGain();
    let duration = 0.34;

    if (variant === 'in') {
      duration = 0.36;
      filter.Q.setValueAtTime(1.5, now);
      filter.frequency.setValueAtTime(190, now);
      filter.frequency.exponentialRampToValueAtTime(840, now + 0.18);
      filter.frequency.exponentialRampToValueAtTime(420, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else if (variant === 'out') {
      duration = 0.32;
      filter.Q.setValueAtTime(1.4, now);
      filter.frequency.setValueAtTime(720, now);
      filter.frequency.exponentialRampToValueAtTime(195, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      duration = 0.18;
      filter.Q.setValueAtTime(1.9, now);
      filter.frequency.setValueAtTime(340, now);
      filter.frequency.exponentialRampToValueAtTime(620, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    }

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + duration + 0.04);
  } catch {
    // Ignore audio error
  }
}

export function playTelemetryBeep(_freq = 320, _duration = 0.25) {
  playWhooshSound('ui');
}

export function playRadarPing() {
  playArtifactRememberingWhoosh();
}

export function playSuccessChime() {
  playWhooshSound('in');
}

export function playFootstepSound(isMars = false) {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    // 1. Soft warm sub thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime((isMars ? 72 : 58) * pitchJitter, now);
    thudOsc.frequency.exponentialRampToValueAtTime(28, now + 0.15);

    thudGain.gain.setValueAtTime(0.042, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.18);

    // 2. Muffled gentle regolith dust brush
    const noise = ctx.createBufferSource();
    noise.buffer = getPinkNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isMars ? 420 : 340, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.025, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);
  } catch {
    // Ignore audio error
  }
}

export function playInspectLockSound() {
  // Intentionally silent: no sound when crosshair points at clickable targets
}

export function playTransitionSound(direction: 'in' | 'out' = 'in') {
  playWhooshSound(direction);
}
