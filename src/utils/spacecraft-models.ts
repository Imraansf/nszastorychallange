import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface SpacecraftModelAsset {
  artifactId: string;
  /** URL-encoded path under public/models/, or null when awaiting export / unavailable */
  modelPath: string | null;
  /** Human-readable asset label */
  assetLabel: string;
  /** Note displayed in telemetry HUD when falling back to wireframe + NASA archival photo */
  fallbackReason: string;
  /** Optional source file awaiting .glb export (never loaded directly in Three.js) */
  pendingExportSource?: string;
}

export const DRACO_DECODER_CDN_URL =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export const SPACECRAFT_MODEL_REGISTRY: Record<string, SpacecraftModelAsset> = {
  // Moon Artifacts
  'apollo-11-eagle-easep': {
    artifactId: 'apollo-11-eagle-easep',
    modelPath: '/models/Apollo%20Lunar%20Module.glb',
    assetLabel: 'Apollo Lunar Module (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & Apollo 11 Archival Imagery active.',
  },
  'apollo-12-intrepid-alsep': {
    artifactId: 'apollo-12-intrepid-alsep',
    modelPath: '/models/Apollo%20Lunar%20Module.glb',
    assetLabel: 'Apollo Lunar Module (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & Apollo 12 Archival Imagery active.',
  },
  'apollo-15-falcon-lrv-alsep': {
    artifactId: 'apollo-15-falcon-lrv-alsep',
    modelPath: '/models/Apollo%20Lunar%20Module.glb',
    assetLabel: 'Apollo Lunar Module (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & Apollo 15 Archival Imagery active.',
  },
  'surveyor-3': {
    artifactId: 'surveyor-3',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },

  // Mars Artifacts
  'viking-1-lander': {
    artifactId: 'viking-1-lander',
    modelPath: '/models/Viking%20Lander.glb',
    assetLabel: 'Viking Lander (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & Viking 1 Archival Imagery active.',
  },
  'insight-lander': {
    artifactId: 'insight-lander',
    modelPath: '/models/InSight%20Cruise%20Lander%20(arm%20deployed).glb',
    assetLabel: 'InSight Cruise Lander (arm deployed) (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & InSight Archival Imagery active.',
  },
  'ingenuity-mars-helicopter': {
    artifactId: 'ingenuity-mars-helicopter',
    modelPath: '/models/Ingenuity%20Mars%20Helicopter.glb',
    assetLabel: 'Ingenuity Mars Helicopter (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & Ingenuity Archival Imagery active.',
  },
  'spirit-and-opportunity': {
    artifactId: 'spirit-and-opportunity',
    modelPath: '/models/Mars%20Exploration%20Rover%20-%20Opportunity%20(MER-B).glb',
    assetLabel: 'Mars Exploration Rover - Opportunity (MER-B) (.glb)',
    fallbackReason:
      'NASA Horizon Telemetry Wireframe & MER Spirit/Opportunity Archival Imagery active.',
  },
  'mars-pathfinder-sojourner': {
    artifactId: 'mars-pathfinder-sojourner',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
  'phoenix-mars-lander': {
    artifactId: 'phoenix-mars-lander',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },

  // Deep Space Artifacts
  dawn: {
    artifactId: 'dawn',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
  'near-shoemaker': {
    artifactId: 'near-shoemaker',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
  'pioneer-10': {
    artifactId: 'pioneer-10',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
  'pioneer-11': {
    artifactId: 'pioneer-11',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
  kepler: {
    artifactId: 'kepler',
    modelPath: null,
    assetLabel: 'Telemetry Hologram & Archival Preview',
    fallbackReason:
      'No local .glb mapped yet — displaying Horizon telemetry hologram & official NASA archival photo.',
  },
};

export function getSpacecraftModelAsset(artifactId: string): SpacecraftModelAsset {
  return (
    SPACECRAFT_MODEL_REGISTRY[artifactId] || {
      artifactId,
      modelPath: null,
      assetLabel: 'Telemetry Hologram & Archival Preview',
      fallbackReason:
        'No local .glb mapped — displaying Horizon telemetry hologram & archival photo.',
    }
  );
}

/**
 * Fetches and validates a .glb / .gltf binary before passing to GLTFLoader.parse(),
 * preventing Vite's HTML SPA fallback from causing unhandled JSON syntax errors
 * when a model file is missing on disk.
 */
export async function loadValidatedGltf(
  url: string,
  loader: GLTFLoader,
  signal?: AbortSignal
): Promise<GLTF> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Model fetch returned HTTP ${response.status} for ${url}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    throw new Error(`Model path returned HTML fallback instead of GLB/GLTF: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 12) {
    throw new Error(`Model buffer too small (${buffer.byteLength} bytes) for ${url}`);
  }

  // Verify GLB magic header ('glTF' = 0x46546C67) or JSON '{' start for .gltf
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  const firstByte = view.getUint8(0);
  const isGlb = magic === 0x46546c67;
  const isGltfJson = firstByte === 0x7b; // '{'

  if (!isGlb && !isGltfJson) {
    throw new Error(`Invalid GLB/GLTF signature at ${url}`);
  }

  const resourceBasePath = url.substring(0, url.lastIndexOf('/') + 1);

  return new Promise<GLTF>((resolve, reject) => {
    loader.parse(
      buffer,
      resourceBasePath,
      (gltf) => resolve(gltf),
      (err) => reject(err)
    );
  });
}

/**
 * Computes Box3 & bounding sphere of a loaded GLTF scene, centers pivot at (0,0,0),
 * and scales uniformly so the object fits inside a sphere of targetRadius (default 2.5 units).
 */
export function normalizeModelToBoundingSphere(
  object: THREE.Object3D,
  targetRadius = 2.5
): { scale: number; scaledMinY: number } {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());

  const radius = sphere.radius > 0.0001 ? sphere.radius : 1.0;
  const scale = targetRadius / radius;

  object.scale.multiplyScalar(scale);
  object.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale
  );
  object.updateMatrixWorld(true);

  const postBox = new THREE.Box3().setFromObject(object);
  return { scale, scaledMinY: postBox.min.y };
}
