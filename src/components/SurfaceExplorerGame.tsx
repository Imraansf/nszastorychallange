import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Artifact } from '../types/space';
import {
  ArrowLeft,
  Compass,
  Info,
  X,
  Footprints,
  MousePointerClick,
} from 'lucide-react';
import { playTelemetryBeep, playSuccessChime } from '../utils/audio';
import {
  DRACO_DECODER_CDN_URL,
  getSpacecraftModelAsset,
  loadValidatedGltf,
} from '../utils/spacecraft-models';

export interface SurfaceExplorerGameProps {
  artifact: Artifact;
  onClose: () => void;
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
  d: number;
}

function buildCraters(seedStr: string): CraterDef[] {
  const rand = createSeededRandom(seedStr + '-craters');
  const craters: CraterDef[] = [];
  for (let i = 0; i < 42; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 16 + rand() * 98;
    const r = 2.2 + Math.pow(rand(), 1.7) * 14;
    const d = (0.28 + rand() * 0.72) * Math.min(2.6, r * 0.22);
    craters.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      r,
      d,
    });
  }
  return craters;
}

function createHeightSampler(craters: CraterDef[], isMars: boolean) {
  const hillAmp = isMars ? 0.55 : 0.42;
  return (x: number, z: number): number => {
    // Base gentle undulation
    let y =
      Math.sin(x * 0.045) * Math.cos(z * 0.042) * hillAmp +
      Math.sin(x * 0.11 + z * 0.08) * 0.14 +
      Math.cos(x * 0.23 - z * 0.19) * 0.04;

    // Craters (bowl + raised rim)
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const distSq = dx * dx + dz * dz;
      const outerR = c.r * 1.45;
      if (distSq < outerR * outerR) {
        const dist = Math.sqrt(distSq);
        const norm = dist / c.r;
        if (norm < 1.0) {
          // Bowl
          y -= c.d * (1 - norm * norm);
        }
        // Rim lip around norm ~ 1.05
        const rimDelta = norm - 1.05;
        y += c.d * 0.28 * Math.exp(-(rimDelta * rimDelta) / 0.045);
      }
    }

    // Flatten immediate spacecraft touchdown pad (radius 7.5m -> smooth blend to 14m)
    const padDist = Math.hypot(x, z);
    if (padDist < 14) {
      const blend = THREE.MathUtils.smoothstep(padDist, 5.5, 14);
      y *= blend;
    }

    return y;
  };
}

function createRegolithTexture(isMars: boolean, anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isMars ? '#8e4526' : '#6c6f75';
    ctx.fillRect(0, 0, size, size);

    const rand = createSeededRandom(isMars ? 'mars-regolith' : 'moon-regolith');

    // Subtle wind ripples on Mars or dust patches on Moon
    for (let i = 0; i < 420; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = isMars ? 18 + rand() * 36 : 8 + rand() * 20;
      const ry = isMars ? 4 + rand() * 8 : rx * (0.7 + rand() * 0.5);
      ctx.fillStyle = isMars
        ? rand() > 0.5
          ? 'rgba(194, 108, 63, 0.14)'
          : 'rgba(92, 40, 20, 0.16)'
        : rand() > 0.5
        ? 'rgba(155, 160, 168, 0.12)'
        : 'rgba(65, 68, 74, 0.14)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, isMars ? 0.25 : rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine mineral & grit speckle
    for (let i = 0; i < 6500; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 0.5 + rand() * 1.8;
      const light = rand();
      if (isMars) {
        ctx.fillStyle =
          light > 0.65
            ? 'rgba(218, 138, 86, 0.28)'
            : light < 0.3
            ? 'rgba(62, 27, 14, 0.32)'
            : 'rgba(150, 74, 42, 0.24)';
      } else {
        ctx.fillStyle =
          light > 0.65
            ? 'rgba(205, 210, 218, 0.24)'
            : light < 0.3
            ? 'rgba(42, 45, 50, 0.28)'
            : 'rgba(120, 124, 130, 0.22)';
      }
      ctx.fillRect(x, y, r, r);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = anisotropy;
  return tex;
}

function createFootprintTexture(isMars: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 128);
    ctx.fillStyle = isMars ? 'rgba(62, 26, 12, 0.55)' : 'rgba(32, 35, 40, 0.58)';
    ctx.beginPath();
    ctx.ellipse(32, 64, 18, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boot tread bars
    ctx.fillStyle = isMars ? 'rgba(42, 16, 6, 0.7)' : 'rgba(18, 20, 24, 0.72)';
    for (let y = 30; y <= 98; y += 11) {
      ctx.fillRect(18, y, 28, 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

function buildProceduralSpacecraft(artifact: Artifact): {
  craftGroup: THREE.Group;
  companionGroup: THREE.Group;
  targetScale: number;
  craftRadius: number;
} {
  const craftGroup = new THREE.Group();
  const companionGroup = new THREE.Group();

  const goldKaptonMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.88,
    roughness: 0.25,
  });
  const silverAluminumMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    metalness: 0.84,
    roughness: 0.34,
  });
  const darkSolarCellMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.18,
  });
  const blackCompositeMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.35,
    roughness: 0.72,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.28,
  });
  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.15,
    roughness: 0.55,
  });
  const lensCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
  });

  const id = artifact.id;
  let targetScale = 3.6;
  let craftRadius = 3.2;

  if (artifact.category === 'apollo_crewed') {
    targetScale = 5.4;
    craftRadius = 3.8;

    // Octagonal Descent Stage sitting on 4 splayed legs (footpads at y = 0)
    const octGeo = new THREE.CylinderGeometry(1.75, 1.75, 1.35, 8);
    const octMesh = new THREE.Mesh(octGeo, goldKaptonMat);
    octMesh.position.y = 1.65;
    craftGroup.add(octMesh);

    // Top deck thermal shield & ascent ring
    const deckGeo = new THREE.CylinderGeometry(1.55, 1.72, 0.18, 8);
    const deck = new THREE.Mesh(deckGeo, silverAluminumMat);
    deck.position.y = 2.4;
    craftGroup.add(deck);

    const ringGeo = new THREE.TorusGeometry(0.92, 0.08, 12, 32);
    const ring = new THREE.Mesh(ringGeo, silverAluminumMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.54;
    craftGroup.add(ring);

    // Descent Engine Bell
    const engineGeo = new THREE.ConeGeometry(0.82, 1.15, 24, 1, true);
    const engine = new THREE.Mesh(engineGeo, blackCompositeMat);
    engine.position.y = 0.85;
    craftGroup.add(engine);

    // 4 Outrigger Legs + Footpads
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

      // Primary vertical-angled strut
      const pTop = new THREE.Vector3(tx, 2.05, tz);
      const pBot = new THREE.Vector3(fx, 0.14, fz);
      const dir = new THREE.Vector3().subVectors(pBot, pTop);
      const len = dir.length();
      const strutGeo = new THREE.CylinderGeometry(0.065, 0.065, len, 10);
      const strut = new THREE.Mesh(strutGeo, goldKaptonMat);
      strut.position.copy(pTop).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      craftGroup.add(strut);

      // Horizontal brace strut
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

      // Circular lunar footpad
      const padGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.09, 18);
      const pad = new THREE.Mesh(padGeo, goldKaptonMat);
      pad.position.set(fx, 0.045, fz);
      craftGroup.add(pad);

      // Ladder & Lunar Plaque on forward leg (idx === 0)
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

    // Companion surface artifacts placed safely at ~5m from center
    if (id === 'apollo-11-eagle-easep') {
      // Lunar Flag Assembly
      const flagGroup = new THREE.Group();
      flagGroup.position.set(5.2, 0, 3.6);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8),
        silverAluminumMat
      );
      pole.position.y = 1.1;
      const crossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.15, 8),
        silverAluminumMat
      );
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0.57, 2.16, 0);
      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.68, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.8 })
      );
      banner.position.set(0.57, 1.82, 0);
      const canton = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.36, 0.026),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.8 })
      );
      canton.position.set(0.25, 1.98, 0);
      flagGroup.add(pole, crossbar, banner, canton);
      companionGroup.add(flagGroup);

      // EASEP Laser Ranging Retroreflector (LRRR)
      const lrrrGroup = new THREE.Group();
      lrrrGroup.position.set(-4.6, 0, 4.2);
      const lrrrStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.32, 0.35, 8),
        silverAluminumMat
      );
      lrrrStand.position.y = 0.175;
      const lrrrArray = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.08, 0.45),
        lensCyanMat
      );
      lrrrArray.position.y = 0.42;
      lrrrArray.rotation.x = -0.45;
      lrrrGroup.add(lrrrStand, lrrrArray);
      companionGroup.add(lrrrGroup);
    } else if (id === 'apollo-15-falcon-lrv-alsep') {
      // LRV-1 Electric Moon Buggy parked 5.2m away
      const lrv = new THREE.Group();
      lrv.position.set(5.4, 0, 2.8);
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
      companionGroup.add(lrv);
    } else {
      // Apollo 12 ALSEP Station
      const alsep = new THREE.Group();
      alsep.position.set(-5.0, 0, 3.2);
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
      companionGroup.add(alsep);
    }
  } else if (id.includes('ingenuity')) {
    // --- INGENUITY MARS HELICOPTER ---
    targetScale = 2.0;
    craftRadius = 2.0;

    // Fuselage Electronics Cube
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.38), goldKaptonMat);
    body.position.y = 0.58;
    craftGroup.add(body);

    // Central Rotor Mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.04, 0.72, 12),
      blackCompositeMat
    );
    mast.position.y = 0.96;
    craftGroup.add(mast);

    // Dual Counter-Rotating Carbon-Fiber Rotors (1.2m span)
    const bladeGeo = new THREE.BoxGeometry(1.65, 0.018, 0.11);
    const bladeTop = new THREE.Mesh(bladeGeo, blackCompositeMat);
    bladeTop.position.y = 1.24;
    bladeTop.rotation.y = 0.35;
    const bladeBot = new THREE.Mesh(bladeGeo, blackCompositeMat);
    bladeBot.position.y = 1.12;
    bladeBot.rotation.y = 1.9;
    craftGroup.add(bladeTop, bladeBot);

    // Top Square Solar Panel above rotors
    const solar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.42), darkSolarCellMat);
    solar.position.y = 1.35;
    craftGroup.add(solar);

    // 4 Splayed Carbon-Fiber Landing Legs
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
    // --- MARS PATHFINDER PETAL LANDER & SOJOURNER ROVER ---
    targetScale = 3.2;
    craftRadius = 3.2;

    // Central triangular deck + 3 opened triangular solar petals
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

    // Electronics prism + IMP Camera Mast + Dish
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

    // Companion: Sojourner Rover standing on Martian dirt nearby!
    const sojourner = new THREE.Group();
    sojourner.position.set(3.4, 0, 2.3);
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
    companionGroup.add(sojourner);
  } else if (artifact.category === 'rover') {
    // --- MARS EXPLORATION ROVER (SPIRIT & OPPORTUNITY) ---
    targetScale = 3.0;
    craftRadius = 2.8;

    // 6 Wheels resting at y = 0 (wheel radius = 0.22)
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

    // Warm Electronics Box
    const web = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.52, 0.95), goldKaptonMat);
    web.position.y = 0.85;
    craftGroup.add(web);

    // Solar Array Wings
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.55), darkSolarCellMat);
    wing.position.y = 1.13;
    const divider = new THREE.Mesh(
      new THREE.BoxGeometry(2.32, 0.06, 0.04),
      silverAluminumMat
    );
    divider.position.y = 1.14;
    craftGroup.add(wing, divider);

    // Pancam Mast & Stereo Head
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

    // High-Gain Dish
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
      silverAluminumMat
    );
    dish.position.set(-0.55, 1.42, -0.25);
    dish.rotation.x = -Math.PI / 4;
    craftGroup.add(dish);
  } else {
    // --- UNCREWED LANDERS (Surveyor 3, Viking 1, Phoenix, InSight) ---
    targetScale = 3.4;
    craftRadius = 3.0;

    const isSurveyor = id === 'surveyor-3';
    const isViking = id === 'viking-1-lander';

    // Main Deck
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(isSurveyor ? 0.95 : 1.15, 1.25, 0.65, 6),
      isSurveyor ? whiteThermalMat : isViking ? whiteThermalMat : goldKaptonMat
    );
    body.position.y = 1.05;
    craftGroup.add(body);

    // 3 Tripod Landing Legs & Footpads
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
      // Mast + Top Solar Panel + High-Gain Planar Array + TV Camera
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
      // Twin RTG Nuclear Covers + High-Gain Dish + Dual Camera Turrets
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
      // Phoenix / InSight Twin Decagonal Solar Arrays
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

      // InSight SEIS Seismometer Dome placed on Martian dirt beside lander
      if (id === 'insight-lander') {
        const seis = new THREE.Group();
        seis.position.set(2.9, 0, 2.2);
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
        companionGroup.add(seis);
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

  return { craftGroup, companionGroup, targetScale, craftRadius };
}

function formatOffsetCoords(baseLat: number, baseLon: number, xMeters: number, zMeters: number) {
  const radiusKm = 1737.4; // Moon approx scale; Mars 3389.5 — visually responsive telemetry delta
  const degPerMeter = 180 / (Math.PI * radiusKm * 1000);
  const lat = baseLat - zMeters * degPerMeter * 15;
  const lon = baseLon + xMeters * degPerMeter * 15;
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

export const SurfaceExplorerGame: React.FC<SurfaceExplorerGameProps> = ({
  artifact,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isMars = artifact.body === 'mars';

  const [isEntered, setIsEntered] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isNearCraft, setIsNearCraft] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number>(14);
  const [hudCoords, setHudCoords] = useState<string>(
    formatOffsetCoords(artifact.coordinates.lat, artifact.coordinates.lon, 9, 11)
  );
  const [modelSourceLabel, setModelSourceLabel] = useState<'CAD' | 'NASA GLB'>('CAD');

  const isEnteredRef = useRef(isEntered);
  isEnteredRef.current = isEntered;
  const showInfoRef = useRef(showInfoPopup);
  showInfoRef.current = showInfoPopup;
  const userDismissedProximityRef = useRef(false);

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
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isMars ? 1.08 : 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. SCENE & ENVIRONMENT
    const scene = new THREE.Scene();
    if (isMars) {
      scene.background = new THREE.Color(0xc27d56);
      scene.fog = new THREE.FogExp2(0x9e5936, 0.011);
    } else {
      scene.background = new THREE.Color(0x000000);
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3. CAMERA
    const camera = new THREE.PerspectiveCamera(
      70,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.1,
      450
    );
    camera.rotation.order = 'YXZ';

    // 4. LIGHTING & SKY
    const sunDir = new THREE.Vector3(48, isMars ? 34 : 26, -38);
    const sunLight = new THREE.DirectionalLight(
      isMars ? 0xffdfc2 : 0xfff8ee,
      isMars ? 2.5 : 3.2
    );
    sunLight.position.copy(sunDir);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 160;
      const d = 28;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.03;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(
      isMars ? 0xc27d56 : 0x263449,
      isMars ? 0x8c4a27 : 0x1e2229,
      isMars ? 0.95 : 0.32
    );
    scene.add(hemiLight);

    // Sky Elements (Sun, Earth for Moon, Stars for Moon, Hazy Dome for Mars)
    const skyGeometries: THREE.BufferGeometry[] = [];
    const skyMaterials: THREE.Material[] = [];

    if (!isMars) {
      // Starfield
      const starCount = 1800;
      const starPos = new Float32Array(starCount * 3);
      const starCol = new Float32Array(starCount * 3);
      const randStar = createSeededRandom('lunar-stars');
      for (let i = 0; i < starCount; i++) {
        const theta = randStar() * Math.PI * 2;
        const phi = Math.acos(randStar() * 0.96 + 0.02); // Above horizon
        const r = 260;
        starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPos[i * 3 + 1] = r * Math.cos(phi);
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        const tint = 0.78 + randStar() * 0.22;
        starCol[i * 3] = tint;
        starCol[i * 3 + 1] = tint;
        starCol[i * 3 + 2] = Math.min(1, tint + randStar() * 0.12);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
      const starMat = new THREE.PointsMaterial({
        size: 1.35,
        vertexColors: true,
        sizeAttenuation: false,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);
      skyGeometries.push(starGeo);
      skyMaterials.push(starMat);

      // Glowing Blue Earth in Lunar Sky
      const earthGeo = new THREE.SphereGeometry(5.5, 24, 24);
      const earthMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      earth.position.set(-72, 68, -110);
      scene.add(earth);
      skyGeometries.push(earthGeo);
      skyMaterials.push(earthMat);
    } else {
      // Warm Butterscotch-to-Rust Sky Dome for Mars
      const domeGeo = new THREE.SphereGeometry(280, 24, 16);
      const domeMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
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
      const dome = new THREE.Mesh(domeGeo, domeMat);
      scene.add(dome);
      skyGeometries.push(domeGeo);
      skyMaterials.push(domeMat);
    }

    // Sun Disc
    const sunDiscGeo = new THREE.SphereGeometry(isMars ? 2.8 : 4.2, 16, 16);
    const sunDiscMat = new THREE.MeshBasicMaterial({
      color: isMars ? 0xffe4c4 : 0xffffff,
      fog: false,
    });
    const sunDisc = new THREE.Mesh(sunDiscGeo, sunDiscMat);
    sunDisc.position.copy(sunDir).normalize().multiplyScalar(220);
    scene.add(sunDisc);
    skyGeometries.push(sunDiscGeo);
    skyMaterials.push(sunDiscMat);

    // 5. TERRAIN & ROCKS
    const craters = buildCraters(artifact.id);
    const sampleH = createHeightSampler(craters, isMars);
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const regolithTex = createRegolithTexture(isMars, maxAnisotropy);

    const terrainSize = 260;
    const terrainSegs = 128;
    const terrainGeo = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      terrainSegs,
      terrainSegs
    );
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
      roughness: isMars ? 0.94 : 0.96,
      metalness: 0.03,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Instanced Surface Boulders & Pebbles
    const rockCount = 260;
    const rockGeo = new THREE.DodecahedronGeometry(0.45, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: isMars ? 0x6c3520 : 0x5c6068,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: true,
    });
    const rockInstances = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockInstances.castShadow = !isSoftwareGl;
    rockInstances.receiveShadow = true;

    const randRock = createSeededRandom(artifact.id + '-rocks');
    const rockDummy = new THREE.Object3D();
    for (let i = 0; i < rockCount; i++) {
      const angle = randRock() * Math.PI * 2;
      const dist = 7.5 + randRock() * 105;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const ry = sampleH(rx, rz);
      const s = 0.25 + Math.pow(randRock(), 2.2) * 2.1;
      rockDummy.position.set(rx, ry + s * 0.12, rz);
      rockDummy.rotation.set(randRock() * Math.PI, randRock() * Math.PI, randRock() * Math.PI);
      rockDummy.scale.set(
        s * (0.8 + randRock() * 0.6),
        s * (0.55 + randRock() * 0.55),
        s * (0.8 + randRock() * 0.6)
      );
      rockDummy.updateMatrix();
      rockInstances.setMatrixAt(i, rockDummy.matrix);
    }
    rockInstances.instanceMatrix.needsUpdate = true;
    rockInstances.computeBoundingSphere();
    scene.add(rockInstances);

    // 6. SPACECRAFT & COMPANION ARTIFACTS AT (0, H(0,0), 0)
    const siteAnchor = new THREE.Group();
    const centerGroundY = sampleH(0, 0);
    siteAnchor.position.set(0, centerGroundY, 0);
    scene.add(siteAnchor);

    const { craftGroup, companionGroup, targetScale, craftRadius } =
      buildProceduralSpacecraft(artifact);
    siteAnchor.add(craftGroup);

    // Seat companion props at their actual terrain height
    companionGroup.children.forEach((prop) => {
      prop.position.y = sampleH(prop.position.x, prop.position.z) - centerGroundY;
    });
    siteAnchor.add(companionGroup);

    // Asynchronously load local/NASA 3D GLB model if configured
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
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1.0;
          const scale = targetScale / maxDim;

          loaded.scale.setScalar(scale);
          loaded.position.set(
            -center.x * scale,
            -box.min.y * scale,
            -center.z * scale
          );

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
                  if (m instanceof THREE.MeshStandardMaterial) {
                    m.envMapIntensity = 1.1;
                  }
                });
              }
            }
          });

          // Remove procedural fallback and swap in loaded GLB
          siteAnchor.remove(craftGroup);
          disposeObject3D(craftGroup);
          siteAnchor.add(loaded);
          gltfRoot = loaded;
          setModelSourceLabel('NASA GLB');
          dracoLoader.dispose();
        })
        .catch(() => {
          dracoLoader.dispose();
        });
    }

    // 7. FOOTPRINTS TRAIL (Instanced decals left while walking)
    const footprintTex = createFootprintTexture(isMars);
    const maxPrints = 70;
    const printGeo = new THREE.PlaneGeometry(0.18, 0.34);
    printGeo.rotateX(-Math.PI / 2);
    const printMat = new THREE.MeshBasicMaterial({
      map: footprintTex,
      transparent: true,
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
    let lastPrintPos = new THREE.Vector3(9, centerGroundY, 11);

    // 8. PLAYER STATE & INPUTS
    const EYE_HEIGHT = 1.72;
    const WORLD_RADIUS = 115;
    const PROXIMITY_RADIUS = Math.max(6.8, craftRadius + 3.8);

    const player = {
      pos: new THREE.Vector3(9.5, sampleH(9.5, 11.5), 11.5),
      velY: 0,
      onGround: true,
      yaw: Math.atan2(9.5, 11.5), // Face directly toward (0,0) spacecraft
      pitch: -0.06,
      walkPhase: 0,
    };

    const keys: Record<string, boolean> = {};
    let isDraggingLook = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'KeyE' && isEnteredRef.current) {
        const dist = Math.hypot(player.pos.x, player.pos.z);
        if (dist <= PROXIMITY_RADIUS + 4.0) {
          playTelemetryBeep(620);
          setShowInfoPopup((prev) => {
            const next = !prev;
            if (!next) {
              userDismissedProximityRef.current = true;
            } else {
              userDismissedProximityRef.current = false;
            }
            return next;
          });
        }
      }
      if (e.code === 'Space' && isEnteredRef.current && player.onGround) {
        e.preventDefault();
        player.velY = isMars ? 3.2 : 2.85;
        player.onGround = false;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isEnteredRef.current) return;
      if (document.pointerLockElement === renderer.domElement) {
        player.yaw -= e.movementX * 0.0022;
        player.pitch = THREE.MathUtils.clamp(
          player.pitch - e.movementY * 0.0022,
          -Math.PI * 0.46,
          Math.PI * 0.46
        );
      } else if (isDraggingLook) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        player.yaw -= dx * 0.0035;
        player.pitch = THREE.MathUtils.clamp(
          player.pitch - dy * 0.0035,
          -Math.PI * 0.46,
          Math.PI * 0.46
        );
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!isEnteredRef.current) return;
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

    // 9. RESIZE OBSERVER
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
    const forwardVec = new THREE.Vector3();
    const rightVec = new THREE.Vector3();
    const moveVec = new THREE.Vector3();
    const printDummy = new THREE.Object3D();

    let prevNearCraft = false;
    let lastHudUpdate = 0;
    let prevTime = performance.now();

    // Pacing helper for SwiftShader vs hardware
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

      if (isEnteredRef.current) {
        const fwdInput =
          (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
          (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
        const strafeInput =
          (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
          (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

        forwardVec.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        rightVec.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

        moveVec.set(0, 0, 0);
        moveVec.addScaledVector(forwardVec, fwdInput);
        moveVec.addScaledVector(rightVec, strafeInput);

        const isMoving = moveVec.lengthSq() > 0.001;
        if (isMoving) {
          moveVec.normalize();
          const speed =
            keys['ShiftLeft'] || keys['ShiftRight'] ? 4.8 : 2.55;
          player.pos.x += moveVec.x * speed * dt;
          player.pos.z += moveVec.z * speed * dt;
          if (player.onGround) {
            player.walkPhase += speed * dt * 2.8;
          }
        }

        // World boundary clamp
        const radialDist = Math.hypot(player.pos.x, player.pos.z);
        if (radialDist > WORLD_RADIUS) {
          const clampScale = WORLD_RADIUS / radialDist;
          player.pos.x *= clampScale;
          player.pos.z *= clampScale;
        }

        // Spacecraft collision pushout
        const craftDist = Math.hypot(player.pos.x, player.pos.z);
        if (craftDist < craftRadius && craftDist > 0.001) {
          const pushScale = craftRadius / craftDist;
          player.pos.x *= pushScale;
          player.pos.z *= pushScale;
        }

        // Gravity & ground clamping
        const gravity = isMars ? 3.72 : 1.62;
        const groundY = sampleH(player.pos.x, player.pos.z);
        if (!player.onGround || player.velY > 0) {
          player.velY -= gravity * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= groundY) {
            player.pos.y = groundY;
            player.velY = 0;
            player.onGround = true;
          }
        } else {
          player.pos.y = groundY;
        }

        // Leave boot footprints when walking on regolith
        if (isMoving && player.onGround) {
          const stepDist = player.pos.distanceTo(lastPrintPos);
          if (stepDist >= 0.92) {
            lastPrintPos.copy(player.pos);
            printStepSide *= -1;
            const px = player.pos.x + rightVec.x * 0.16 * printStepSide;
            const pz = player.pos.z + rightVec.z * 0.16 * printStepSide;
            printDummy.position.set(px, sampleH(px, pz) + 0.02, pz);
            printDummy.rotation.set(0, player.yaw, 0);
            printDummy.scale.set(1, 1, 1);
            printDummy.updateMatrix();
            footprintMesh.setMatrixAt(printCursor, printDummy.matrix);
            footprintMesh.instanceMatrix.needsUpdate = true;
            printCursor = (printCursor + 1) % maxPrints;
          }
        }

        // Proximity detection
        const distFromCraft = Math.hypot(player.pos.x, player.pos.z);
        const nearNow = distFromCraft <= PROXIMITY_RADIUS;
        if (nearNow && !prevNearCraft) {
          setIsNearCraft(true);
          if (!userDismissedProximityRef.current) {
            setShowInfoPopup(true);
            playSuccessChime();
          }
        } else if (!nearNow && prevNearCraft) {
          setIsNearCraft(false);
          setShowInfoPopup(false);
          userDismissedProximityRef.current = false;
        }
        prevNearCraft = nearNow;

        if (now - lastHudUpdate > 120) {
          lastHudUpdate = now;
          setDistanceMeters(Math.max(0, Math.round(distFromCraft - craftRadius * 0.6)));
          setHudCoords(
            formatOffsetCoords(
              artifact.coordinates.lat,
              artifact.coordinates.lon,
              player.pos.x,
              player.pos.z
            )
          );
        }
      }

      const bobOffset =
        player.onGround && isEnteredRef.current
          ? Math.sin(player.walkPhase) * 0.042
          : 0;
      camera.position.set(
        player.pos.x,
        player.pos.y + EYE_HEIGHT + bobOffset,
        player.pos.z
      );
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;

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
      footprintTex.dispose();
      skyGeometries.forEach((g) => g.dispose());
      skyMaterials.forEach((m) => m.dispose());
      envRT.dispose();
      scene.clear();
      renderer.dispose();
    };
  }, [artifact, isMars]);

  const handleEnterSurface = useCallback(() => {
    playTelemetryBeep(640);
    setIsEntered(true);
    const canvas = mountRef.current?.querySelector('canvas');
    canvas?.requestPointerLock?.();
  }, []);

  const surfaceDescription =
    artifact.firstPersonMonologue ||
    artifact.story?.introduction ||
    artifact.storytellingHook;

  // Theme tokens matching the app's Moon (#1C1D21 / #27282D / #BAE6FD) and Mars (#1C140F / #291D16 / #57534E / #D97706 / #F5E6D3) palettes
  const panelBgClass = isMars
    ? 'bg-[rgba(28,20,15,0.93)] border border-[#57534E] text-[#F5E6D3] shadow-[0_12px_32px_rgba(0,0,0,0.55)]'
    : 'bg-[rgba(28,29,33,0.94)] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none';
  const headerBarClass = isMars
    ? 'bg-[#291D16] border-b border-[#44403C]'
    : 'bg-[#27282D] border-b border-[#3F3F46]';
  const dividerClass = isMars ? 'border-[#44403C]' : 'border-[#3F3F46]';
  const accentTextClass = isMars ? 'text-[#D97706]' : 'text-[#BAE6FD]';
  const mutedTextClass = isMars ? 'text-[#A8A29E]' : 'text-[#A1A1AA]';
  const badgeClass = isMars
    ? 'bg-[#F5E6D3] text-[#1C140F] border-[#F5E6D3]'
    : 'bg-[#BAE6FD] text-[#1C1D21] border-[#BAE6FD]';
  const buttonActionClass = isMars
    ? 'bg-[#F5E6D3] hover:bg-[#D97706] text-[#1C140F] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
    : 'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#1C1D21] shadow-none';

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-black select-none">
      {/* Dedicated Three.js Canvas Mount (no React children, no backdrop-blur over WebGL) */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        aria-label={`3D surface exploration of ${artifact.name}`}
      />

      {/* Top-Left: Exit Surface / Return to Orbit */}
      <div className="absolute top-3 left-2 sm:top-4 sm:left-4 z-30 pointer-events-auto">
        <button
          onClick={handleExit}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-mono font-black flex items-center gap-2 active:translate-y-0.5 transition-all ${
            isMars
              ? 'bg-[rgba(28,20,15,0.90)] hover:bg-[#291D16] border border-[#57534E] hover:border-[#D97706] text-[#F5E6D3] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
              : 'bg-[rgba(28,29,33,0.94)] hover:bg-[#2A2C32] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none'
          }`}
        >
          <ArrowLeft className={`w-4 h-4 ${accentTextClass}`} />
          <span>Exit Surface / Return to Orbit</span>
        </button>
      </div>

      {/* Top-Right: Surface Telemetry HUD */}
      {isEntered && (
        <div
          className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none rounded-xl px-3.5 py-2.5 max-w-[270px] ${panelBgClass}`}
        >
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-widest mb-1">
            <span className={`font-bold flex items-center gap-1.5 ${accentTextClass}`}>
              <Compass className="w-3.5 h-3.5" />
              {isMars ? 'Mars Surface' : 'Lunar Surface'}
            </span>
            <span className={mutedTextClass}>{modelSourceLabel}</span>
          </div>
          <div className="text-xs sm:text-sm font-bold truncate text-[#FFFFFF]">
            {artifact.moniker} ({artifact.year})
          </div>
          <div className={`text-[11px] font-mono tabular-nums mt-0.5 ${mutedTextClass}`}>
            {hudCoords}
          </div>
          <div className={`mt-1.5 pt-1.5 border-t ${dividerClass} flex items-center justify-between text-[11px] font-mono`}>
            <span className={mutedTextClass}>
              Gravity: {isMars ? '3.72 m/s²' : '1.62 m/s²'}
            </span>
            <span className={`font-bold tabular-nums ${accentTextClass}`}>
              {distanceMeters === 0 ? 'AT SITE' : `${distanceMeters}m away`}
            </span>
          </div>
        </div>
      )}

      {/* Center Reticle (Visible once entered) */}
      {isEntered && !showInfoPopup && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex flex-col items-center">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isNearCraft
                  ? isMars
                    ? 'border-[#D97706]'
                    : 'border-[#BAE6FD]'
                  : 'border-white/50'
              }`}
            >
              <div
                className={`w-1 h-1 rounded-full ${
                  isNearCraft
                    ? isMars
                      ? 'bg-[#D97706]'
                      : 'bg-[#BAE6FD]'
                    : 'bg-white/80'
                }`}
              />
            </div>
            {isNearCraft && (
              <div
                className={`mt-3 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-wide ${panelBgClass}`}
              >
                Press <span className={accentTextClass}>[E]</span> to read site plaque
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proximity Info Popup (Triggered automatically near spacecraft or via [E]) */}
      {isEntered && showInfoPopup && (
        <div className="absolute inset-x-4 bottom-20 sm:bottom-24 z-30 flex justify-center pointer-events-none">
          <div
            className={`pointer-events-auto w-full max-w-xl rounded-2xl overflow-hidden ${panelBgClass}`}
          >
            <div className={`px-4 sm:px-5 py-3 flex items-start justify-between gap-3 ${headerBarClass}`}>
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest ${accentTextClass}`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Proximity Scan · {artifact.year} · {artifact.agency}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight mt-0.5 leading-snug text-[#FFFFFF]">
                  {artifact.name}
                </h2>
                <div className={`text-[11px] font-mono mt-0.5 ${mutedTextClass}`}>
                  {artifact.locationName}
                </div>
              </div>
              <button
                onClick={() => {
                  playTelemetryBeep(480);
                  userDismissedProximityRef.current = true;
                  setShowInfoPopup(false);
                }}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  isMars
                    ? 'bg-[#1C140F] border-[#44403C] hover:border-[#D97706] text-[#A8A29E] hover:text-[#F5E6D3]'
                    : 'bg-[#1C1D21] border-[#52525B] hover:border-[#BAE6FD] text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
                aria-label="Dismiss surface info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm leading-relaxed max-h-44 overflow-y-auto pr-1">
                {surfaceDescription}
              </p>

              <div className={`mt-3 pt-2.5 border-t ${dividerClass} flex items-center justify-between gap-2 text-[11px] font-mono`}>
                <span className={mutedTextClass}>
                  Press <span className={`font-bold ${accentTextClass}`}>[E]</span> to toggle
                </span>
                <button
                  onClick={() => {
                    playTelemetryBeep(520);
                    userDismissedProximityRef.current = true;
                    setShowInfoPopup(false);
                    const canvas = mountRef.current?.querySelector('canvas');
                    canvas?.requestPointerLock?.();
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${buttonActionClass}`}
                >
                  Continue Exploring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Hint Bar */}
      {isEntered && (
        <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-mono flex flex-wrap items-center justify-center gap-x-4 gap-y-1 ${panelBgClass}`}
          >
            <span>
              <strong className={accentTextClass}>WASD / Arrows</strong> Move
            </span>
            <span>
              <strong className={accentTextClass}>
                {isPointerLocked ? 'Mouse' : 'Click or Drag'}
              </strong>{' '}
              Look
            </span>
            <span>
              <strong className={accentTextClass}>Shift</strong> Run
            </span>
            <span>
              <strong className={accentTextClass}>Space</strong> Jump
            </span>
            <span>
              <strong className={accentTextClass}>E</strong> Toggle Info
            </span>
          </div>
        </div>
      )}

      {/* Initial Landing Briefing Overlay (Click gives user gesture for pointer lock) */}
      {!isEntered && (
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center p-4 ${
            isMars ? 'bg-[#1C140F]/65' : 'bg-[#090A0D]/65'
          }`}
        >
          <div
            className={`w-full max-w-md rounded-3xl overflow-hidden ${
              isMars
                ? 'bg-[#291D16] border border-[#57534E] text-[#F5E6D3] shadow-[0_16px_48px_rgba(0,0,0,0.65)]'
                : 'bg-[#1C1D21] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none'
            }`}
          >
            <div className={`px-6 py-4 flex items-center justify-between gap-2 ${
              isMars
                ? 'bg-[#1C140F] border-b border-[#44403C]'
                : 'bg-[#27282D] border-b border-[#3F3F46]'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badgeClass}`}>
                  {isMars ? 'MARS EVA' : 'LUNAR EVA'}
                </span>
                <span className={`text-xs font-mono ${mutedTextClass}`}>
                  {artifact.year} • {artifact.agency}
                </span>
              </div>
              <Footprints className={`w-4 h-4 ${accentTextClass}`} />
            </div>

            <div className="p-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FFFFFF]">
                {artifact.name}
              </h2>
              <p className={`text-xs font-mono mt-1 ${mutedTextClass}`}>
                {artifact.locationName}
              </p>
              <p className={`text-xs font-mono mt-0.5 ${accentTextClass}`}>
                {artifact.coordinates.display}
              </p>

              <p className="text-sm mt-4 leading-relaxed">
                Walk across the {isMars ? 'Martian regolith' : 'lunar regolith'} to inspect the
                landing site. Approach the spacecraft to trigger its surface log.
              </p>

              <div
                className={`mt-4 p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 ${
                  isMars
                    ? 'bg-[#1C140F] border-[#44403C]'
                    : 'bg-[#27282D] border-[#3F3F46]'
                }`}
              >
                <div>
                  <strong className={accentTextClass}>WASD / Arrow Keys:</strong> Walk across site
                </div>
                <div>
                  <strong className={accentTextClass}>Mouse / Drag:</strong> Look around
                </div>
                <div>
                  <strong className={accentTextClass}>Shift / Space / E:</strong> Run, Jump, Toggle Info
                </div>
              </div>

              <button
                onClick={handleEnterSurface}
                className={`mt-5 w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${buttonActionClass}`}
              >
                <MousePointerClick className="w-4 h-4" />
                <span>Walk the Site</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
