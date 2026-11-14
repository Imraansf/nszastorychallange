import React, { Component, ErrorInfo, ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Artifact } from '../types/space';
import {
  DRACO_DECODER_CDN_URL,
  getSpacecraftModelAsset,
  loadValidatedGltf,
  normalizeModelToBoundingSphere,
} from '../utils/spacecraft-models';
import {
  RotateCw,
  Compass,
  Camera,
  Eye,
  EyeOff,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { playTelemetryBeep, playSuccessChime } from '../utils/audio';

export type ModelViewportStatus = 'loading' | 'glb_loaded' | 'hologram_fallback';

export interface Artifact3DViewportProps {
  artifact: Artifact;
  onStatusChange?: (status: ModelViewportStatus, assetLabel: string) => void;
}

// ============================================================================
// React Error Boundary protecting WebGL/GLB rendering
// ============================================================================
interface ErrorBoundaryProps {
  artifact: Artifact;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ViewportErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || '3D viewport failed to initialize.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D Artifact Viewport caught boundary error:', error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.artifact.id !== this.props.artifact.id && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      const { artifact } = this.props;
      const isMars = artifact.body === 'mars';
      return (
        <div
          className={`w-full h-full flex flex-col items-center justify-center p-6 text-center ${
            isMars ? 'bg-[#1C140F] text-[#F5E6D3]' : 'bg-[#16171B] text-[#F4F4F5]'
          }`}
        >
          {artifact.imageUrl && (
            <div className="w-full max-w-md rounded-2xl overflow-hidden border border-white/15 mb-4">
              <img
                src={artifact.imageUrl}
                alt={artifact.imageCaption || artifact.name}
                className="w-full h-48 object-cover"
              />
            </div>
          )}
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest mb-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Telemetry Fallback Active</span>
          </div>
          <h4 className="text-base font-bold">{artifact.name}</h4>
          <p className="text-xs opacity-75 max-w-md mt-1">{this.state.errorMessage}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// Tactile Dark-Glassmorphic Loading Telemetry Indicator (Suspense / Loading)
// ============================================================================
const TelemetryLoadingIndicator: React.FC<{
  artifact: Artifact;
  message?: string;
}> = ({ artifact, message = 'DECODING DRACO / PBR TELEMETRY STREAM...' }) => {
  const isMars = artifact.body === 'mars';
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 backdrop-blur-md ${
        isMars ? 'bg-[#1C140F]/80 text-[#F5E6D3]' : 'bg-[#0D1119]/80 text-[#F4F4F5]'
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border p-5 shadow-[0_18px_48px_rgba(0,0,0,0.65)] ${
          isMars
            ? 'bg-[rgba(28,20,15,0.88)] border-[#D97706]/60'
            : 'bg-[rgba(24,28,38,0.88)] border-[#BAE6FD]/60'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest mb-3">
          <span className={isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'}>
            NASA HORIZON 3D PIPELINE
          </span>
          <Radio
            className={`w-3.5 h-3.5 ${isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]'}`}
          />
        </div>
        <div className="text-sm font-bold truncate">{artifact.name}</div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full w-2/3 rounded-full animate-pulse ${
              isMars ? 'bg-[#D97706]' : 'bg-[#BAE6FD]'
            }`}
          />
        </div>
        <p className="mt-2.5 text-[11px] font-mono opacity-80">{message}</p>
      </div>
    </div>
  );
};

// ============================================================================
// Disposal Helper
// ============================================================================
function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        std.metalnessMap?.dispose();
        std.emissiveMap?.dispose();
        std.aoMap?.dispose();
        std.alphaMap?.dispose();
        m.dispose();
      });
    }
  });
}

// ============================================================================
// High-Contrast NASA Horizon Telemetry Wireframe Hologram Builder (Fallback)
// ============================================================================
function buildTelemetryHologramGroup(artifact: Artifact): THREE.Group {
  const group = new THREE.Group();
  const isMars = artifact.body === 'mars';
  const holoHex = isMars ? 0xf59e0b : 0x38bdf8;
  const accentHex = isMars ? 0xf5e6d3 : 0xbae6fd;

  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x06090f,
    emissive: holoHex,
    emissiveIntensity: 0.95,
    wireframe: true,
    roughness: 0.35,
    metalness: 0.5,
  });

  const accentWireMat = new THREE.MeshStandardMaterial({
    color: 0x06090f,
    emissive: accentHex,
    emissiveIntensity: 1.05,
    wireframe: true,
    roughness: 0.3,
    metalness: 0.5,
  });

  const id = artifact.id;
  const category = artifact.category;

  if (id.includes('ingenuity')) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), wireMat);
    body.position.y = 0.0;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 10), accentWireMat);
    mast.position.y = 0.48;
    const rotorA = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.025, 0.14), accentWireMat);
    rotorA.position.y = 0.82;
    rotorA.rotation.y = 0.35;
    const rotorB = rotorA.clone();
    rotorB.position.y = 0.68;
    rotorB.rotation.y = 1.9;
    const solar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.5), wireMat);
    solar.position.y = 0.95;
    group.add(body, mast, rotorA, rotorB, solar);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.85, 6), wireMat);
      leg.position.set(Math.cos(a) * 0.4, -0.35, Math.sin(a) * 0.4);
      leg.rotation.z = -Math.cos(a) * 0.65;
      leg.rotation.x = Math.sin(a) * 0.65;
      group.add(leg);
    }
  } else if (category === 'rover') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.1), wireMat);
    body.position.y = 0.0;
    const solar = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.05, 1.6), accentWireMat);
    solar.position.y = 0.35;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 10), accentWireMat);
    mast.position.set(0.4, 0.95, 0.3);
    const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.22), accentWireMat);
    camHead.position.set(0.4, 1.55, 0.3);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      wireMat
    );
    dish.position.set(-0.5, 0.62, -0.3);
    dish.rotation.x = -Math.PI / 4;
    group.add(body, solar, mast, camHead, dish);

    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16);
    [
      [-0.85, -0.62, 0.7],
      [0, -0.62, 0.74],
      [0.85, -0.62, 0.7],
      [-0.85, -0.62, -0.7],
      [0, -0.62, -0.74],
      [0.85, -0.62, -0.7],
    ].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, accentWireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    });
  } else if (category === 'apollo_crewed') {
    const oct = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.95, 8), wireMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 12, 24), accentWireMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.52;
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 18, 1, true), accentWireMat);
    bell.position.y = -0.65;
    group.add(oct, ring, bell);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const fx = Math.cos(a) * 2.1;
      const fz = Math.sin(a) * 2.1;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 12), accentWireMat);
      pad.position.set(fx, -1.05, fz);
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), wireMat);
      strut.position.set(fx * 0.65, -0.45, fz * 0.65);
      strut.lookAt(fx, -1.05, fz);
      strut.rotateX(Math.PI / 2);
      group.add(pad, strut);
    }
  } else if (
    category === 'interstellar_probe' ||
    category === 'space_telescope' ||
    category === 'planetary_orbiter'
  ) {
    const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.75, 10), wireMat);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.36),
      accentWireMat
    );
    dish.rotation.x = -Math.PI / 2;
    dish.position.y = 0.65;
    group.add(bus, dish);
    if (category === 'planetary_orbiter' || category === 'space_telescope') {
      [-2.1, 2.1].forEach((xOff) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.04, 0.9), accentWireMat);
        wing.position.set(xOff, 0, 0);
        group.add(wing);
      });
    } else {
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), wireMat);
      boom.rotation.z = Math.PI / 2.2;
      boom.position.set(1.4, -0.1, 0);
      group.add(boom);
    }
  } else {
    // Uncrewed Lander (Surveyor 3, Viking, Phoenix, InSight)
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.7, 6), wireMat);
    [-1.75, 1.75].forEach((xOff) => {
      const solar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 10), accentWireMat);
      solar.position.set(xOff, 0.15, 0);
      group.add(solar);
    });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), accentWireMat);
    mast.position.set(-0.3, 0.85, -0.2);
    group.add(hex, mast);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 1.55;
      const lz = Math.sin(a) * 1.55;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.05, 10), accentWireMat);
      pad.position.set(lx, -0.95, lz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8), wireMat);
      leg.position.set(lx * 0.62, -0.42, lz * 0.62);
      leg.lookAt(lx, -0.95, lz);
      leg.rotateX(Math.PI / 2);
      group.add(pad, leg);
    }
  }

  return group;
}

// ============================================================================
// Inner Three.js Canvas Component (Rendered inside ErrorBoundary + Suspense)
// ============================================================================
const SpacecraftCanvas3D: React.FC<{
  artifact: Artifact;
  isAutoRotating: boolean;
  onToggleAutoRotate: () => void;
  onStatusChange?: (status: ModelViewportStatus, assetLabel: string) => void;
}> = ({ artifact, isAutoRotating, onToggleAutoRotate, onStatusChange }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isAutoRotatingRef = useRef(isAutoRotating);
  isAutoRotatingRef.current = isAutoRotating;

  const asset = getSpacecraftModelAsset(artifact.id);
  const isMars = artifact.body === 'mars';

  const [viewportStatus, setViewportStatus] = useState<ModelViewportStatus>(
    asset.modelPath ? 'loading' : 'hologram_fallback'
  );
  const [showPhotoOverlay, setShowPhotoOverlay] = useState<boolean>(!asset.modelPath);

  useEffect(() => {
    setViewportStatus(asset.modelPath ? 'loading' : 'hologram_fallback');
    setShowPhotoOverlay(!asset.modelPath);
  }, [artifact.id, asset.modelPath]);

  useEffect(() => {
    onStatusChange?.(viewportStatus, asset.assetLabel);
  }, [viewportStatus, asset.assetLabel, onStatusChange]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;
    let rafId = 0;
    const abortController = new AbortController();

    const w0 = container.clientWidth || 640;
    const h0 = container.clientHeight || 480;

    // 1. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w0, h0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. SCENE & STUDIO/ORBITAL ENVIRONMENT
    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3. CAMERA & ORBIT CONTROLS
    const camera = new THREE.PerspectiveCamera(42, w0 / h0, 0.1, 100);
    camera.position.set(4.1, 2.1, 4.4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 11.5;
    controls.target.set(0, 0, 0);
    controls.autoRotate = isAutoRotatingRef.current;
    controls.autoRotateSpeed = 1.1;
    controls.update();
    controlsRef.current = controls;

    let isUserInteracting = false;
    const onControlStart = () => {
      isUserInteracting = true;
    };
    const onControlEnd = () => {
      isUserInteracting = false;
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);

    // 4. BALANCED STUDIO / ORBITAL LIGHTING (Preserves Gold Foil, Copper, Solar Arrays & WebP PBR Textures)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    keyLight.position.set(6, 8, 6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(isMars ? 0xd97706 : 0xbae6fd, 1.45);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 0.85);
    fillLight.position.set(-4, -5, 4);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(
      0xf8fafc,
      isMars ? 0x5c2d18 : 0x1e293b,
      0.8
    );
    scene.add(hemiLight);

    // 5. TELEMETRY STAGE RING
    const stageGroup = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(2.65, 2.72, 72);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isMars ? 0xd97706 : 0xbae6fd,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -2.45;
    stageGroup.add(ringMesh);

    const innerRingGeo = new THREE.RingGeometry(1.75, 1.78, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: isMars ? 0xf5e6d3 : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    innerRingMesh.position.y = -2.45;
    stageGroup.add(innerRingMesh);
    scene.add(stageGroup);

    // 6. SPACECRAFT MOUNT ROOT
    const craftRoot = new THREE.Group();
    scene.add(craftRoot);

    // Prepare hologram wireframe group (normalized to 2.5-unit sphere)
    const hologramGroup = buildTelemetryHologramGroup(artifact);
    normalizeModelToBoundingSphere(hologramGroup, 2.35);

    const showHologramFallback = () => {
      if (isDisposed) return;
      craftRoot.clear();
      craftRoot.add(hologramGroup);
      ringMesh.position.y = -2.1;
      innerRingMesh.position.y = -2.1;
      setViewportStatus('hologram_fallback');
      setShowPhotoOverlay(true);
    };

    let loadedGltfScene: THREE.Object3D | null = null;

    if (asset.modelPath) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_CDN_URL);
      dracoLoader.preload();

      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      loadValidatedGltf(asset.modelPath, gltfLoader, abortController.signal)
        .then((gltf) => {
          if (isDisposed) {
            disposeObject3D(gltf.scene);
            dracoLoader.dispose();
            return;
          }

          const gltfScene = gltf.scene;
          const { scaledMinY } = normalizeModelToBoundingSphere(gltfScene, 2.5);

          // Preserve PBR materials, metallic gold foil, copper, solar panels, and WebP textures
          gltfScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = !isSoftwareGl;
              mesh.receiveShadow = true;
              const mats = Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material];
              mats.forEach((m) => {
                if (m instanceof THREE.MeshStandardMaterial) {
                  m.envMapIntensity = 1.15;
                  m.needsUpdate = true;
                }
              });
            }
          });

          craftRoot.clear();
          craftRoot.add(gltfScene);
          loadedGltfScene = gltfScene;

          const stageY = Math.min(-1.35, scaledMinY - 0.16);
          ringMesh.position.y = stageY;
          innerRingMesh.position.y = stageY;

          setViewportStatus('glb_loaded');
          setShowPhotoOverlay(false);
          playSuccessChime();
          dracoLoader.dispose();
        })
        .catch(() => {
          dracoLoader.dispose();
          if (!isDisposed) {
            showHologramFallback();
          }
        });
    } else {
      showHologramFallback();
    }

    // 7. RESIZE OBSERVER
    const handleResize = () => {
      if (isDisposed || !container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // 8. RENDER LOOP
    const afterDraw = (fn: FrameRequestCallback) => {
      if (!isSoftwareGl) {
        rafId = requestAnimationFrame(fn);
        return;
      }
      const gl2 = gl as WebGL2RenderingContext;
      if (typeof gl2.fenceSync === 'function') {
        const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          if (!sync) {
            rafId = requestAnimationFrame(fn);
            return;
          }
          const status = gl2.clientWaitSync(sync, 0, 0);
          if (status === gl2.TIMEOUT_EXPIRED) {
            setTimeout(poll, 4);
          } else {
            gl2.deleteSync(sync);
            rafId = requestAnimationFrame(fn);
          }
        };
        setTimeout(poll, 4);
      } else {
        rafId = requestAnimationFrame(fn);
      }
    };

    const tick = () => {
      if (isDisposed) return;
      controls.autoRotate = isAutoRotatingRef.current && !isUserInteracting;
      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      abortController.abort();
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.dispose();
      disposeObject3D(hologramGroup);
      if (loadedGltfScene) disposeObject3D(loadedGltfScene);
      ringGeo.dispose();
      ringMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      envRT.dispose();
      scene.clear();
      renderer.dispose();
    };
  }, [artifact, asset.modelPath, isMars]);

  const handleResetCamera = () => {
    playTelemetryBeep(520);
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.1, 2.1, 4.4);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div
      className={`relative w-full h-full ${
        isMars ? 'bg-[#1C140F]' : 'bg-[#16171B]'
      }`}
    >
      {/* Dedicated Three.js Canvas Mount (no React children) */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      />

      {/* Loading Indicator while GLB is streaming / decoding */}
      {viewportStatus === 'loading' && (
        <TelemetryLoadingIndicator artifact={artifact} />
      )}

      {/* Top-Left Interactive Controls Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            playTelemetryBeep(550);
            onToggleAutoRotate();
          }}
          className={`px-3 py-1.5 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors ${
            isMars
              ? isAutoRotating
                ? 'bg-[#F5E6D3] border-[#F5E6D3] text-[#1C140F]'
                : 'bg-[rgba(28,20,15,0.92)] border-[#57534E] text-[#F5E6D3] hover:border-[#D97706]'
              : isAutoRotating
              ? 'bg-[#BAE6FD] border-[#BAE6FD] text-[#1C1D21]'
              : 'bg-[rgba(28,29,33,0.94)] border-[#BAE6FD] text-[#D4D4D8] hover:text-[#FFFFFF]'
          }`}
          title={isAutoRotating ? 'Pause Auto-Rotation' : 'Resume Auto-Rotation'}
        >
          <RotateCw className={`w-3.5 h-3.5 ${isAutoRotating ? 'animate-spin' : ''}`} />
          <span>{isAutoRotating ? 'Auto-Orbit On' : 'Auto-Orbit Off'}</span>
        </button>

        <button
          onClick={handleResetCamera}
          className={`px-3 py-1.5 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors ${
            isMars
              ? 'bg-[rgba(28,20,15,0.92)] hover:bg-[#291D16] border-[#57534E] hover:border-[#D97706] text-[#F5E6D3]'
              : 'bg-[rgba(28,29,33,0.94)] hover:bg-[#34363C] border-[#BAE6FD] text-[#F4F4F5]'
          }`}
          title="Reset Camera View"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Reset Camera</span>
        </button>

        {artifact.imageUrl && (
          <button
            onClick={() => {
              playTelemetryBeep(480);
              setShowPhotoOverlay((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors ${
              isMars
                ? 'bg-[rgba(28,20,15,0.92)] hover:bg-[#291D16] border-[#57534E] hover:border-[#D97706] text-[#F5E6D3]'
                : 'bg-[rgba(28,29,33,0.94)] hover:bg-[#34363C] border-[#BAE6FD] text-[#F4F4F5]'
            }`}
          >
            {showPhotoOverlay ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>{showPhotoOverlay ? 'Hide Archival Photo' : 'NASA Photo'}</span>
          </button>
        )}
      </div>

      {/* High-Contrast NASA Horizon Telemetry Hologram & Archival Photo Card */}
      {viewportStatus === 'hologram_fallback' && showPhotoOverlay && artifact.imageUrl && (
        <div
          className={`absolute top-14 right-4 z-10 w-64 sm:w-72 rounded-2xl overflow-hidden border shadow-[0_14px_36px_rgba(0,0,0,0.65)] ${
            isMars
              ? 'bg-[rgba(28,20,15,0.94)] border-[#D97706]/80 text-[#F5E6D3]'
              : 'bg-[rgba(28,29,33,0.94)] border-[#BAE6FD] text-[#F4F4F5]'
          }`}
        >
          <div
            className={`px-3 py-2 border-b flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider ${
              isMars
                ? 'bg-[#291D16] border-[#44403C] text-[#D97706]'
                : 'bg-[#27282D] border-[#3F3F46] text-[#BAE6FD]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Camera className="w-3 h-3" />
              NASA Archival Telemetry
            </span>
            <span>{artifact.year}</span>
          </div>
          <div className="relative h-32 bg-black">
            <img
              src={artifact.imageUrl}
              alt={artifact.imageCaption || artifact.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 space-y-1.5">
            <p className="text-[11px] leading-snug font-medium">
              {artifact.imageCaption || artifact.name}
            </p>
            <p
              className={`text-[10px] font-mono leading-snug ${
                isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]'
              }`}
            >
              {asset.fallbackReason}
            </p>
          </div>
        </div>
      )}

      {/* Optional NASA Photo Card even when GLB is loaded and user toggled it open */}
      {viewportStatus === 'glb_loaded' && showPhotoOverlay && artifact.imageUrl && (
        <div
          className={`absolute top-14 right-4 z-10 w-64 rounded-2xl overflow-hidden border shadow-[0_14px_36px_rgba(0,0,0,0.65)] ${
            isMars
              ? 'bg-[rgba(28,20,15,0.94)] border-[#57534E] text-[#F5E6D3]'
              : 'bg-[rgba(28,29,33,0.94)] border-[#BAE6FD] text-[#F4F4F5]'
          }`}
        >
          <img
            src={artifact.imageUrl}
            alt={artifact.imageCaption || artifact.name}
            className="w-full h-32 object-cover"
          />
          <div className="p-2.5 text-[11px] leading-snug">
            {artifact.imageCaption || artifact.name}
          </div>
        </div>
      )}

      {/* Bottom Orbit Controls Help Hint */}
      <div
        className={`absolute bottom-4 left-4 z-10 pointer-events-none text-[10px] font-mono font-medium border rounded-full px-3 py-1 ${
          isMars
            ? 'text-[#F5E6D3] bg-[rgba(28,20,15,0.90)] border-[#57534E]'
            : 'text-[#F4F4F5] bg-[rgba(28,29,33,0.94)] border-[#BAE6FD]'
        }`}
      >
        <span className={isMars ? 'text-[#D97706] font-bold' : 'text-[#BAE6FD] font-bold'}>
          Drag
        </span>{' '}
        to orbit •{' '}
        <span className={isMars ? 'text-[#D97706] font-bold' : 'text-[#BAE6FD] font-bold'}>
          Scroll
        </span>{' '}
        to zoom •{' '}
        <span className={isMars ? 'text-[#D97706] font-bold' : 'text-[#BAE6FD] font-bold'}>
          Right-Drag
        </span>{' '}
        to pan
      </div>
    </div>
  );
};

// ============================================================================
// Public Wrapped Export with ErrorBoundary & Suspense
// ============================================================================
export const Artifact3DViewport: React.FC<Artifact3DViewportProps> = ({
  artifact,
  onStatusChange,
}) => {
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  return (
    <ViewportErrorBoundary artifact={artifact}>
      <Suspense fallback={<TelemetryLoadingIndicator artifact={artifact} />}>
        <SpacecraftCanvas3D
          artifact={artifact}
          isAutoRotating={isAutoRotating}
          onToggleAutoRotate={() => setIsAutoRotating((prev) => !prev)}
          onStatusChange={onStatusChange}
        />
      </Suspense>
    </ViewportErrorBoundary>
  );
};
