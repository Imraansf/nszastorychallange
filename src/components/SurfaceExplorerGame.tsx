import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Artifact } from '../types/space';
import { ArrowLeft, X } from 'lucide-react';
import { playTelemetryBeep, playSuccessChime } from '../utils/audio';
import {
  DRACO_DECODER_CDN_URL,
  getSpacecraftModelAsset,
  loadValidatedGltf,
} from '../utils/spacecraft-models';
import {
  CraftBounds,
  MeshPartStats,
  getSpacecraftInspectionConfig,
} from '../utils/surface-inspection-data';

export interface SurfaceExplorerGameProps {
  artifact: Artifact;
  onClose: () => void;
}

interface CompanionSurfaceItem {
  id: string;
  name: string;
  text: string;
  status: string;
  center: THREE.Vector3;
  radius: number;
}

interface InspectedPanelData {
  nssdcLabel: string | null;
  name: string;
  text: string;
  highlightNote: string;
}

interface ActiveTarget {
  kind: 'part' | 'item';
  id: string;
  name: string;
  nssdcLabel: string | null;
  text: string;
  highlightNote: string;
}

// Deterministic PRNG seeded by artifact id so each landing site has repeatable terrain
function createSeededRandom(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CraterDef {
  x: number;
  z: number;
  r: number;
}

function buildCraters(seedStr: string): CraterDef[] {
  const rand = createSeededRandom(seedStr + '-craters-v2');
  const craters: CraterDef[] = [];
  for (let i = 0; i < 170; i++) {
    const a = rand() * 6.283185;
    const d = 30 + Math.pow(rand(), 0.7) * 480;
    craters.push({
      x: Math.cos(a) * d,
      z: Math.sin(a) * d,
      r: 1.5 + Math.pow(rand(), 3) * 38,
    });
  }
  craters.push(
    { x: -60, z: -40, r: 14 },
    { x: 75, z: 30, r: 9 },
    { x: 30, z: -95, r: 22 }
  );
  return craters;
}

function createHeightSampler(craters: CraterDef[], isMars: boolean) {
  const undulationScale = isMars ? 1.15 : 1.0;
  return (x: number, z: number): number => {
    let h =
      (Math.sin(x * 0.021) * Math.cos(z * 0.017) * 0.7 +
        Math.sin(x * 0.07 + z * 0.05) * 0.12 +
        Math.sin(x * 0.19) * Math.sin(z * 0.23) * 0.04) *
      undulationScale;

    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const distSq = dx * dx + dz * dz;
      const maxDist = c.r * 1.6;
      if (distSq < maxDist * maxDist) {
        const r = Math.sqrt(distSq) / c.r;
        h +=
          r < 1
            ? -c.r * 0.2 * (1 - r * r) + c.r * 0.03 * r * r * r
            : c.r * 0.03 * Math.exp(-(r - 1) * 5);
      }
    }

    const f = Math.min(1, Math.max(0, (Math.hypot(x, z) - 14) / 30));
    return h * f;
  };
}

function createRegolithTexture(isMars: boolean, anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isMars ? '#b36b47' : '#b2afa7';
    ctx.fillRect(0, 0, size, size);

    const rand = createSeededRandom(isMars ? 'mars-regolith-v2' : 'moon-regolith-v2');
    for (let i = 0; i < 26000; i++) {
      const v = (88 + rand() * 155) | 0;
      const alpha = 0.25 + rand() * 0.42;
      if (isMars) {
        const r = Math.min(255, Math.round(v * 1.08));
        const g = Math.round(v * 0.56);
        const b = Math.round(v * 0.34);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      } else {
        ctx.fillStyle = `rgba(${v},${v - 2},${v - 6},${alpha})`;
      }
      const s = rand() < 0.97 ? 1 : 2 + rand() * 2;
      ctx.fillRect(rand() * size, rand() * size, s, s);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(140, 140);
  tex.anisotropy = Math.min(8, anisotropy);
  return tex;
}

function createRadialDiscSprite(
  innerColor: string,
  outerGlowColor: string,
  scale: number,
  position: THREE.Vector3
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; material: THREE.SpriteMaterial } {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.55, innerColor);
    grad.addColorStop(0.6, outerGlowColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthWrite: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  sprite.position.copy(position);
  return { sprite, texture, material };
}

function buildSpaceEnvironment(
  renderer: THREE.WebGLRenderer,
  sunDir: THREE.Vector3,
  isMars: boolean
): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(isMars ? 0x3b1c0e : 0x000000);

  const sunSphereGeo = new THREE.SphereGeometry(4, 16, 12);
  const sunSphereMat = new THREE.MeshBasicMaterial({
    color: isMars ? 0xffe4c4 : 0xfff8ea,
  });
  const sunSphere = new THREE.Mesh(sunSphereGeo, sunSphereMat);
  sunSphere.position.copy(sunDir).multiplyScalar(42);
  envScene.add(sunSphere);

  const groundBounceGeo = new THREE.CircleGeometry(60, 24);
  groundBounceGeo.rotateX(-Math.PI / 2);
  const groundBounceMat = new THREE.MeshBasicMaterial({
    color: isMars ? 0x6b321a : 0x262420,
    side: THREE.DoubleSide,
  });
  const groundBounce = new THREE.Mesh(groundBounceGeo, groundBounceMat);
  groundBounce.position.y = -10;
  envScene.add(groundBounce);

  let earthSphereGeo: THREE.SphereGeometry | null = null;
  let earthSphereMat: THREE.MeshBasicMaterial | null = null;
  if (!isMars) {
    earthSphereGeo = new THREE.SphereGeometry(3.2, 16, 12);
    earthSphereMat = new THREE.MeshBasicMaterial({ color: 0x4f86c8 });
    const earthSphere = new THREE.Mesh(earthSphereGeo, earthSphereMat);
    earthSphere.position.set(-1, 2.3, 0).normalize().multiplyScalar(40);
    envScene.add(earthSphere);
  } else {
    const skyGlowGeo = new THREE.SphereGeometry(55, 20, 12);
    const skyGlowMat = new THREE.MeshBasicMaterial({
      color: 0x8f4e2e,
      side: THREE.BackSide,
    });
    const skyGlow = new THREE.Mesh(skyGlowGeo, skyGlowMat);
    envScene.add(skyGlow);
  }

  const rt = pmrem.fromScene(envScene, 0.04);

  sunSphereGeo.dispose();
  sunSphereMat.dispose();
  groundBounceGeo.dispose();
  groundBounceMat.dispose();
  earthSphereGeo?.dispose();
  earthSphereMat?.dispose();
  envScene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose?.();
    if (mesh.material && !Array.isArray(mesh.material)) {
      mesh.material.dispose();
    }
  });
  pmrem.dispose();

  return rt;
}

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const hlMat = mesh.userData?.hlMat as THREE.Material | THREE.Material[] | undefined;
    if (hlMat) {
      (Array.isArray(hlMat) ? hlMat : [hlMat]).forEach((m) => m.dispose());
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.bumpMap?.dispose();
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

function isGoldMaterial(mat: THREE.Material | THREE.Material[] | undefined): boolean {
  const m = Array.isArray(mat) ? mat[0] : mat;
  const col = (m as THREE.MeshStandardMaterial | undefined)?.color;
  return !!col && col.r > 0.55 && col.g > 0.35 && col.b < 0.2;
}

function buildProceduralSpacecraft(
  artifact: Artifact,
  sampleH: (x: number, z: number) => number,
  centerGroundY: number
): {
  craftGroup: THREE.Group;
  companionGroup: THREE.Group;
  companionItems: CompanionSurfaceItem[];
  targetScale: number;
  craftRadius: number;
} {
  const craftGroup = new THREE.Group();
  const companionGroup = new THREE.Group();
  const companionItems: CompanionSurfaceItem[] = [];

  const registerCompanion = (
    id: string,
    name: string,
    x: number,
    z: number,
    radius: number,
    text: string,
    status: string,
    group: THREE.Group
  ) => {
    const groundY = sampleH(x, z);
    group.position.set(x, groundY - centerGroundY, z);
    companionGroup.add(group);
    companionItems.push({
      id,
      name,
      text,
      status,
      center: new THREE.Vector3(x, groundY + 0.5, z),
      radius,
    });
  };

  const goldKaptonMat = new THREE.MeshStandardMaterial({
    color: 0xc9a24b,
    metalness: 0.9,
    roughness: 0.35,
  });
  const silverAluminumMat = new THREE.MeshStandardMaterial({
    color: 0xd0d4da,
    metalness: 0.78,
    roughness: 0.38,
  });
  const darkSolarCellMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.22,
  });
  const blackCompositeMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1c,
    metalness: 0.25,
    roughness: 0.65,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.28,
  });
  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xe9e9e6,
    metalness: 0.05,
    roughness: 0.78,
  });
  const lensCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0x0284c7,
    emissiveIntensity: 0.3,
  });
  const bootDustMat = new THREE.MeshStandardMaterial({
    color: 0x5a5a58,
    metalness: 0,
    roughness: 0.9,
  });
  const medalMat = new THREE.MeshStandardMaterial({
    color: 0xb9ab86,
    metalness: 0.2,
    roughness: 0.75,
  });

  const id = artifact.id;
  let targetScale = 3.4;
  let craftRadius = 3.2;

  if (artifact.category === 'apollo_crewed') {
    targetScale = 7.0;
    craftRadius = 4.4;

    // Octagonal Descent Stage
    const octGeo = new THREE.CylinderGeometry(1.75, 1.75, 1.35, 8);
    const octMesh = new THREE.Mesh(octGeo, goldKaptonMat);
    octMesh.position.y = 1.65;
    craftGroup.add(octMesh);

    const deckGeo = new THREE.CylinderGeometry(1.55, 1.72, 0.18, 8);
    const deck = new THREE.Mesh(deckGeo, silverAluminumMat);
    deck.position.y = 2.4;
    craftGroup.add(deck);

    const ringGeo = new THREE.TorusGeometry(0.92, 0.08, 12, 32);
    const ring = new THREE.Mesh(ringGeo, silverAluminumMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.54;
    craftGroup.add(ring);

    const engineGeo = new THREE.ConeGeometry(0.82, 1.15, 24, 1, true);
    const engine = new THREE.Mesh(engineGeo, blackCompositeMat);
    engine.position.y = 0.85;
    craftGroup.add(engine);

    const legAngles = [
      Math.PI / 4,
      (3 * Math.PI) / 4,
      (5 * Math.PI) / 4,
      (7 * Math.PI) / 4,
    ];
    legAngles.forEach((angle, idx) => {
      const rFoot = 2.95;
      const fx = Math.cos(angle) * rFoot;
      const fz = Math.sin(angle) * rFoot;
      const tx = Math.cos(angle) * 1.45;
      const tz = Math.sin(angle) * 1.45;

      const pTop = new THREE.Vector3(tx, 2.05, tz);
      const pBot = new THREE.Vector3(fx, 0.14, fz);
      const dir = new THREE.Vector3().subVectors(pBot, pTop);
      const len = dir.length();
      const strutGeo = new THREE.CylinderGeometry(0.065, 0.065, len, 10);
      const strut = new THREE.Mesh(strutGeo, goldKaptonMat);
      strut.position.copy(pTop).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      craftGroup.add(strut);

      const pMid = new THREE.Vector3(tx * 1.05, 1.05, tz * 1.05);
      const braceDir = new THREE.Vector3().subVectors(pBot, pMid);
      const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, braceDir.length(), 8);
      const brace = new THREE.Mesh(braceGeo, silverAluminumMat);
      brace.position.copy(pMid).addScaledVector(braceDir, 0.5);
      brace.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        braceDir.clone().normalize()
      );
      craftGroup.add(brace);

      const padGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.09, 18);
      const pad = new THREE.Mesh(padGeo, goldKaptonMat);
      pad.position.set(fx, 0.045, fz);
      craftGroup.add(pad);

      if (idx === 0) {
        const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.85, 8);
        const r1 = new THREE.Mesh(railGeo, silverAluminumMat);
        r1.position.set(fx * 0.72 - 0.11, 1.25, fz * 0.72 + 0.11);
        r1.rotation.z = -0.52;
        r1.rotation.x = 0.52;
        const r2 = r1.clone();
        r2.position.set(fx * 0.72 + 0.11, 1.25, fz * 0.72 - 0.11);
        craftGroup.add(r1, r2);

        const plaqueGeo = new THREE.BoxGeometry(0.32, 0.22, 0.03);
        const plaque = new THREE.Mesh(plaqueGeo, silverAluminumMat);
        plaque.position.set(fx * 0.72, 1.35, fz * 0.72);
        plaque.lookAt(fx * 2, 1.35, fz * 2);
        craftGroup.add(plaque);
      }
    });

    if (id === 'apollo-11-eagle-easep') {
      // United States flag
      const flagCanvas = document.createElement('canvas');
      flagCanvas.width = 260;
      flagCanvas.height = 170;
      const fctx = flagCanvas.getContext('2d');
      if (fctx) {
        for (let i = 0; i < 13; i++) {
          fctx.fillStyle = i % 2 ? '#f2f2f2' : '#b22234';
          fctx.fillRect(0, i * 13, 260, 13);
        }
        fctx.fillStyle = '#3c3b6e';
        fctx.fillRect(0, 0, 104, 91);
        fctx.fillStyle = '#ffffff';
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 6; j++) {
            fctx.fillRect(8 + j * 16, 6 + i * 9, 3, 3);
          }
        }
      }
      const flagTex = new THREE.CanvasTexture(flagCanvas);
      flagTex.colorSpace = THREE.SRGBColorSpace;
      const flagGroup = new THREE.Group();
      const flagMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.95),
        new THREE.MeshStandardMaterial({
          map: flagTex,
          side: THREE.DoubleSide,
          roughness: 0.95,
        })
      );
      flagMesh.rotation.x = -Math.PI / 2 + 0.12;
      flagMesh.position.set(0.9, 0.1, 0);
      const flagPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 2.1, 6),
        silverAluminumMat
      );
      flagPole.rotation.z = Math.PI / 2;
      flagPole.position.set(0.3, 0.08, -0.5);
      flagGroup.add(flagMesh, flagPole);
      registerCompanion(
        'flag',
        'United States flag',
        -8.5,
        -5,
        2.5,
        'The American flag planted on the Moon. Because there is no wind in space, a rod along the top held the flag out flat. When Eagle blasted off, its rocket blast probably knocked the flag over, and after 50+ years of strong sunlight its colors have likely faded to white.',
        'Probably fallen over and faded in the dust.',
        flagGroup
      );

      // PSEP Gold Foil Seismometer
      const psep = new THREE.Group();
      const psepBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.7), goldKaptonMat);
      psepBox.position.y = 0.3;
      const psepDish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12),
        silverAluminumMat
      );
      psepDish.position.y = 0.5;
      psepDish.rotation.x = 0.15;
      psep.add(psepBox, psepDish);
      registerCompanion(
        'psep',
        'Passive Seismic Experiment Package',
        16,
        -4,
        2.5,
        'The very first earthquake detector on the Moon! It listened for moonquakes. Shiny gold foil helped keep it warm, though the freezing two-week Moon night eventually made it stop after about three weeks.',
        'Quiet since 1969, still sitting in the Moon dust.',
        psep
      );

      // EASEP Laser Ranging Retroreflector (LRRR)
      const lrrrCanvas = document.createElement('canvas');
      lrrrCanvas.width = 128;
      lrrrCanvas.height = 128;
      const lctx = lrrrCanvas.getContext('2d');
      if (lctx) {
        lctx.fillStyle = '#b9bcc2';
        lctx.fillRect(0, 0, 128, 128);
        lctx.fillStyle = '#1a1d22';
        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            lctx.fillRect(8 + i * 11.5, 8 + j * 11.5, 8, 8);
          }
        }
      }
      const lrrrTex = new THREE.CanvasTexture(lrrrCanvas);
      lrrrTex.colorSpace = THREE.SRGBColorSpace;
      const lrrrGroup = new THREE.Group();
      const lrrrPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 0.04),
        new THREE.MeshStandardMaterial({
          map: lrrrTex,
          metalness: 0.5,
          roughness: 0.45,
        })
      );
      lrrrPanel.position.y = 0.55;
      lrrrPanel.rotation.x = -0.5;
      const lrrrLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6),
        silverAluminumMat
      );
      lrrrLeg.position.y = 0.25;
      lrrrGroup.add(lrrrPanel, lrrrLeg);
      registerCompanion(
        'lrrr',
        'Laser Ranging Retroreflector',
        20,
        2,
        2.5,
        'A tray of 100 special corner mirrors. Scientists on Earth shine lasers at it and time how long the light takes to bounce back! That shows how far away the Moon is down to a few millimeters—and proves the Moon is slowly drifting away about as fast as your fingernails grow.',
        'Still working today without any batteries!',
        lrrrGroup
      );

      // Lunar Surface TV Camera on Tripod
      const tvGroup = new THREE.Group();
      [0, 2.1, 4.2].forEach((a) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5),
          silverAluminumMat
        );
        leg.position.set(Math.cos(a) * 0.3, 0.3, Math.sin(a) * 0.3);
        leg.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
        tvGroup.add(leg);
      });
      const tvBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35), whiteThermalMat);
      tvBody.position.y = 0.7;
      tvGroup.add(tvBody);
      registerCompanion(
        'tv',
        'Lunar surface TV camera',
        -3,
        -16,
        2.5,
        'The TV camera that beamed Neil Armstrong’s very first Moon steps to about 600 million people watching on Earth. The astronauts set it up on this tripod to film the moonwalk, then left it behind.',
        'Left standing on its tripod in the Sea of Tranquility.',
        tvGroup
      );

      // Jettisoned PLSS Backpacks
      const plssGroup = new THREE.Group();
      [0, 1].forEach((i) => {
        const pack = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.75, 0.25),
          whiteThermalMat
        );
        pack.position.set(i * 0.9, 0.14, i * 0.3);
        pack.rotation.set(1.3, i * 1.1, 0.3);
        plssGroup.add(pack);
      });
      registerCompanion(
        'plss',
        'Portable life support backpacks',
        9,
        12,
        3.0,
        'The backpacks that gave Neil and Buzz cool oxygen to breathe outside on the Moon. Before blasting off, they tossed them out along with heavy extra gear so Eagle would be lighter and easier to fly back up!',
        'Lying right where the crew dropped them before liftoff.',
        plssGroup
      );

      // Overshoes & jettisoned gear
      const bootsGroup = new THREE.Group();
      [0, 1].forEach((i) => {
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.14), bootDustMat);
        boot.position.set(i * 0.5, 0.07, i * 0.1);
        boot.rotation.y = i * 0.8;
        bootsGroup.add(boot);
      });
      const camShell = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), blackCompositeMat);
      camShell.position.set(0.5, 0.05, 0.7);
      camShell.rotation.y = 0.3;
      bootsGroup.add(camShell);
      registerCompanion(
        'boots',
        'Overshoes and jettisoned gear',
        -12,
        9,
        2.5,
        'Special rubber overshoes that kept sharp Moon dust off the astronauts’ boots, plus camera bodies they left behind to save weight. They took the film magazines home, and with no wind or rain on the Moon, their bootprints could last millions of years!',
        'Resting beside crisp 1969 bootprints in the dust.',
        bootsGroup
      );

      // Apollo 1 and cosmonaut memorial items
      const memorialGroup = new THREE.Group();
      const siliconDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.01, 24),
        silverAluminumMat
      );
      siliconDisc.position.y = 0.04;
      const memorialBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.08), medalMat);
      memorialBox.position.set(0.2, 0.03, 0.1);
      memorialGroup.add(siliconDisc, memorialBox);
      registerCompanion(
        'memorial',
        'Apollo 1 and cosmonaut memorial items',
        13,
        -14,
        2.5,
        'Small gifts left to remember fallen space explorers: a tiny silicon disc etched with messages from 73 world leaders, a patch for the three Apollo 1 astronauts, a golden olive-branch pin for peace, and medals honoring Soviet cosmonauts Yuri Gagarin and Vladimir Komarov.',
        'Left quietly on the Moon as a peaceful tribute.',
        memorialGroup
      );

      // Waste bags
      const wasteGroup = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const bag = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8),
          whiteThermalMat
        );
        bag.position.set(i * 0.25, 0.1, (i % 2) * 0.2);
        bag.rotation.z = 1 + i;
        wasteGroup.add(bag);
      }
      registerCompanion(
        'waste',
        'Jettisoned waste bags',
        -6,
        18,
        2.5,
        'Bags of astronaut trash and waste tossed out before liftoff to keep Eagle as light as possible for the ride home. Scientists today wonder if any tiny microbes inside could survive decades in space.',
        'Still sitting untouched in the lunar dust.',
        wasteGroup
      );
    } else if (id === 'apollo-15-falcon-lrv-alsep') {
      const lrv = new THREE.Group();
      lrv.rotation.y = -0.6;
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.14, 1.3),
        silverAluminumMat
      );
      chassis.position.y = 0.55;
      lrv.add(chassis);
      const seat1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.45),
        whiteThermalMat
      );
      seat1.position.set(-0.2, 0.85, 0.32);
      const seat2 = seat1.clone();
      seat2.position.set(-0.2, 0.85, -0.32);
      lrv.add(seat1, seat2);
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
      [
        [-0.78, 0.32, 0.72],
        [0.78, 0.32, 0.72],
        [-0.78, 0.32, -0.72],
        [0.78, 0.32, -0.72],
      ].forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, copperMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, wy, wz);
        lrv.add(w);
      });
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
        goldKaptonMat
      );
      dish.position.set(0.65, 1.35, 0.3);
      dish.rotation.x = Math.PI * 0.75;
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8),
        silverAluminumMat
      );
      mast.position.set(0.65, 0.95, 0.3);
      lrv.add(dish, mast);
      registerCompanion(
        'lrv1',
        'Lunar Roving Vehicle (LRV-1)',
        6.8,
        3.6,
        3.0,
        'The very first electric Moon buggy! It folded up like origami inside Falcon’s side bay, then unfolded so astronauts Dave Scott and Jim Irwin could drive almost 28 kilometers across valleys and craters. Its woven wire wheels never go flat!',
        'Parked facing Falcon so its TV camera could film liftoff.',
        lrv
      );
    } else {
      // Apollo 12 ALSEP Station
      const alsep = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.55), whiteThermalMat);
      box.position.y = 0.225;
      const rtg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.5, 10),
        blackCompositeMat
      );
      rtg.position.set(0.85, 0.25, 0);
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8),
        silverAluminumMat
      );
      ant.position.y = 0.9;
      alsep.add(box, rtg, ant);
      registerCompanion(
        'alsep12',
        'Apollo 12 ALSEP science station',
        -6.4,
        4.2,
        2.8,
        'A nuclear-powered science weather station left behind by Apollo 12. Using warm plutonium heat instead of solar panels, it kept measuring moonquakes and solar wind day and night for nearly eight full years!',
        'Worked continuously from 1969 until September 1977.',
        alsep
      );
    }
  } else if (id.includes('ingenuity')) {
    targetScale = 1.8;
    craftRadius = 2.0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.38), goldKaptonMat);
    body.position.y = 0.58;
    craftGroup.add(body);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.72, 12),
      blackCompositeMat
    );
    mast.position.y = 0.96;
    craftGroup.add(mast);

    const bladeGeo = new THREE.BoxGeometry(1.65, 0.018, 0.11);
    const bladeTop = new THREE.Mesh(bladeGeo, blackCompositeMat);
    bladeTop.position.y = 1.24;
    bladeTop.rotation.y = 0.35;
    const bladeBot = new THREE.Mesh(bladeGeo, blackCompositeMat);
    bladeBot.position.y = 1.12;
    bladeBot.rotation.y = 1.9;
    craftGroup.add(bladeTop, bladeBot);

    const solar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.42), darkSolarCellMat);
    solar.position.y = 1.35;
    craftGroup.add(solar);

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const pTop = new THREE.Vector3(Math.cos(a) * 0.16, 0.52, Math.sin(a) * 0.16);
      const pBot = new THREE.Vector3(Math.cos(a) * 0.62, 0.02, Math.sin(a) * 0.62);
      const dir = new THREE.Vector3().subVectors(pBot, pTop);
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.015, dir.length(), 8),
        blackCompositeMat
      );
      leg.position.copy(pTop).addScaledVector(dir, 0.5);
      leg.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      craftGroup.add(leg);
    }
  } else if (id.includes('pathfinder')) {
    targetScale = 3.2;
    craftRadius = 3.2;

    const centerBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.32, 3),
      goldKaptonMat
    );
    centerBase.position.y = 0.18;
    craftGroup.add(centerBase);

    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const petal = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.06, 1.15),
        darkSolarCellMat
      );
      petal.position.set(Math.cos(a) * 1.15, 0.07, Math.sin(a) * 1.15);
      petal.rotation.y = -a;
      craftGroup.add(petal);
    }

    const prism = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.65), whiteThermalMat);
    prism.position.y = 0.56;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8),
      silverAluminumMat
    );
    mast.position.set(0.15, 1.2, 0.1);
    const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.16), blackCompositeMat);
    camHead.position.set(0.15, 1.72, 0.1);
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4),
      silverAluminumMat
    );
    dish.position.set(-0.22, 0.96, -0.15);
    dish.rotation.x = -Math.PI / 3;
    craftGroup.add(prism, mast, camHead, dish);

    const sojourner = new THREE.Group();
    sojourner.rotation.y = -0.5;
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.24, 0.55), goldKaptonMat);
    sBody.position.y = 0.24;
    const sSolar = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.03, 0.62), darkSolarCellMat);
    sSolar.position.y = 0.37;
    sojourner.add(sBody, sSolar);
    const sWheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12);
    [-0.3, 0, 0.3].forEach((wx) => {
      [-0.3, 0.3].forEach((wz) => {
        const w = new THREE.Mesh(sWheelGeo, silverAluminumMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(wx, 0.09, wz);
        sojourner.add(w);
      });
    });
    registerCompanion(
      'sojourner',
      'Sojourner Mars Rover',
      3.4,
      2.3,
      2.5,
      'The very first wheeled rover ever to drive on Mars! About the size of a microwave oven, this tiny six-wheeled robot rolled down Pathfinder’s ramp in 1997 and sniffed Martian rocks like Yogi and Barnacle Bill to show Mars once had flowing water.',
      'Parked beside Pathfinder after an unforgettable 83-day mission.',
      sojourner
    );
  } else if (artifact.category === 'rover') {
    targetScale = 2.8;
    craftRadius = 2.8;

    const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 18);
    const wheelCoords = [
      [-0.85, 0.22, 0.72],
      [0.0, 0.22, 0.78],
      [0.85, 0.22, 0.72],
      [-0.85, 0.22, -0.72],
      [0.0, 0.22, -0.78],
      [0.85, 0.22, -0.72],
    ];
    wheelCoords.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, blackCompositeMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      craftGroup.add(wheel);

      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8),
        silverAluminumMat
      );
      strut.position.set(wx * 0.75, 0.52, wz * 0.75);
      strut.rotation.x = wz > 0 ? -0.35 : 0.35;
      craftGroup.add(strut);
    });

    const web = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.52, 0.95), goldKaptonMat);
    web.position.y = 0.85;
    craftGroup.add(web);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.55), darkSolarCellMat);
    wing.position.y = 1.13;
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(2.32, 0.06, 0.04),
      silverAluminumMat
    );
    divider.position.y = 1.14;
    craftGroup.add(wing, divider);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.15, 12),
      whiteThermalMat
    );
    mast.position.set(0.48, 1.72, 0.25);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.2), whiteThermalMat);
    head.position.set(0.48, 2.32, 0.25);
    const eyeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
    const eyeL = new THREE.Mesh(eyeGeo, lensCyanMat);
    eyeL.rotation.z = Math.PI / 2;
    eyeL.position.set(0.66, 2.32, 0.34);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.66, 2.32, 0.16);
    craftGroup.add(mast, head, eyeL, eyeR);

    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      silverAluminumMat
    );
    dish.position.set(-0.55, 1.42, -0.25);
    dish.rotation.x = -Math.PI / 4;
    craftGroup.add(dish);
  } else {
    targetScale = 3.4;
    craftRadius = 3.0;

    const isSurveyor = id === 'surveyor-3';
    const isViking = id === 'viking-1-lander';

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(isSurveyor ? 0.95 : 1.15, 1.25, 0.65, 6),
      isSurveyor ? whiteThermalMat : isViking ? whiteThermalMat : goldKaptonMat
    );
    body.position.y = 1.05;
    craftGroup.add(body);

    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 1.65;
      const lz = Math.sin(a) * 1.65;
      const pTop = new THREE.Vector3(Math.cos(a) * 0.9, 1.0, Math.sin(a) * 0.9);
      const pBot = new THREE.Vector3(lx, 0.06, lz);
      const dir = new THREE.Vector3().subVectors(pBot, pTop);

      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.04, dir.length(), 10),
        isSurveyor ? silverAluminumMat : goldKaptonMat
      );
      leg.position.copy(pTop).addScaledVector(dir, 0.5);
      leg.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      craftGroup.add(leg);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 0.07, 14),
        goldKaptonMat
      );
      pad.position.set(lx, 0.035, lz);
      craftGroup.add(pad);
    }

    if (isSurveyor) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.5, 10),
        silverAluminumMat
      );
      mast.position.y = 2.0;
      const solar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.8), darkSolarCellMat);
      solar.position.set(0, 2.75, 0);
      solar.rotation.x = 0.35;
      const tvCam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.55, 12),
        whiteThermalMat
      );
      tvCam.position.set(0.45, 1.6, 0.35);
      craftGroup.add(mast, solar, tvCam);
    } else if (isViking) {
      [-1.05, 1.05].forEach((xOff) => {
        const rtg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.6, 10),
          blackCompositeMat
        );
        rtg.rotation.z = Math.PI / 2;
        rtg.position.set(xOff, 1.25, 0);
        craftGroup.add(rtg);
      });
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.4),
        whiteThermalMat
      );
      dish.position.set(-0.2, 1.9, -0.35);
      dish.rotation.x = -Math.PI / 3;
      const cam1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.48, 12),
        silverAluminumMat
      );
      cam1.position.set(0.45, 1.65, 0.4);
      craftGroup.add(dish, cam1);
    } else {
      [-1.85, 1.85].forEach((xOff) => {
        const solar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 0.95, 0.04, 10),
          darkSolarCellMat
        );
        solar.position.set(xOff, 1.22, 0);
        const strut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8),
          silverAluminumMat
        );
        strut.rotation.z = Math.PI / 2;
        strut.position.set(xOff * 0.62, 1.22, 0);
        craftGroup.add(solar, strut);
      });
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8),
        silverAluminumMat
      );
      mast.position.set(-0.35, 1.8, -0.3);
      craftGroup.add(mast);

      if (id === 'insight-lander') {
        const seis = new THREE.Group();
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.36, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
          copperMat
        );
        const skirt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.42, 0.14, 18),
          whiteThermalMat
        );
        skirt.position.y = 0.07;
        dome.position.y = 0.14;
        seis.add(skirt, dome);
        registerCompanion(
          'seis',
          'SEIS Marsquake Seismometer Dome',
          2.9,
          2.2,
          2.4,
          'InSight’s super-sensitive ear placed right onto the Martian dirt! Hidden under this copper wind shield, it felt over 1,300 marsquakes and even heard meteorite impacts shaking the planet.',
          'Proved Mars is still trembling inside today!',
          seis
        );
      }
    }
  }

  craftGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  companionGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { craftGroup, companionGroup, companionItems, targetScale, craftRadius };
}

function formatOffsetCoords(
  baseLat: number,
  baseLon: number,
  xMeters: number,
  zMeters: number,
  isMars: boolean
) {
  const radiusM = isMars ? 3389500 : 1737400;
  const lat = baseLat - (zMeters * 180) / (Math.PI * radiusM);
  const cosLat = Math.max(0.2, Math.cos((baseLat * Math.PI) / 180));
  const lon = baseLon + (xMeters * 180) / (Math.PI * radiusM * cosLat);
  const latStr = `${Math.abs(lat).toFixed(5)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(5)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}  ${lonStr}`;
}

export const SurfaceExplorerGame: React.FC<SurfaceExplorerGameProps> = ({
  artifact,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isMars = artifact.body === 'mars';
  const inspectionConfig = getSpacecraftInspectionConfig(artifact.id);
  const totalPartsCount = Object.keys(inspectionConfig.parts).length;

  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [activePrompt, setActivePrompt] = useState<{ id: string; name: string } | null>(null);
  const [inspectedPanel, setInspectedPanel] = useState<InspectedPanelData | null>(null);
  const [posLine, setPosLine] = useState<string>(
    formatOffsetCoords(artifact.coordinates.lat, artifact.coordinates.lon, 14, 22, isMars)
  );
  const [nearestLine, setNearestLine] = useState<string>('');
  const [partsSeenCount, setPartsSeenCount] = useState<number>(0);

  const flashlightOnRef = useRef(false);
  const inspectedPanelRef = useRef<InspectedPanelData | null>(null);
  inspectedPanelRef.current = inspectedPanel;

  const seenPartsRef = useRef<Set<string>>(new Set());
  const seenItemsRef = useRef<Set<string>>(new Set());
  const activeTargetRef = useRef<ActiveTarget | null>(null);

  const handleExit = useCallback(() => {
    playTelemetryBeep(420);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    seenPartsRef.current = new Set();
    seenItemsRef.current = new Set();
    flashlightOnRef.current = false;
    activeTargetRef.current = null;
    setIsFlashlightOn(false);
    setActivePrompt(null);
    setInspectedPanel(null);
    setPartsSeenCount(0);

    let isDisposed = false;
    let rafId = 0;

    // 1. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererString = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererString);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isMars ? 1.05 : 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. SCENE & SPACE REFLECTION ENVIRONMENT
    const scene = new THREE.Scene();
    if (isMars) {
      scene.background = new THREE.Color(0xc27d56);
      scene.fog = new THREE.FogExp2(0x9e5936, 0.0032);
    } else {
      scene.background = new THREE.Color(0x000000);
    }

    const sunDir = isMars
      ? new THREE.Vector3(Math.cos(0.3) * 0.95, Math.sin(0.3), -0.22).normalize()
      : new THREE.Vector3(Math.cos(0.2) * 0.98, Math.sin(0.2), -0.18).normalize();

    const envRT = buildSpaceEnvironment(renderer, sunDir, isMars);
    scene.environment = envRT.texture;
    scene.environmentIntensity = isMars ? 0.42 : 0.28;

    // 3. CAMERA + FLASHLIGHT RIG ('G' KEY)
    const camera = new THREE.PerspectiveCamera(
      70,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.1,
      4000
    );
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    const flashlight = new THREE.SpotLight(0xfff0d8, 0, 80, 0.42, 0.5, 1);
    flashlight.position.set(0.18, -0.14, 0);
    flashlight.target.position.set(0, 0, -8);
    camera.add(flashlight, flashlight.target);

    // 4. LIGHTING
    const sunLight = new THREE.DirectionalLight(
      isMars ? 0xffe4cc : 0xfff4e6,
      isMars ? 3.2 : 3.6
    );
    sunLight.position.copy(sunDir).multiplyScalar(150);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.left = -45;
      sunLight.shadow.camera.right = 45;
      sunLight.shadow.camera.top = 45;
      sunLight.shadow.camera.bottom = -45;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 400;
      sunLight.shadow.bias = -0.0004;
    }
    scene.add(sunLight, sunLight.target);

    const hemiLight = new THREE.HemisphereLight(
      isMars ? 0xd99b72 : 0x8fa4c8,
      isMars ? 0x3b1c0e : 0x1a1714,
      isMars ? 0.36 : 0.07
    );
    scene.add(hemiLight);

    if (!isMars) {
      const earthLight = new THREE.DirectionalLight(0xa8c4ff, 0.06);
      earthLight.position.set(-1, 2.3, 0);
      scene.add(earthLight);
    }

    // 5. SKY ELEMENTS
    const skyGeometries: THREE.BufferGeometry[] = [];
    const skyMaterials: THREE.Material[] = [];
    const skyTextures: THREE.Texture[] = [];

    if (!isMars) {
      const starCount = 2500;
      const starPos: number[] = [];
      const randStar = createSeededRandom('lunar-stars-v2');
      for (let i = 0; i < starCount; i++) {
        const v = new THREE.Vector3(
          randStar() - 0.5,
          randStar() - 0.5,
          randStar() - 0.5
        )
          .normalize()
          .multiplyScalar(3000);
        starPos.push(v.x, Math.abs(v.y) * 0.9 + v.y * 0.1, v.z);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
      const starMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2.2,
        sizeAttenuation: false,
        fog: false,
      });
      scene.add(new THREE.Points(starGeo, starMat));
      skyGeometries.push(starGeo);
      skyMaterials.push(starMat);

      const sunDisc = createRadialDiscSprite(
        '#fffbe8',
        'rgba(255,240,200,0.25)',
        300,
        sunDir.clone().multiplyScalar(3500)
      );
      scene.add(sunDisc.sprite);
      skyMaterials.push(sunDisc.material);
      skyTextures.push(sunDisc.texture);

      const earthDisc = createRadialDiscSprite(
        '#4f86c8',
        'rgba(120,170,255,0.2)',
        95,
        new THREE.Vector3(-1, 2.3, 0).normalize().multiplyScalar(3400)
      );
      scene.add(earthDisc.sprite);
      skyMaterials.push(earthDisc.material);
      skyTextures.push(earthDisc.texture);
    } else {
      const domeGeo = new THREE.SphereGeometry(3200, 24, 16);
      const domeMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x8c4a27) },
          horizonColor: { value: new THREE.Color(0xc27d56) },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          varying vec3 vWorldPos;
          void main() {
            float h = clamp(normalize(vWorldPos).y * 1.4, 0.0, 1.0);
            gl_FragColor = vec4(mix(horizonColor, topColor, pow(h, 0.65)), 1.0);
          }
        `,
      });
      scene.add(new THREE.Mesh(domeGeo, domeMat));
      skyGeometries.push(domeGeo);
      skyMaterials.push(domeMat);

      const marsSunDisc = createRadialDiscSprite(
        '#fff2dc',
        'rgba(255,205,155,0.28)',
        240,
        sunDir.clone().multiplyScalar(3100)
      );
      scene.add(marsSunDisc.sprite);
      skyMaterials.push(marsSunDisc.material);
      skyTextures.push(marsSunDisc.texture);
    }

    // 6. TERRAIN
    const craters = buildCraters(artifact.id);
    const sampleH = createHeightSampler(craters, isMars);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const regolithTex = createRegolithTexture(isMars, maxAnisotropy);

    const terrainSegs = isSoftwareGl ? 160 : 300;
    const terrainGeo = new THREE.PlaneGeometry(1200, 1200, terrainSegs, terrainSegs);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, sampleH(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      bumpMap: regolithTex,
      bumpScale: isMars ? 1.8 : 2.0,
      roughness: 1.0,
      metalness: 0.0,
      color: isMars ? 0xc27b56 : 0xb8b4aa,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 7. INSTANCED ROCKS
    const rockCount = isSoftwareGl ? 650 : 2600;
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: isMars ? 0x733a24 : 0x6f6c66,
      roughness: 1.0,
      flatShading: true,
    });
    const rockInstances = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockInstances.castShadow = !isSoftwareGl;
    rockInstances.receiveShadow = true;

    const randRock = createSeededRandom(artifact.id + '-rocks-v2');
    const rockMatrix = new THREE.Matrix4();
    const rockQuat = new THREE.Quaternion();
    const rockEuler = new THREE.Euler();
    const rockPos = new THREE.Vector3();
    const rockScale = new THREE.Vector3();

    for (let i = 0; i < rockCount; i++) {
      const a = randRock() * 6.283185;
      const d = 5.5 + Math.pow(randRock(), 0.8) * 360;
      const rx = Math.cos(a) * d;
      const rz = Math.sin(a) * d;
      const s = 0.04 + Math.pow(randRock(), 5) * 1.1;
      rockEuler.set(randRock() * 6, randRock() * 6, randRock() * 6);
      rockQuat.setFromEuler(rockEuler);
      rockPos.set(rx, sampleH(rx, rz) + s * 0.2, rz);
      rockScale.set(s * (0.8 + randRock() * 0.6), s * 0.6, s * (0.8 + randRock() * 0.6));
      rockMatrix.compose(rockPos, rockQuat, rockScale);
      rockInstances.setMatrixAt(i, rockMatrix);
    }
    rockInstances.instanceMatrix.needsUpdate = true;
    rockInstances.computeBoundingSphere();
    scene.add(rockInstances);

    // 8. SPACECRAFT, COMPANION ITEMS & RAYCAST REGISTRY
    const siteAnchor = new THREE.Group();
    const centerGroundY = sampleH(0, 0);
    siteAnchor.position.set(0, centerGroundY, 0);
    scene.add(siteAnchor);

    const { craftGroup, companionGroup, companionItems, targetScale, craftRadius } =
      buildProceduralSpacecraft(artifact, sampleH, centerGroundY);
    siteAnchor.add(craftGroup);
    siteAnchor.add(companionGroup);

    let craftMeshes: THREE.Mesh[] = [];
    let craftBounds: CraftBounds | null = null;
    let craftSphere: THREE.Sphere | null = null;
    let highlightedMesh: THREE.Mesh | null = null;

    const setHighlightedMesh = (mesh: THREE.Mesh | null) => {
      if (highlightedMesh === mesh) return;
      if (highlightedMesh && highlightedMesh.userData.origMat) {
        highlightedMesh.material = highlightedMesh.userData.origMat;
      }
      highlightedMesh = mesh;
      if (mesh) {
        if (!mesh.userData.hlMat) {
          mesh.userData.origMat = mesh.material;
          const cloneMat = (mat: THREE.Material) => {
            const c = mat.clone();
            if ('emissive' in c && (c as THREE.MeshStandardMaterial).emissive) {
              (c as THREE.MeshStandardMaterial).emissive.setHex(0xd4aa4f);
              (c as THREE.MeshStandardMaterial).emissiveIntensity = 0.22;
            }
            return c;
          };
          mesh.userData.hlMat = Array.isArray(mesh.material)
            ? mesh.material.map(cloneMat)
            : cloneMat(mesh.material);
        }
        mesh.material = mesh.userData.hlMat;
      }
    };

    const prepareCraftForRaycast = (root: THREE.Object3D) => {
      setHighlightedMesh(null);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      craftBounds = {
        minY: box.min.y,
        H: size.y || 1,
        cx: center.x,
        cz: center.z,
        W: Math.max(size.x, size.z) || 1,
        R: Math.max(size.x, size.z) / 2 || 1,
      };
      craftSphere = new THREE.Sphere(center, size.length() / 2 + 0.5);
      const collected: THREE.Mesh[] = [];
      const subBox = new THREE.Box3();
      const subSize = new THREE.Vector3();
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          subBox.setFromObject(m);
          subBox.getSize(subSize);
          const stats: MeshPartStats = {
            sx: subSize.x,
            sy: subSize.y,
            sz: subSize.z,
            gold: isGoldMaterial(m.material),
          };
          m.userData.partStats = stats;
          collected.push(m);
        }
      });
      craftMeshes = collected;
    };

    prepareCraftForRaycast(craftGroup);

    let gltfRoot: THREE.Object3D | null = null;
    const glbAbortController = new AbortController();
    const modelAsset = getSpacecraftModelAsset(artifact.id);
    const targetModelUrl = modelAsset.modelPath || artifact.model3dUrl || null;

    if (targetModelUrl) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_CDN_URL);
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      loadValidatedGltf(targetModelUrl, gltfLoader, glbAbortController.signal)
        .then((gltf) => {
          if (isDisposed) {
            disposeObject3D(gltf.scene);
            dracoLoader.dispose();
            return;
          }
          const loaded = gltf.scene;
          const box = new THREE.Box3().setFromObject(loaded);
          const size = box.getSize(new THREE.Vector3());

          const scale =
            artifact.category === 'apollo_crewed'
              ? 7 / Math.max(size.y, size.x * 0.75, 0.001)
              : targetScale / Math.max(size.x, size.y, size.z, 0.001);

          loaded.scale.setScalar(scale);
          box.setFromObject(loaded);
          const center = box.getCenter(new THREE.Vector3());

          loaded.position.set(-center.x, -box.min.y + 0.02, -center.z);

          loaded.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = !isSoftwareGl;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mats = Array.isArray(mesh.material)
                  ? mesh.material
                  : [mesh.material];
                mats.forEach((m) => {
                  m.side = THREE.DoubleSide;
                  if (m instanceof THREE.MeshStandardMaterial) {
                    m.envMapIntensity = isMars ? 0.95 : 1.05;
                  }
                  m.needsUpdate = true;
                });
              }
            }
          });

          setHighlightedMesh(null);
          siteAnchor.remove(craftGroup);
          disposeObject3D(craftGroup);
          siteAnchor.add(loaded);
          gltfRoot = loaded;
          prepareCraftForRaycast(loaded);
          dracoLoader.dispose();
        })
        .catch(() => {
          dracoLoader.dispose();
        });
    }

    // 9. FOOTPRINTS TRAIL
    const maxPrints = 400;
    const printGeo = new THREE.CircleGeometry(0.13, 10);
    printGeo.rotateX(-Math.PI / 2);
    const printMat = new THREE.MeshBasicMaterial({
      color: isMars ? 0x451e10 : 0x2a2926,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const footprintMesh = new THREE.InstancedMesh(printGeo, printMat, maxPrints);
    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < maxPrints; i++) {
      footprintMesh.setMatrixAt(i, zeroMat);
    }
    footprintMesh.instanceMatrix.needsUpdate = true;
    footprintMesh.frustumCulled = false;
    scene.add(footprintMesh);
    let printCursor = 0;
    let printStepSide = 1;
    const startX = artifact.category === 'apollo_crewed' ? 14 : 10;
    const startZ = artifact.category === 'apollo_crewed' ? 22 : 16;
    const lastPrintPos = new THREE.Vector3(startX, sampleH(startX, startZ), startZ);

    // 10. PLAYER STATE, RAYCASTER & INPUTS (DIRECT ENTRY - NO CLICK-TO-START OVERLAY)
    const EYE_HEIGHT = 1.7;
    const WORLD_LIMIT = 580;

    const player = {
      pos: new THREE.Vector3(startX, sampleH(startX, startZ), startZ),
      vel: new THREE.Vector3(),
      onGround: true,
      yaw: Math.atan2(startX, startZ),
      pitch: -0.05,
    };

    const raycaster = new THREE.Raycaster();
    raycaster.far = 8;
    const centerNDC = new THREE.Vector2(0, 0);
    const _lookDir = new THREE.Vector3();
    const _toItem = new THREE.Vector3();
    const _eyePos = new THREE.Vector3();

    const probeSpacecraftComponent = (): {
      mesh: THREE.Mesh;
      partId: string;
    } | null => {
      if (!craftMeshes.length || !craftSphere || !craftBounds) return null;
      raycaster.setFromCamera(centerNDC, camera);
      if (!raycaster.ray.intersectsSphere(craftSphere)) return null;
      const hits = raycaster.intersectObjects(craftMeshes, false);
      if (!hits.length) return null;
      const hitMesh = hits[0].object as THREE.Mesh;
      const stats = hitMesh.userData.partStats as MeshPartStats | undefined;
      if (!stats) return null;
      const partId = inspectionConfig.classify(stats, hits[0].point, craftBounds);
      return { mesh: hitMesh, partId };
    };

    const probeCompanionItem = (): CompanionSurfaceItem | null => {
      if (!companionItems.length) return null;
      _lookDir.set(0, 0, -1).applyEuler(camera.rotation);
      _eyePos.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
      let best: CompanionSurfaceItem | null = null;
      let bestScore = 0;
      for (let i = 0; i < companionItems.length; i++) {
        const item = companionItems[i];
        _toItem.subVectors(item.center, _eyePos);
        const dist = _toItem.length();
        if (dist > item.radius + 3.5 || dist < 0.001) continue;
        const score = _toItem.divideScalar(dist).dot(_lookDir);
        if (score > 0.93 && score > bestScore) {
          bestScore = score;
          best = item;
        }
      }
      return best;
    };

    const toggleInspection = () => {
      if (inspectedPanelRef.current) {
        playTelemetryBeep(440);
        setInspectedPanel(null);
        return;
      }
      const target = activeTargetRef.current;
      if (!target) return;

      playSuccessChime();
      setHighlightedMesh(null);

      if (target.kind === 'part') {
        if (!seenPartsRef.current.has(target.id)) {
          seenPartsRef.current.add(target.id);
          setPartsSeenCount(seenPartsRef.current.size);
        }
      } else {
        seenItemsRef.current.add(target.id);
      }

      setInspectedPanel({
        nssdcLabel: target.nssdcLabel,
        name: target.name,
        text: target.text,
        highlightNote: target.highlightNote,
      });
    };

    const keys: Record<string, boolean> = {};
    let isDraggingLook = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.repeat) return;

      if (e.code === 'KeyE') {
        toggleInspection();
      } else if (e.code === 'KeyG') {
        const next = !flashlightOnRef.current;
        flashlightOnRef.current = next;
        setIsFlashlightOn(next);
        playTelemetryBeep(next ? 680 : 390);
      } else if (e.code === 'Space' && player.onGround) {
        e.preventDefault();
        player.vel.y = isMars ? 3.8 : 3.4;
        player.onGround = false;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        player.yaw -= e.movementX * 0.0022;
        player.pitch = THREE.MathUtils.clamp(
          player.pitch - e.movementY * 0.0022,
          -1.45,
          1.45
        );
      } else if (isDraggingLook) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        player.yaw -= dx * 0.0032;
        player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0032, -1.45, 1.45);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.target === renderer.domElement) {
        isDraggingLook = true;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        if (document.pointerLockElement !== renderer.domElement) {
          renderer.domElement.requestPointerLock?.();
        }
      }
    };

    const onMouseUp = () => {
      isDraggingLook = false;
    };

    const onPointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === renderer.domElement);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // 11. RESIZE OBSERVER
    const handleResize = () => {
      if (isDisposed || !container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Pre-allocated math objects for render loop
    const printDummy = new THREE.Object3D();
    let probeTimer = 0;
    let lastHudUpdate = 0;
    let lastPromptId = '';
    let prevTime = performance.now();

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

    const tick = (now: number) => {
      if (isDisposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;

      // Player movement
      const fw =
        (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
        (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const st =
        (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
        (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
      const sp = keys['ShiftLeft'] || keys['ShiftRight'] ? 6.5 : 3.2;

      const wx = -Math.sin(player.yaw) * fw + Math.cos(player.yaw) * st;
      const wz = -Math.cos(player.yaw) * fw - Math.sin(player.yaw) * st;
      const n = Math.hypot(wx, wz) || 1;
      const k = player.onGround ? Math.min(1, dt * 7) : dt * 0.25;

      player.vel.x += ((wx / n) * sp * (fw || st ? 1 : 0) - player.vel.x) * k;
      player.vel.z += ((wz / n) * sp * (fw || st ? 1 : 0) - player.vel.z) * k;

      const gravity = isMars ? 3.72 : 1.62;
      player.vel.y -= gravity * dt;
      player.pos.addScaledVector(player.vel, dt);

      // Spacecraft collision pushout
      const craftDist = Math.hypot(player.pos.x, player.pos.z);
      if (craftDist < craftRadius && craftDist > 0.001 && player.pos.y < centerGroundY + 5) {
        player.pos.x *= craftRadius / craftDist;
        player.pos.z *= craftRadius / craftDist;
      }

      // Ground clamping
      const groundY = sampleH(player.pos.x, player.pos.z);
      if (player.pos.y <= groundY) {
        player.pos.y = groundY;
        player.vel.y = 0;
        player.onGround = true;
      } else if (player.pos.y > groundY + 0.05) {
        player.onGround = false;
      }

      // Leave boot footprints along regolith every 0.85m
      if (
        player.onGround &&
        Math.hypot(player.pos.x - lastPrintPos.x, player.pos.z - lastPrintPos.z) > 0.85
      ) {
        lastPrintPos.copy(player.pos);
        printStepSide *= -1;
        const fx = player.pos.x + Math.cos(player.yaw) * printStepSide * 0.18;
        const fz = player.pos.z - Math.sin(player.yaw) * printStepSide * 0.18;
        printDummy.position.set(fx, sampleH(fx, fz) + 0.03, fz);
        printDummy.rotation.set(0, player.yaw, 0);
        printDummy.scale.set(1, 1, 2.1);
        printDummy.updateMatrix();
        footprintMesh.setMatrixAt(printCursor, printDummy.matrix);
        footprintMesh.instanceMatrix.needsUpdate = true;
        printCursor = (printCursor + 1) % maxPrints;
      }

      // World perimeter clamp
      player.pos.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.pos.x));
      player.pos.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.pos.z));

      // First-person camera pose
      camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
      camera.rotation.set(player.pitch, player.yaw, 0);

      // Smooth flashlight intensity transition
      const targetFlashIntensity = flashlightOnRef.current ? 3.5 : 0;
      flashlight.intensity +=
        (targetFlashIntensity - flashlight.intensity) * Math.min(1, dt * 9);

      // Throttled 20Hz crosshair raycasting on spacecraft sub-meshes & companion items
      probeTimer += dt;
      if (probeTimer > 0.05) {
        probeTimer = 0;
        camera.updateMatrixWorld();

        const cx = craftBounds ? craftBounds.cx : 0;
        const cz = craftBounds ? craftBounds.cz : 0;
        const hit =
          Math.hypot(player.pos.x - cx, player.pos.z - cz) < 20
            ? probeSpacecraftComponent()
            : null;

        let nextTarget: ActiveTarget | null = null;

        if (hit && inspectionConfig.parts[hit.partId]) {
          const part = inspectionConfig.parts[hit.partId];
          setHighlightedMesh(inspectedPanelRef.current ? null : hit.mesh);
          nextTarget = {
            kind: 'part',
            id: part.id,
            name: part.name,
            nssdcLabel: inspectionConfig.nssdcLabel,
            text: part.text,
            highlightNote: part.why,
          };
        } else {
          setHighlightedMesh(null);
          const item = probeCompanionItem();
          if (item) {
            nextTarget = {
              kind: 'item',
              id: item.id,
              name: item.name,
              nssdcLabel: null,
              text: item.text,
              highlightNote: item.status,
            };
          }
        }

        activeTargetRef.current = nextTarget;
        const nextPromptId = nextTarget ? `${nextTarget.kind}:${nextTarget.id}` : '';
        if (nextPromptId !== lastPromptId) {
          lastPromptId = nextPromptId;
          setActivePrompt(
            nextTarget ? { id: nextTarget.id, name: nextTarget.name } : null
          );
        }
      }

      // HUD telemetry update (coordinates, nearest unread item bearing)
      if (now - lastHudUpdate > 140) {
        lastHudUpdate = now;
        const coordText = formatOffsetCoords(
          artifact.coordinates.lat,
          artifact.coordinates.lon,
          player.pos.x,
          player.pos.z,
          isMars
        );
        if (companionItems.length > 0) {
          const seenCount = seenItemsRef.current.size;
          setPosLine(`${coordText} · ${seenCount}/${companionItems.length} logged`);

          let nearest: CompanionSurfaceItem | null = null;
          let nearestDist = 1e9;
          for (let i = 0; i < companionItems.length; i++) {
            const it = companionItems[i];
            if (seenItemsRef.current.has(it.id)) continue;
            const d = Math.hypot(it.center.x - player.pos.x, it.center.z - player.pos.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = it;
            }
          }
          if (nearest) {
            const bearing =
              ((Math.atan2(nearest.center.x - player.pos.x, -(nearest.center.z - player.pos.z)) *
                180) /
                Math.PI +
                360) %
              360;
            setNearestLine(`Nearest unread: ${nearestDist | 0} m, bearing ${bearing | 0}°`);
          } else {
            const allPartsSeen = seenPartsRef.current.size >= totalPartsCount;
            setNearestLine(
              allPartsSeen
                ? 'Every object logged.'
                : `Surface items logged. Look closely at ${inspectionConfig.craftShortName}’s parts and press E.`
            );
          }
        } else {
          setPosLine(coordText);
          const allPartsSeen = seenPartsRef.current.size >= totalPartsCount;
          setNearestLine(
            allPartsSeen
              ? `All ${inspectionConfig.craftShortName} parts inspected.`
              : `Walk up to ${inspectionConfig.craftShortName} (${Math.max(0, Math.round(craftDist - craftRadius * 0.6))} m) and aim at its parts.`
          );
        }
      }

      // Keep shadow frustum centered around player
      sunLight.position.copy(player.pos).addScaledVector(sunDir, 150);
      sunLight.target.position.copy(player.pos);
      sunLight.target.updateMatrixWorld();

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      glbAbortController.abort();
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }

      setHighlightedMesh(null);
      camera.remove(flashlight, flashlight.target);
      flashlight.dispose();

      disposeObject3D(craftGroup);
      disposeObject3D(companionGroup);
      if (gltfRoot) disposeObject3D(gltfRoot);
      terrainGeo.dispose();
      terrainMat.dispose();
      regolithTex.dispose();
      rockGeo.dispose();
      rockMat.dispose();
      printGeo.dispose();
      printMat.dispose();
      skyGeometries.forEach((g) => g.dispose());
      skyMaterials.forEach((m) => m.dispose());
      skyTextures.forEach((t) => t.dispose());
      envRT.dispose();
      scene.clear();
      renderer.dispose();
    };
  }, [artifact, isMars]);

  const siteTitle =
    artifact.id === 'apollo-11-eagle-easep' ? 'Tranquility Base' : artifact.moniker;

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-black select-none"
      style={
        {
          '--gold': '#d4aa4f',
          '--ink': '#08080a',
          '--dust': '#e8e3d6',
          color: 'var(--dust)',
          fontFamily: "'Newsreader', Georgia, serif",
        } as React.CSSProperties
      }
    >
      {/* Dedicated Three.js Canvas Mount (no backdrop-blur over WebGL) */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        aria-label={`3D surface exploration of ${artifact.name}`}
      />

      {/* Minimalist HUD Layer */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Center Crosshair Reticle (#ret) */}
        <div
          id="ret"
          className="absolute left-1/2 top-1/2 w-[6px] h-[6px] -m-[3px] rounded-full transition-colors"
          style={{
            border: activePrompt
              ? '1px solid var(--gold)'
              : '1px solid rgba(255,255,255,0.7)',
          }}
        />

        {/* Top-Left Telemetry Readout (#tl) */}
        <div
          id="tl"
          className="absolute left-[18px] top-[16px] text-[15px] leading-[1.5]"
          style={{ textShadow: '0 1px 3px #000' }}
        >
          <b
            className="font-semibold text-[17px]"
            style={{ color: 'var(--gold)' }}
          >
            {siteTitle}
          </b>
          <br />
          <span id="pos">{posLine}</span>
          <br />
          <span id="near">{nearestLine}</span>
          <br />
          <span id="comp" className="text-[14px]" style={{ color: '#a9a392' }}>
            {inspectionConfig.craftShortName} components inspected: {partsSeenCount}/
            {totalPartsCount}
          </span>
          <br />
          <span
            id="fl"
            className={`text-[14px] ${isFlashlightOn ? 'on' : ''}`}
            style={{ color: isFlashlightOn ? 'var(--gold)' : '#a9a392' }}
          >
            Flashlight {isFlashlightOn ? 'on' : 'off'} · G
          </span>
          {!isPointerLocked && (
            <>
              <br />
              <span
                id="hint"
                className="text-[13px] italic"
                style={{ color: '#a9a392' }}
              >
                Click to look around · WASD move · Shift run · Space jump · E inspect · G
                flashlight
              </span>
            </>
          )}
        </div>

        {/* Top-Right Exit Surface Button */}
        <div className="absolute top-[16px] right-[18px] pointer-events-auto">
          <button
            onClick={handleExit}
            className="px-3.5 py-1.5 text-[14px] flex items-center gap-1.5 transition-colors cursor-pointer"
            style={{
              background: 'rgba(8, 8, 10, 0.78)',
              border: '1px solid rgba(212, 170, 79, 0.55)',
              color: 'var(--dust)',
              fontFamily: "'Newsreader', Georgia, serif",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            <span>Exit Surface</span>
          </button>
        </div>

        {/* Crosshair Component Inspection Prompt (#prompt) */}
        {activePrompt && !inspectedPanel && (
          <div
            id="prompt"
            className="absolute left-1/2 top-[58%] -translate-x-1/2 px-[14px] py-[6px] text-[18px]"
            style={{
              background: 'rgba(8, 8, 10, 0.72)',
              borderLeft: '3px solid var(--gold)',
              color: 'var(--dust)',
            }}
          >
            Press E to inspect {activePrompt.name}
          </div>
        )}

        {/* Component Inspection Panel (#panel) */}
        {inspectedPanel && (
          <div
            id="panel"
            className="pointer-events-auto absolute right-[24px] bottom-[24px] w-[min(440px,calc(100%-48px))] max-h-[70%] overflow-auto px-[22px] py-[18px] text-[17px] leading-[1.5]"
            style={{
              background: 'rgba(8, 8, 10, 0.9)',
              borderTop: '4px solid var(--gold)',
              color: 'var(--dust)',
            }}
          >
            <button
              onClick={() => {
                playTelemetryBeep(440);
                setInspectedPanel(null);
              }}
              aria-label="Close inspection panel"
              className="float-right ml-3 p-1 transition-opacity opacity-75 hover:opacity-100 cursor-pointer"
              style={{ color: '#a9a392' }}
            >
              <X className="w-4 h-4" />
            </button>
            {inspectedPanel.nssdcLabel && (
              <p
                className="k m-0 mb-1 text-[12.5px] uppercase tracking-[0.14em]"
                style={{ color: '#a9a392' }}
              >
                {inspectedPanel.nssdcLabel}
              </p>
            )}
            <h2
              className="m-0 mb-2 text-[24px] font-semibold leading-snug"
              style={{
                color: 'var(--gold)',
                fontFamily: "'Newsreader', Georgia, serif",
              }}
            >
              {inspectedPanel.name}
            </h2>
            <p className="m-0 mb-[10px] max-w-[62ch]">{inspectedPanel.text}</p>
            <p className="m-0 mb-[10px] max-w-[62ch]">
              <em style={{ color: '#a9a392' }}>{inspectedPanel.highlightNote}</em>
            </p>
            <p className="m-0 max-w-[62ch]">
              <em style={{ color: '#a9a392' }}>Press E to close.</em>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
