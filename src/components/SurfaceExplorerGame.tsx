import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Artifact } from '../types/space';
import {
  ArrowLeft,
  Compass,
  Info,
  X,
  Footprints,
  MousePointerClick,
  Flashlight,
  FlashlightOff,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { playTelemetryBeep, playSuccessChime, playRadarPing } from '../utils/audio';
import {
  DRACO_DECODER_CDN_URL,
  getSpacecraftModelAsset,
  loadValidatedGltf,
} from '../utils/spacecraft-models';

export interface SurfaceExplorerGameProps {
  artifact: Artifact;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// DATA STRUCTURES FOR POINT-AND-INSPECT SYSTEM
// ---------------------------------------------------------------------------
export interface CraftPartDef {
  id: string;
  name: string;
  text: string;
  why: string;
  status?: string;
  seen?: boolean;
}

export interface SiteItemDef {
  id: string;
  name: string;
  group: THREE.Group;
  radius: number;
  center: THREE.Vector3;
  text: string;
  why?: string;
  status: string;
  seen: boolean;
  mesh?: THREE.Mesh | null;
}

export interface InspectableTarget {
  type: 'craft_part' | 'site_item';
  id: string;
  name: string;
  text: string;
  why?: string;
  status?: string;
  mesh?: THREE.Mesh | null;
}

interface CraftBounds {
  minY: number;
  height: number;
  cx: number;
  cz: number;
  width: number;
  radius: number;
}

// ---------------------------------------------------------------------------
// 1. COMPONENT REGISTRIES ACROSS ALL 10 MOON & MARS ARTIFACTS
// ---------------------------------------------------------------------------
function getCraftParts(artifact: Artifact): Record<string, CraftPartDef> {
  const id = artifact.id;

  // Apollo Lunar Modules (Eagle, Intrepid, Falcon)
  if (artifact.category === 'apollo_crewed') {
    const isFalcon = id === 'apollo-15-falcon-lrv-alsep';
    const isIntrepid = id === 'apollo-12-intrepid-alsep';
    const nameStr = isFalcon ? 'Falcon' : isIntrepid ? 'Intrepid' : 'Eagle';

    return {
      dps: {
        id: 'dps',
        name: 'Descent engine & crushable nozzle skirt',
        text: `The throttleable rocket engine that slowed ${nameStr} down for a gentle touchdown on the lunar regolith. The bottom bell nozzle was designed to crumple upon contact with the ground so it wouldn't fracture the descent stage.`,
        why: isFalcon
          ? "Why it's cool: extended 10 inches longer than Apollo 11's nozzle to carry the heavy 16-ton J-mission payload and the electric Lunar Roving Vehicle."
          : isIntrepid
          ? "Why it's cool: allowed Pete Conrad to throttle down and hover over Surveyor Crater, executing history's first pinpoint planetary landing."
          : "Why it's cool: because engine power could be throttled continuously, Neil Armstrong steered past West Crater's dangerous boulder field.",
      },
      probe: {
        id: 'probe',
        name: 'Lunar surface contact sensing probe',
        text: `A 5.6-foot (1.7 m) thin sensor wand extending below the footpads. When its tip touched the lunar soil, a blue indicator light lit up on the instrument panel.`,
        why: "Why it's cool: blowing lunar dust completely obscured downward visibility in the final 50 feet; this probe told the crew the instant touchdown occurred.",
      },
      pad: {
        id: 'pad',
        name: 'Landing gear footpad',
        text: `Each of the four feet is a wide 37-inch dish made of spun aluminum honeycomb wrapped in gold Kapton foil to spread the lander's weight like a snowshoe.`,
        why: "Why it's cool: engineers had feared the Moon might be covered in deep quicksand-like dust; these wide footpads sank only 2–3 inches into the soil.",
      },
      gear: {
        id: 'gear',
        name: 'Landing gear leg and crush struts',
        text: `Cantilever landing gear containing crushable aluminum honeycomb cartridges inside the primary struts that permanently absorb touchdown impact energy.`,
        why: isFalcon
          ? "Why it's cool: Falcon landed on an 11-degree crater slope—the steepest touchdown angle of any Apollo mission—and the crush struts held firm."
          : "Why it's cool: purely mechanical crush struts eliminated the need for complex hydraulics, leaving zero parts that could freeze or jam in the vacuum.",
      },
      dstage: {
        id: 'dstage',
        name: 'Descent stage thermal foil & equipment bays',
        text: `The octagonal lower stage housing hypergolic propellant tanks and scientific equipment, wrapped in 25 layers of aluminized Mylar and gold Kapton foil.`,
        why: isFalcon
          ? "Why it's cool: Quadrant 1 housed the folded Lunar Roving Vehicle, while the science bay held the Apollo 15 nuclear ALSEP station."
          : "Why it's cool: thin, reflective foil reflects intense solar radiation into the dark void, keeping onboard electronics cool without air conditioning.",
      },
      interface: {
        id: 'interface',
        name: 'Ascent / descent stage separation interface',
        text: `Four explosive interstage nuts and a mechanical guillotine that severed all electrical cabling and coolant lines the instant the upper stage ignited.`,
        why: "Why it's cool: once separated, the bottom half served as a stationary launch pad, remaining permanently on the Moon while the upper stage blasted home.",
      },
      rcs: {
        id: 'rcs',
        name: 'Reaction control thruster quads',
        text: `Four clusters of four 100-pound-thrust hypergolic thrusters providing 3-axis attitude control, pitch, yaw, roll, and translation.`,
        why: "Why it's cool: firing in precise millisecond bursts, these thrusters allowed the pilot to pivot the spacecraft with surgical precision.",
      },
      dock: {
        id: 'dock',
        name: 'Overhead docking hatch and tunnel',
        text: `A 32-inch circular forward hatch and drogue docking collar atop the ascent stage, providing a pressurized transfer tunnel into the Command Module.`,
        why: "Why it's cool: enabled the transfer of astronauts and lunar rock boxes without requiring a spacewalk in lunar orbit.",
      },
      dish: {
        id: 'dish',
        name: 'S-band steerable antenna & rendezvous radar',
        text: `The 26-inch high-gain parabolic steerable dish transmitting telemetry, voice, and television to Earth, paired with the rendezvous radar dish.`,
        why: isFalcon
          ? "Why it's cool: transmitted television and voice when Dave Scott dropped a hammer and feather to prove Galileo's gravity law."
          : "Why it's cool: radar data during Eagle's descent triggered the famous 1202 alarms; software priority scheduling kept the AGC guidance computer flying.",
      },
      vhf: {
        id: 'vhf',
        name: 'VHF communication antenna',
        text: `Omnidirectional whip antennas providing line-of-sight voice and biometric telemetry relay between the astronauts' backpacks and Earth.`,
        why: "Why it's cool: turned the Lunar Module into a lunar radio relay tower so astronauts could speak freely to Houston from hundreds of meters away.",
      },
      cabin: {
        id: 'cabin',
        name: 'Ascent stage crew cabin',
        text: `The cramped, triangular-windowed pressurized flight cabin where the two astronauts stood without seats during landing and surface stays.`,
        why: isIntrepid
          ? "Why it's cool: Pete Conrad and Alan Bean slept in hammocks slung across the tiny cabin between their two moonwalks."
          : "Why it's cool: when an engine circuit breaker broke on Apollo 11, Buzz Aldrin jammed a felt-tip pen into the switch to arm the ascent engine and save the crew.",
      },
    };
  }

  // Surveyor 3
  if (id === 'surveyor-3') {
    return {
      cam: {
        id: 'cam',
        name: 'Surveillance TV camera & steerable mirror',
        text: 'A variable focal length camera (25mm and 100mm lenses) beneath an azimuth-elevation steerable mirror that sent back 6,326 television pictures.',
        why: "Why it's cool: Apollo 12 astronauts Pete Conrad and Alan Bean unbolted this exact camera in November 1969 and brought it home to Earth.",
      },
      scoop: {
        id: 'scoop',
        name: 'Robotic surface sampler claw & arm',
        text: 'An electric motor-driven scoop with a claw capable of extending 5 feet and digging up to 7 inches deep into lunar soil.',
        why: "Why it's cool: dug four trenches and conducted 13 impact tests, proving lunar soil had the firmness of wet sand (~10 psi) to safely support Apollo landers.",
      },
      solar: {
        id: 'solar',
        name: 'Planar solar panel array',
        text: 'A 0.85-square-meter solar panel containing 792 solar cells mounted on a mast above the central electronics compartment.',
        why: "Why it's cool: generated 89 watts of electrical power to charge the silver-zinc battery during the two-week lunar daylight.",
      },
      pad: {
        id: 'pad',
        name: 'Aluminum honeycomb landing footpad',
        text: 'Three crushable footpads made of aluminum honeycomb to dampen touchdown impact.',
        why: "Why it's cool: highly reflective lunar rocks confused its radar, causing the vernier engines to keep firing and making Surveyor 3 bounce twice—once 10 meters into the air!",
      },
      leg: {
        id: 'leg',
        name: 'Tubular aluminum tripod landing leg',
        text: 'Hollow tubular aluminum tripod struts with hydraulic shock absorber dampers.',
        why: "Why it's cool: kept the spacecraft upright inside a 14-degree crater slope in Oceanus Procellarum.",
      },
      dish: {
        id: 'dish',
        name: 'High-gain planar directional antenna',
        text: 'Directional antenna mounted beside the solar panel aimed back toward Earth.',
        why: "Why it's cool: transmitted television picture frames to Goldstone, California at high scan rates.",
      },
      frame: {
        id: 'frame',
        name: 'Tubular aluminum spaceframe chassis',
        text: 'Open triangular truss structure carrying propellant tanks, helium pressurization sphere, and flight control electronics.',
        why: "Why it's cool: the open frame allowed Apollo 12 astronauts to walk right up and inspect its internal components with wire cutters.",
      },
    };
  }

  // Viking 1 Lander
  if (id === 'viking-1-lander') {
    return {
      rtg: {
        id: 'rtg',
        name: 'SNAP-19 radioisotope thermoelectric generators',
        text: 'Two Plutonium-238 RTGs enclosed in wind screens, producing continuous electrical power and heat.',
        why: "Why it's cool: freed the lander from solar panel dust and winter darkness, keeping Viking 1 alive for over 6 continuous years on Chryse Planitia.",
      },
      dish: {
        id: 'dish',
        name: 'High-gain parabolic S-band antenna dish',
        text: 'A 0.76-meter steerable parabolic antenna communicating directly with NASA Deep Space Network stations on Earth.',
        why: "Why it's cool: a routine software update in November 1982 accidentally overwrote antenna pointing tables, pointing the dish away and ending the mission.",
      },
      bio_lab: {
        id: 'bio_lab',
        name: 'Biology & GCMS chemical laboratory',
        text: 'An automated miniaturized biology lab that tested soil samples for microbial respiration, photosynthesis, and organic carbon molecules.',
        why: "Why it's cool: performed humanity’s first direct search for alien biochemistry on the surface of another planet.",
      },
      scoop: {
        id: 'scoop',
        name: '3-meter robotic surface sampler arm & scoop',
        text: 'A telescoping boom made of two stainless steel tapes formed into a rigid tube, ending in a motorized trenching scoop.',
        why: "Why it's cool: dug multiple trenches through Martian duricrust, dumped soil into onboard chemistry ovens, and pushed rocks aside.",
      },
      cam: {
        id: 'cam',
        name: 'Facsimile color stereo scanning camera',
        text: 'Optical scanner camera utilizing a nodding mirror and photodiode detectors to build up lines of digital imagery.',
        why: "Why it's cool: captured the historic very first color photograph from the surface of Mars on July 20, 1976.",
      },
      descent_engine: {
        id: 'descent_engine',
        name: 'Terminal descent monopropellant engines',
        text: 'Three multi-nozzle hydrazine rocket engines designed to minimize ground disturbance during touchdown.',
        why: "Why it's cool: each engine had 18 small nozzles to disperse exhaust gas and avoid blasting away surface rocks.",
      },
      leg: {
        id: 'leg',
        name: 'Inverted tripod landing leg & footpad',
        text: 'Three aluminum legs with crushable honeycomb shock absorbers and inverted dish footpads.',
        why: "Why it's cool: provided a rock-solid platform that remained stable through fierce Martian dust storms with winds over 70 mph.",
      },
    };
  }

  // Mars Pathfinder & Sojourner
  if (id === 'mars-pathfinder-sojourner') {
    return {
      sojourner_body: {
        id: 'sojourner_body',
        name: 'Sojourner rover chassis & Warm Electronics Box',
        text: 'A 23-pound (10.6 kg) microwave-sized rover carrying navigation computer, radio modems, and three cameras.',
        why: "Why it's cool: the first wheeled vehicle ever driven on another planet, traversing 100 meters around the Ares Vallis landing site.",
      },
      sojourner_wheels: {
        id: 'sojourner_wheels',
        name: '6-wheel rocker-bogie mobility drive',
        text: 'Six independently driven aluminum wheels with stainless-steel cleats mounted on a rocker-bogie articulated suspension.',
        why: "Why it's cool: enabled the tiny rover to climb over obstacles larger than its own wheel diameter without tipping over.",
      },
      sojourner_apxs: {
        id: 'sojourner_apxs',
        name: 'Alpha Proton X-Ray Spectrometer (APXS)',
        text: 'A sensor head deployed on a robotic arm that pressed against Martian rocks to measure elemental chemistry.',
        why: "Why it's cool: analyzed rocks named Barnacle Bill and Yogi, discovering volcanic andesite that proved complex geological evolution.",
      },
      sojourner_solar: {
        id: 'sojourner_solar',
        name: 'Gallium arsenide solar panel array',
        text: 'A flat top array of solar cells providing 16 watts of peak electrical power at midday on Mars.',
        why: "Why it's cool: kept Sojourner working for 83 sols—nearly 12 times longer than its 7-day primary mission design.",
      },
      petals: {
        id: 'petals',
        name: 'Lander triangular solar petals',
        text: 'Three foldable triangular carbon-fiber petals that protected the rover during descent and opened like a flower upon landing.',
        why: "Why it's cool: automatically righted the lander regardless of which side it came to rest on after bouncing inside giant airbags.",
      },
      imp_cam: {
        id: 'imp_cam',
        name: 'Imager for Mars Pathfinder (IMP) stereo camera',
        text: 'A stereo color camera pair mounted on a deployable 2.6-foot mast above the lander base.',
        why: "Why it's cool: returned 16,500 vivid photographs and helped mission controllers on Earth steer Sojourner using 3D stereo glasses.",
      },
      airbags: {
        id: 'airbags',
        name: 'Impact airbag deflation system',
        text: 'Four clusters of 24 interconnected Kevlar airbags that cushioned touchdown at 31 mph, bouncing 15 times up to 50 feet high.',
        why: "Why it's cool: revolutionized planetary exploration by eliminating heavy landing legs and thrusters, cutting mission costs dramatically.",
      },
      lander_body: {
        id: 'lander_body',
        name: 'Carl Sagan Memorial Station central core',
        text: 'The central electronics core carrying meteorology sensors, radio transmitter, and rover deployment ramps.',
        why: "Why it's cool: renamed in honor of astronomer Carl Sagan shortly after touching down on Mars on Independence Day 1997.",
      },
    };
  }

  // Spirit & Opportunity
  if (id === 'spirit-and-opportunity') {
    return {
      pancam: {
        id: 'pancam',
        name: 'Panoramic camera (Pancam) & Navcam stereo mast',
        text: 'Twin high-resolution multispectral stereo cameras mounted atop a 5-foot (1.5 m) mast with 360-degree rotation.',
        why: "Why it's cool: gave scientists human-eye-level panoramic color vision of Martian craters, sunset panoramas, and dust devils.",
      },
      wheels: {
        id: 'wheels',
        name: 'Independent motorized cleated aluminum wheels',
        text: 'Six spiral-flexure aluminum wheels with machined treads, each driven by its own brushless DC motor.',
        why: "Why it's cool: Opportunity drove 28.06 miles (45.16 km) on these wheels—an off-world driving record that stood for years.",
      },
      bogie_rocker: {
        id: 'bogie_rocker',
        name: 'Rocker-bogie articulated suspension',
        text: 'A differential joint connecting rocker and bogie titanium tubes, distributing wheel weight equally across uneven boulders.',
        why: "Why it's cool: when Spirit’s right-front wheel seized in 2006, drivers dragged it backwards, accidentally churning up bright white silica soil that proved ancient hydrothermal springs existed.",
      },
      solar_wings: {
        id: 'solar_wings',
        name: 'Gull-wing multi-junction solar array',
        text: 'Triple-junction solar cell wings spanning 2.3 meters, designed to produce up to 900 watt-hours per sol.',
        why: "Why it's cool: lucky Martian wind gusts ('cleaning events') periodically swept dust off the panels, extending a 90-day mission to nearly 15 years.",
      },
      web_body: {
        id: 'web_body',
        name: 'Warm Electronics Box (WEB) & aerogel insulation',
        text: 'A sealed composite hull insulated with silica aerogel and radioisotope heater units (RHUs) to survive -100°C nights.',
        why: "Why it's cool: aerogel is 99.8% air, making it one of the lightest and most effective thermal insulators known to human science.",
      },
      arm_rat: {
        id: 'arm_rat',
        name: 'Instrument arm & Rock Abrasion Tool (RAT)',
        text: 'A five-degree-of-freedom robotic arm carrying diamond-tipped cutting wheels, microscopic imager, and Mössbauer spectrometer.',
        why: "Why it's cool: ground 2-inch circles into ancient rocks, exposing pristine interior minerals that confirmed liquid water once flowed here.",
      },
      hga_dish: {
        id: 'hga_dish',
        name: 'High-gain steerable parabolic X-band dish',
        text: 'A steerable dish antenna providing direct high-speed radio links to NASA Deep Space Network antennas on Earth.',
        why: "Why it's cool: beamed back tens of thousands of gigabits of geology data across 14 years of roving.",
      },
    };
  }

  // Phoenix Mars Lander
  if (id === 'phoenix-mars-lander') {
    return {
      dig_arm: {
        id: 'dig_arm',
        name: '2.35-meter robotic digging arm & rasp scoop',
        text: 'A titanium-aluminum arm with a motorized rasp and scoop capable of digging into rock-hard frozen permafrost.',
        why: "Why it's cool: uncovered bright white chunks of pure subsurface water ice just two inches under the Arctic dirt, which evaporated into vapor over four days.",
      },
      solar_oct: {
        id: 'solar_oct',
        name: 'Twin octagonal ultra-thin solar arrays',
        text: 'Two 5.5-meter octagonal solar wings deployed like folding fans after landing in Vastitas Borealis.',
        why: "Why it's cool: powered the lander through the 24-hour midnight Sun of the Martian Arctic summer before winter frost cut off power.",
      },
      tega_lab: {
        id: 'tega_lab',
        name: 'Thermal and Evolved Gas Analyzer (TEGA)',
        text: 'Eight miniature high-temperature ovens and a mass spectrometer that heated soil samples to 1,000°C to analyze released gases.',
        why: "Why it's cool: verified water vapor and carbon dioxide escaping from the heated soil, confirming water ice in the Arctic ground.",
      },
      meca_lab: {
        id: 'meca_lab',
        name: 'MECA wet chemistry lab & microscope',
        text: 'Four beakers for dissolving soil in water and an atomic-force microscope resolving details down to 10 nanometers.',
        why: "Why it's cool: discovered perchlorate salts in the Martian soil, a chemical that acts as a natural antifreeze and chemical energy source.",
      },
      lidar_mast: {
        id: 'lidar_mast',
        name: 'Meteorological lidar station mast',
        text: 'A Canadian-built weather mast emitting green laser pulses upward into the Arctic sky to detect dust and atmospheric clouds.',
        why: "Why it's cool: detected water-ice snow falling from high-altitude Martian cirrus clouds, evaporating before reaching the ground.",
      },
      leg: {
        id: 'leg',
        name: 'Tripod landing legs & pulse descent thrusters',
        text: 'Three landing legs and pulsed hydrazine descent engines that brought Phoenix to a soft landing without airbags.',
        why: "Why it's cool: thruster exhaust blew away the top dust layer, exposing a slab of clean white water ice directly under the lander.",
      },
    };
  }

  // InSight Lander
  if (id === 'insight-lander') {
    return {
      seis_dome: {
        id: 'seis_dome',
        name: 'SEIS seismometer dome & Wind/Thermal Shield',
        text: 'An ultra-sensitive French seismometer housed inside a vacuum sphere beneath a gold-rimmed aerodynamic wind and thermal shield.',
        why: "Why it's cool: placed directly on the Martian dirt by InSight's robotic arm; recorded over 1,300 marsquakes and mapped the liquid core of Mars.",
      },
      solar_ultraflex: {
        id: 'solar_ultraflex',
        name: 'Twin circular Ultraflex solar arrays',
        text: 'Two 7-foot (2.15 m) diameter circular solar arrays that unfolded like folding Chinese hand fans upon touchdown.',
        why: "Why it's cool: generated 4,500 watt-hours of power per sol initially; four years of accumulated dust reduced power until InSight sent its final selfie in 2022.",
      },
      arm_ida: {
        id: 'arm_ida',
        name: 'Instrument Deployment Arm (IDA) & grapple',
        text: 'A 5.9-foot (1.8 m) robotic arm equipped with a motorized five-finger claw grapple and color deployment camera.',
        why: "Why it's cool: the first robotic arm on Mars designed to lift heavy instruments off the spacecraft deck and place them onto the planet’s ground.",
      },
      hp3_probe: {
        id: 'hp3_probe',
        name: 'HP3 Heat Flow Probe ("The Mole")',
        text: 'A self-hammering tungsten cylinder designed to burrow up to 16 feet (5 m) beneath the surface to measure interior planetary heat.',
        why: "Why it's cool: unexpected cement-like soil consistency caused the Mole to bounce in place, prompting engineers to use the arm scoop to pin it down.",
      },
      rise_antenna: {
        id: 'rise_antenna',
        name: 'RISE radio science medium-gain X-band antennas',
        text: 'Two horn antennas that tracked Doppler shifts in radio signals between Earth and the stationary lander.',
        why: "Why it's cool: measured the wobble (nutation) of Mars' north pole down to inches, proving the planet has a liquid molten iron-nickel core.",
      },
      chassis: {
        id: 'chassis',
        name: 'Avionics deck & electronics chassis',
        text: 'The central hexagonal electronics platform with landing radar, batteries, and weather sensors.',
        why: "Why it's cool: recorded the very first direct audio recordings of Martian wind vibrations rattling the solar panels.",
      },
    };
  }

  // Ingenuity Mars Helicopter
  if (id === 'ingenuity-mars-helicopter') {
    return {
      rotors: {
        id: 'rotors',
        name: 'Counter-rotating carbon-fiber rotor blades',
        text: 'Two 4-foot (1.2 m) carbon-fiber rotors spinning in opposite directions at 2,400 to 2,700 RPM—roughly five times faster than an Earth helicopter.',
        why: "Why it's cool: needed extreme rotational speed because Mars' atmospheric density is less than 1% of Earth's air at sea level.",
      },
      solar_panel: {
        id: 'solar_panel',
        name: 'Top solar panel & antenna mast',
        text: 'A 0.5-square-foot solar array mounted above the rotor blades, connected to six Sony lithium-ion batteries.',
        why: "Why it's cool: gathered just enough power during the day to run heaters through the freezing -90°C Martian nights.",
      },
      fuselage: {
        id: 'fuselage',
        name: 'Fuselage avionics cube & processors',
        text: 'A 5.4-inch (14 cm) cube housing smartphone-grade Qualcomm Snapdragon processors, laser altimeter, and visual odometry algorithms.',
        why: "Why it's cool: flew completely autonomously because radio signals between Earth and Mars take 5 to 20 minutes each way.",
      },
      legs: {
        id: 'legs',
        name: 'Four carbon-fiber landing legs & compliant dampeners',
        text: 'Four lightweight splayed carbon-fiber tubes with flexible feet designed to absorb touchdown shock on rocks and sand.',
        why: "Why it's cool: engineered to touch down at up to 1 meter per second on slopes without bouncing or rolling over.",
      },
      nav_camera: {
        id: 'nav_camera',
        name: 'Downward high-speed navigation camera',
        text: 'A camera taking 30 frames per second of surface sand ripples, running optical flow algorithms to track speed and drift.',
        why: "Why it's cool: kept Ingenuity flying in straight lines without GPS, using pure computer vision to track features on the Martian surface.",
      },
      wright_fabric: {
        id: 'wright_fabric',
        name: 'Wright Brothers 1903 Flyer fabric compartment',
        text: 'A postage-stamp-sized swatch of unbleached muslin fabric from the lower left wing of the original 1903 Wright Flyer wrapped in Kapton tape.',
        why: "Why it's cool: directly connected humanity’s first powered flight on Earth at Kitty Hawk to the first powered aerodynamic flight on another planet.",
      },
    };
  }

  // Fallback generic parts dictionary
  return {
    chassis: {
      id: 'chassis',
      name: `${artifact.moniker} Main Chassis`,
      text: `The central structural core housing payload electronics, batteries, and transmitters.`,
      why: "Why it's cool: designed to survive extreme vacuum, cosmic radiation, and day-to-night thermal swings.",
    },
    antenna: {
      id: 'antenna',
      name: 'Communications Antenna System',
      text: 'Radio transmission dish transmitting science telemetry across hundreds of millions of kilometers.',
      why: "Why it's cool: beamed high-resolution images back to the NASA Deep Space Network.",
    },
    power: {
      id: 'power',
      name: 'Surface Power System',
      text: 'Nuclear RTG or solar array providing electrical power for instruments.',
      why: "Why it's cool: kept the spacecraft alive in harsh off-world environments.",
    },
  };
}

// ---------------------------------------------------------------------------
// 2. GEOMETRIC CLASSIFICATION OF SPACECRAFT MESHES
// ---------------------------------------------------------------------------
function classifyCraftHit(
  artifact: Artifact,
  mesh: THREE.Mesh,
  hitPoint: THREE.Vector3,
  bounds: CraftBounds
): string {
  // If mesh was tagged during procedural creation, use that exact tag
  if (mesh.userData?.partId) {
    return mesh.userData.partId;
  }

  const id = artifact.id;
  const fy = Math.max(0, Math.min(1, (hitPoint.y - bounds.minY) / (bounds.height || 1)));
  const rr = Math.hypot(hitPoint.x - bounds.cx, hitPoint.z - bounds.cz) / (bounds.radius || 1);

  const meshBox = new THREE.Box3().setFromObject(mesh);
  const meshSize = meshBox.getSize(new THREE.Vector3());
  const maxW = Math.max(meshSize.x, meshSize.z);
  const fp = maxW / (bounds.width || 1);

  // Apollo Lunar Modules (Eagle, Intrepid, Falcon)
  if (artifact.category === 'apollo_crewed') {
    if (fy < 0.45 && rr < 0.28 && fp < 0.4) return 'dps';
    if (maxW < 0.08 * bounds.height && rr > 0.42 && fy < 0.35) return 'probe';
    if (fy < 0.16 && rr > 0.5) return 'pad';
    if (rr > 0.45 && fy < 0.48) return 'gear';
    if (fy > 0.72 && rr < 0.25) return 'dock';
    if (fy > 0.68 && fp < 0.35) return meshSize.y > 2.2 * maxW ? 'vhf' : 'dish';
    if (fy > 0.48 && rr > 0.38 && fp < 0.3) return 'rcs';
    if (fy >= 0.38 && fy <= 0.5) return 'interface';
    if (fy <= 0.5) return 'dstage';
    return 'cabin';
  }

  // Ingenuity Mars Helicopter
  if (id === 'ingenuity-mars-helicopter') {
    if (fy > 0.72) return 'rotors';
    if (fy > 0.52 && fy <= 0.72) return 'solar_panel';
    if (fy < 0.25) return 'legs';
    if (fy <= 0.4 && rr < 0.35) return 'nav_camera';
    if (fy > 0.35 && fy <= 0.52 && rr < 0.4) return 'fuselage';
    return 'wright_fabric';
  }

  // Viking 1 Lander
  if (id === 'viking-1-lander') {
    if (fy < 0.25) return 'leg';
    if (fy < 0.42 && rr < 0.32) return 'descent_engine';
    if (fy > 0.65 && rr > 0.3) return 'dish';
    if (rr > 0.38 && fy > 0.32 && fy < 0.65) return 'rtg';
    if (fy > 0.55 && rr < 0.35) return 'cam';
    if (rr > 0.32 && fy < 0.52) return 'scoop';
    return 'bio_lab';
  }

  // InSight Lander
  if (id === 'insight-lander') {
    if (fy < 0.22) return 'leg';
    if (rr > 0.42 && fy > 0.22) return 'solar_ultraflex';
    if (fy > 0.52 && rr < 0.35) return 'rise_antenna';
    if (rr > 0.28 && fy < 0.48) return 'arm_ida';
    if (rr < 0.32 && fy > 0.22 && fy < 0.5) return 'seis_dome';
    return 'chassis';
  }

  // Spirit & Opportunity
  if (id === 'spirit-and-opportunity') {
    if (fy < 0.28) return 'wheels';
    if (fy < 0.42 && rr > 0.38) return 'bogie_rocker';
    if (fy > 0.62 && rr < 0.38) return 'pancam';
    if (fy > 0.42 && rr > 0.38) return 'solar_wings';
    if (fy < 0.52 && rr > 0.38) return 'arm_rat';
    if (fy > 0.42 && rr > 0.22) return 'hga_dish';
    return 'web_body';
  }

  // Mars Pathfinder & Sojourner
  if (id === 'mars-pathfinder-sojourner') {
    if (rr > 0.42 && fy < 0.35) return 'sojourner_body';
    if (fy < 0.22) return 'airbags';
    if (fy < 0.42 && rr > 0.28) return 'petals';
    if (fy > 0.58) return 'imp_cam';
    return 'lander_body';
  }

  // Phoenix Mars Lander
  if (id === 'phoenix-mars-lander') {
    if (fy < 0.25) return 'leg';
    if (rr > 0.42 && fy > 0.22) return 'solar_oct';
    if (fy > 0.58) return 'lidar_mast';
    if (rr > 0.32 && fy < 0.48) return 'dig_arm';
    if (rr < 0.32 && fy > 0.22) return 'tega_lab';
    return 'meca_lab';
  }

  // Surveyor 3
  if (id === 'surveyor-3') {
    if (fy < 0.2) return 'pad';
    if (fy < 0.42 && rr > 0.38) return 'leg';
    if (fy > 0.72) return 'solar';
    if (fy > 0.48 && rr < 0.32) return 'dish';
    if (fy > 0.38 && rr > 0.28) return 'cam';
    if (fy < 0.45 && rr > 0.28) return 'scoop';
    return 'frame';
  }

  // Default fallback
  if (fy > 0.6) return 'antenna';
  if (fy < 0.3) return 'power';
  return 'chassis';
}

// ---------------------------------------------------------------------------
// 3. SEEDED PROCEDURAL TERRAIN & ENVIRONMENT GENERATION
// ---------------------------------------------------------------------------
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
  const rand = createSeededRandom(seedStr + '-craters-v3');
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

    const rand = createSeededRandom(isMars ? 'mars-regolith-v3' : 'moon-regolith-v3');
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
    if (mesh.userData?.highlightMat) {
      mesh.userData.highlightMat.dispose();
    }
  });
}

// ---------------------------------------------------------------------------
// 4. PROCEDURAL HERO CRAFT CREATION (FALLBACK & SEED)
// ---------------------------------------------------------------------------
function buildProceduralSpacecraft(artifact: Artifact): {
  craftGroup: THREE.Group;
  targetScale: number;
  craftRadius: number;
} {
  const craftGroup = new THREE.Group();

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
  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xe9e9e6,
    metalness: 0.05,
    roughness: 0.78,
  });

  const id = artifact.id;
  let targetScale = 3.4;
  let craftRadius = 3.2;

  if (artifact.category === 'apollo_crewed') {
    targetScale = 7.0;
    craftRadius = 4.4;

    const octMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.75, 1.35, 8),
      goldKaptonMat
    );
    octMesh.position.y = 1.65;
    octMesh.userData.partId = 'dstage';
    craftGroup.add(octMesh);

    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.72, 0.18, 8),
      silverAluminumMat
    );
    deck.position.y = 2.4;
    deck.userData.partId = 'interface';
    craftGroup.add(deck);

    const cabinMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.8, 2.2),
      silverAluminumMat
    );
    cabinMesh.position.y = 3.4;
    cabinMesh.userData.partId = 'cabin';
    craftGroup.add(cabinMesh);

    const engine = new THREE.Mesh(
      new THREE.ConeGeometry(0.82, 1.15, 24, 1, true),
      blackCompositeMat
    );
    engine.position.y = 0.85;
    engine.userData.partId = 'dps';
    craftGroup.add(engine);

    const legAngles = [
      Math.PI / 4,
      (3 * Math.PI) / 4,
      (5 * Math.PI) / 4,
      (7 * Math.PI) / 4,
    ];
    legAngles.forEach((angle) => {
      const rFoot = 2.95;
      const fx = Math.cos(angle) * rFoot;
      const fz = Math.sin(angle) * rFoot;
      const tx = Math.cos(angle) * 1.45;
      const tz = Math.sin(angle) * 1.45;

      const pTop = new THREE.Vector3(tx, 2.05, tz);
      const pBot = new THREE.Vector3(fx, 0.14, fz);
      const dir = new THREE.Vector3().subVectors(pBot, pTop);
      const len = dir.length();
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, len, 10),
        goldKaptonMat
      );
      strut.position.copy(pTop).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      strut.userData.partId = 'gear';
      craftGroup.add(strut);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.48, 0.09, 18),
        goldKaptonMat
      );
      pad.position.set(fx, 0.045, fz);
      pad.userData.partId = 'pad';
      craftGroup.add(pad);
    });
  } else if (artifact.category === 'rover') {
    targetScale = 2.8;
    craftRadius = 2.8;

    const web = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.52, 0.95), goldKaptonMat);
    web.position.y = 0.85;
    web.userData.partId = id === 'mars-pathfinder-sojourner' ? 'sojourner_body' : 'web_body';
    craftGroup.add(web);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.55), darkSolarCellMat);
    wing.position.y = 1.13;
    wing.userData.partId = id === 'mars-pathfinder-sojourner' ? 'sojourner_solar' : 'solar_wings';
    craftGroup.add(wing);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 12), whiteThermalMat);
    mast.position.set(0.48, 1.72, 0.25);
    mast.userData.partId = id === 'mars-pathfinder-sojourner' ? 'imp_cam' : 'pancam';
    craftGroup.add(mast);
  } else {
    targetScale = 3.4;
    craftRadius = 3.0;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.65, 6),
      id === 'viking-1-lander' ? whiteThermalMat : goldKaptonMat
    );
    body.position.y = 1.05;
    body.userData.partId = id === 'viking-1-lander' ? 'bio_lab' : 'chassis';
    craftGroup.add(body);

    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const lx = Math.cos(a) * 1.65;
      const lz = Math.sin(a) * 1.65;
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 0.07, 14),
        goldKaptonMat
      );
      pad.position.set(lx, 0.035, lz);
      pad.userData.partId = id === 'surveyor-3' ? 'pad' : 'leg';
      craftGroup.add(pad);
    }
  }

  craftGroup.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { craftGroup, targetScale, craftRadius };
}

// ---------------------------------------------------------------------------
// 5. COMPANION GROUND SITE ITEMS FOR ALL 10 MISSIONS
// ---------------------------------------------------------------------------
function buildMissionSiteItems(
  artifact: Artifact,
  scene: THREE.Scene,
  sampleH: (x: number, z: number) => number,
  isMars: boolean
): SiteItemDef[] {
  const items: SiteItemDef[] = [];

  const mat = (color: number, metalness = 0, roughness = 0.7) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  const gold = mat(0xc9a24b, 0.9, 0.35);
  const white = mat(0xe9e9e6, 0.05, 0.78);
  const grey = mat(0x8d9096, 0.6, 0.5);
  const darkMetal = mat(0x2d3036, 0.8, 0.4);

  const box = (w: number, h: number, d: number, m: THREE.Material) => {
    const obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    obj.castShadow = true;
    obj.receiveShadow = true;
    return obj;
  };

  const cyl = (r: number, h: number, m: THREE.Material, s = 12) => {
    const obj = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s), m);
    obj.castShadow = true;
    obj.receiveShadow = true;
    return obj;
  };

  const addItem = (
    id: string,
    name: string,
    x: number,
    z: number,
    radius: number,
    text: string,
    why: string,
    status: string,
    builder: (grp: THREE.Group) => THREE.Mesh | null
  ) => {
    const group = new THREE.Group();
    const primaryMesh = builder(group);
    const groundY = sampleH(x, z);
    group.position.set(x, groundY, z);
    scene.add(group);

    items.push({
      id,
      name,
      group,
      radius,
      center: new THREE.Vector3(x, groundY + 0.6, z),
      text,
      why,
      status,
      seen: false,
      mesh: primaryMesh,
    });
  };

  const id = artifact.id;

  // Apollo 11
  if (id === 'apollo-11-eagle-easep') {
    addItem(
      'flag',
      'United States flag',
      -8.5,
      -5.0,
      2.5,
      'The American flag planted by Neil Armstrong and Buzz Aldrin. Supported by a horizontal telescoping rod along the top because there is no wind in the airless lunar vacuum.',
      "Why it's cool: Eagle's exhaust gases during liftoff blew the flag over. After 50+ years of unfiltered solar UV radiation, its colors have likely bleached to chalk white.",
      'Knocked over in regolith, likely bleached pure white by intense solar UV.',
      (grp) => {
        const flagCanvas = document.createElement('canvas');
        flagCanvas.width = 260;
        flagCanvas.height = 170;
        const ctx = flagCanvas.getContext('2d');
        if (ctx) {
          for (let i = 0; i < 13; i++) {
            ctx.fillStyle = i % 2 ? '#f2f2f2' : '#b22234';
            ctx.fillRect(0, i * 13, 260, 13);
          }
          ctx.fillStyle = '#3c3b6e';
          ctx.fillRect(0, 0, 104, 91);
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 6; j++) {
              ctx.fillRect(8 + j * 16, 6 + i * 9, 3, 3);
            }
          }
        }
        const flagTex = new THREE.CanvasTexture(flagCanvas);
        const flagMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 0.95),
          new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.95 })
        );
        flagMesh.rotation.x = -Math.PI / 2 + 0.12;
        flagMesh.position.set(0.9, 0.1, 0);
        flagMesh.castShadow = true;
        const pole = cyl(0.015, 2.1, grey, 6);
        pole.rotation.z = Math.PI / 2;
        pole.position.set(0.3, 0.08, -0.5);
        grp.add(flagMesh, pole);
        return flagMesh;
      }
    );

    addItem(
      'psep',
      'Passive Seismic Experiment Package (PSEP)',
      16.0,
      -4.0,
      2.5,
      'The first seismometer deployed on the Moon, listening for moonquakes, tidal vibrations, and meteorite strikes. Powered by solar cells and kept warm with isotope heaters.',
      "Why it's cool: operated for 21 days before succumbing to the freezing -170°C lunar night, proving the Moon is seismically active.",
      'Quiet since August 1969; resting undisturbed on Mare Tranquillitatis.',
      (grp) => {
        const b = box(0.7, 0.35, 0.7, gold);
        b.position.y = 0.3;
        const d = cyl(0.3, 0.03, grey);
        d.position.y = 0.5;
        d.rotation.x = 0.15;
        grp.add(b, d);
        return b;
      }
    );

    addItem(
      'lrrr',
      'Laser Ranging Retroreflector (LRRR)',
      20.0,
      2.0,
      2.5,
      'An unpowered panel array of 100 quartz corner-cube prisms. Observatories on Earth fire lasers at this mirror and measure the return travel time down to picoseconds.',
      "Why it's cool: Still active today! Has proven that the Moon is slowly spiraling away from Earth at 3.8 centimeters per year—about the speed fingernails grow.",
      'Still fully operational after 55+ years; routinely targeted by Earth lasers.',
      (grp) => {
        const p = box(0.6, 0.6, 0.06, grey);
        p.position.y = 0.55;
        p.rotation.x = -0.5;
        const l = cyl(0.02, 0.5, grey, 6);
        l.position.y = 0.25;
        grp.add(p, l);
        return p;
      }
    );

    addItem(
      'plss',
      'Portable Life Support System (PLSS) backpacks',
      9.0,
      12.0,
      2.5,
      'The bulky backpack units that supplied oxygen, water cooling, and radio communication during Neil and Buzz’s historic 2.5-hour moonwalk.',
      "Why it's cool: jettisoned out of the cabin hatch before liftoff along with heavy boots and cameras to save precious weight for 21.55 kg of lunar samples.",
      'Lying where they landed on the regolith beside Eagle’s front ladder.',
      (grp) => {
        let first: THREE.Mesh | null = null;
        [0, 1].forEach((i) => {
          const b = box(0.55, 0.75, 0.25, white);
          b.position.set(i * 0.9, 0.14, i * 0.3);
          b.rotation.set(1.3, i * 1.1, 0.3);
          grp.add(b);
          if (!first) first = b;
        });
        return first;
      }
    );
  }

  // Apollo 12
  else if (id === 'apollo-12-intrepid-alsep') {
    addItem(
      'surveyor_visit',
      'Surveyor 3 scout visit marker',
      -16.0,
      -14.0,
      3.0,
      'The robotic Surveyor 3 lander, which had sat silent in Oceanus Procellarum for 2.5 years before Apollo 12 astronauts Pete Conrad and Alan Bean walked right up to it.',
      "Why it's cool: the astronauts unbolted its camera and soil scoop to bring back to Earth, testing how materials and microbial spores hold up in space.",
      'Stationary monument on crater slope; camera retrieved and on display at the Smithsonian.',
      (grp) => {
        const body = cyl(0.5, 0.6, white, 6);
        body.position.y = 0.4;
        const mast = cyl(0.03, 1.2, grey, 6);
        mast.position.y = 1.0;
        grp.add(body, mast);
        return body;
      }
    );

    addItem(
      'alsep12',
      'Apollo 12 ALSEP Central Station & SNAP-27 RTG',
      18.0,
      5.0,
      2.5,
      'A full Apollo Lunar Surface Experiments Package powered by a 73-watt Plutonium-238 radioisotope thermoelectric generator.',
      "Why it's cool: transmitted continuous seismic, magnetic, and solar wind science back to Earth for nearly eight years until shutdown in September 1977.",
      'Nuclear fuel decay complete; science station resting silent on the plain.',
      (grp) => {
        const cs = box(0.8, 0.4, 0.8, white);
        cs.position.y = 0.3;
        const rtg = cyl(0.18, 0.45, darkMetal, 8);
        rtg.position.set(1.2, 0.25, 0);
        grp.add(cs, rtg);
        return cs;
      }
    );
  }

  // Apollo 15
  else if (id === 'apollo-15-falcon-lrv-alsep') {
    addItem(
      'lrv',
      'Lunar Roving Vehicle (LRV-1 "Moon Buggy")',
      14.0,
      8.0,
      3.5,
      'The first wheeled vehicle driven on the Moon. Powered by two 36-volt batteries, it covered 27.9 km across Hadley-Apennine at speeds up to 13 km/h.',
      "Why it's cool: parked 100 meters away so its ground-controlled color TV camera could film Falcon’s liftoff into lunar orbit.",
      'Parked permanently at Hadley-Apennine, ready to roll if batteries were fresh.',
      (grp) => {
        const body = box(1.8, 0.25, 0.9, white);
        body.position.y = 0.45;
        const dish = cyl(0.3, 0.05, grey, 12);
        dish.position.set(0.6, 0.9, 0);
        dish.rotation.x = 0.3;
        grp.add(body, dish);
        return body;
      }
    );

    addItem(
      'fallen_astronaut',
      'Fallen Astronaut memorial figurine & plaque',
      -8.0,
      -12.0,
      2.0,
      'A small 3.3-inch (8.5 cm) aluminum sculpture created by Belgian artist Paul Van Hoeydonck beside a plaque listing 14 deceased astronauts and cosmonauts.',
      "Why it's cool: the only official piece of memorial art on the lunar surface, placed quietly by Commander David Scott without fanfare.",
      'Resting face-down in the lunar dust at the foot of Mt. Hadley.',
      (grp) => {
        const fig = box(0.12, 0.04, 0.28, grey);
        fig.position.y = 0.02;
        const plq = box(0.24, 0.02, 0.16, darkMetal);
        plq.position.set(0.25, 0.01, 0);
        grp.add(fig, plq);
        return fig;
      }
    );

    addItem(
      'galileo',
      'Galileo hammer & falcon feather experiment site',
      -10.0,
      6.0,
      2.0,
      "The exact spot where Commander David Scott dropped a 1.3 kg aluminum geology hammer and a 30-gram falcon feather simultaneously.",
      "Why it's cool: in the airless lunar vacuum, both hit the dust at the exact same instant, visually confirming Galileo’s 400-year-old law of gravity.",
      'Hammer and feather resting side-by-side in the regolith undisturbed.',
      (grp) => {
        const h = box(0.08, 0.35, 0.04, darkMetal);
        h.rotation.z = Math.PI / 2;
        h.position.set(0, 0.02, 0);
        const f = box(0.04, 0.22, 0.02, white);
        f.rotation.z = Math.PI / 2.2;
        f.position.set(0.25, 0.01, 0.05);
        grp.add(h, f);
        return h;
      }
    );
  }

  // Surveyor 3
  else if (id === 'surveyor-3') {
    addItem(
      'bounce1',
      'First landing bounce crater',
      -12.0,
      8.0,
      3.0,
      'A shallow circular imprint in the lunar dust where Surveyor 3’s footpads struck the Moon before bouncing 10 meters into the sky.',
      "Why it's cool: radar confusion caused vernier engines to keep firing, producing three distinct sets of footpad imprints on the Moon.",
      'Imprint preserved in vacuum.',
      (grp) => {
        const r = cyl(0.8, 0.08, mat(0x5a5852, 0, 1), 16);
        r.position.y = 0.02;
        grp.add(r);
        return r;
      }
    );

    addItem(
      'trench_s3',
      'Robotic scoop excavation trench',
      3.2,
      -1.8,
      2.0,
      'Four soil trenches dug by the miniature surface sampler claw, reaching up to 18 cm deep.',
      "Why it's cool: confirmed lunar soil was cohesive enough to support the landing legs of Apollo 11.",
      'Trenches remain crisp with steep side walls.',
      (grp) => {
        const t = box(0.9, 0.06, 0.25, mat(0x3a3832, 0, 1));
        t.position.y = 0.02;
        grp.add(t);
        return t;
      }
    );
  }

  // Viking 1 Lander
  else if (id === 'viking-1-lander') {
    addItem(
      'trench_v1',
      'Robotic arm duricrust trench #1',
      2.8,
      -1.5,
      2.0,
      'A deep trench dug through crusty Martian soil (duricrust) to deliver samples into the GCMS and biology test ovens.',
      "Why it's cool: proved Martian soil is saturated with oxidizing compounds that mimic microbial gas exchange.",
      'Trench edges softened by decades of gentle Martian dust deposition.',
      (grp) => {
        const t = box(1.1, 0.08, 0.35, mat(0x5a2816, 0, 1));
        t.position.y = 0.02;
        grp.add(t);
        return t;
      }
    );

    addItem(
      'cal_v1',
      'Radiometer color calibration chart',
      -3.2,
      2.2,
      2.0,
      'A test target with color chips and mirror patches used to calibrate Viking’s facsimile stereo cameras under shifting salmon skies.',
      "Why it's cool: allowed scientists to settle the fierce debate on whether the Martian sky was actually butterscotch-pink or blue.",
      'Surface chips dusted over by regional dust storms.',
      (grp) => {
        const c = box(0.35, 0.08, 0.35, grey);
        c.position.y = 0.05;
        grp.add(c);
        return c;
      }
    );
  }

  // Mars Pathfinder & Sojourner
  else if (id === 'mars-pathfinder-sojourner') {
    addItem(
      'yogi',
      'Rock "Yogi" & APXS contact site',
      7.2,
      -4.5,
      2.5,
      'A distinctive weathered boulder resembling a bear’s head analyzed by Sojourner’s Alpha Proton X-Ray Spectrometer.',
      "Why it's cool: rounded pebbles around Yogi confirmed that catastrophic ancient floods once tore through Ares Vallis.",
      'Permanent geological landmark of Ares Vallis.',
      (grp) => {
        const y = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), mat(0x7c381c, 0, 1));
        y.position.y = 0.45;
        grp.add(y);
        return y;
      }
    );

    addItem(
      'airbags_pf',
      'Deflated landing airbag cushions',
      -4.5,
      -3.2,
      2.5,
      'The multi-layer Kevlar airbags that protected Pathfinder as it bounced 15 times across the rocky Martian floodplain.',
      "Why it's cool: completely retracted after landing to allow the triangular solar petals to open and deploy Sojourner.",
      'Deflated white fabric resting on red soil.',
      (grp) => {
        const a = box(1.4, 0.18, 1.2, white);
        a.position.y = 0.09;
        grp.add(a);
        return a;
      }
    );
  }

  // Spirit & Opportunity
  else if (id === 'spirit-and-opportunity') {
    addItem(
      'blueberries',
      'Hematite "Blueberries" mineral field',
      4.2,
      -3.5,
      2.5,
      'Tiny millimeter-sized gray spherules rich in the iron oxide mineral hematite covering the soil of Meridiani Planum.',
      "Why it's cool: formed as concretions precipitating out of ancient acidic groundwater pools, proving Mars was once wet.",
      'Billions of spherules carpet the surrounding plains.',
      (grp) => {
        const b = box(1.2, 0.06, 1.2, mat(0x444855, 0.7, 0.4));
        b.position.y = 0.02;
        grp.add(b);
        return b;
      }
    );

    addItem(
      'rat_grind',
      'Rock Abrasion Tool (RAT) circular grind mark',
      -2.8,
      2.6,
      2.0,
      'A circular 45 mm diameter, 5 mm deep hole ground into a rock surface by diamond-impregnated grinding bits.',
      "Why it's cool: exposed the pristine interior of Martian rocks shielded from millions of years of chemical weathering.",
      'Clean circular rock core mark visible in stone.',
      (grp) => {
        const r = cyl(0.24, 0.04, mat(0x8a4b2a, 0, 1), 16);
        r.position.y = 0.02;
        grp.add(r);
        return r;
      }
    );
  }

  // Phoenix Mars Lander
  else if (id === 'phoenix-mars-lander') {
    addItem(
      'snow_white',
      '"Snow White" subsurface water-ice trench',
      2.5,
      -1.8,
      2.0,
      'A trench dug by Phoenix’s robotic scoop revealing glistening white chunks of pure water ice just 2 inches below the surface.',
      "Why it's cool: over four days of time-lapse photography, scientists watched the ice chunks sublimate into gas, confirming water ice on Mars.",
      'Subsurface ice table protected beneath topsoil.',
      (grp) => {
        const ice = box(0.8, 0.05, 0.35, mat(0xddeeff, 0.1, 0.3));
        ice.position.y = 0.02;
        grp.add(ice);
        return ice;
      }
    );
  }

  // InSight Lander
  else if (id === 'insight-lander') {
    addItem(
      'seis_deployed',
      'Deployed SEIS seismometer dome',
      3.2,
      2.4,
      2.5,
      'The ultra-sensitive French SEIS seismometer placed directly onto the Martian ground beneath its protective gold Wind and Thermal Shield.',
      "Why it's cool: detected over 1,300 marsquakes and meteorite strikes, measuring the thickness of the Martian crust and core.",
      'Resting peacefully on Elysium Planitia; silent since late 2022.',
      (grp) => {
        const d = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
          gold
        );
        d.position.y = 0.15;
        grp.add(d);
        return d;
      }
    );
  }

  // Ingenuity Mars Helicopter
  else if (id === 'ingenuity-mars-helicopter') {
    addItem(
      'airfield_alpha',
      'Airfield Alpha historic first flight marker',
      -6.0,
      4.0,
      2.5,
      'A 10-meter circle on the dusty floor of Jezero Crater where Ingenuity made the first powered, controlled flight on another planet on April 19, 2021.',
      "Why it's cool: proved aerodynamic rotorcraft flight is possible in Mars’ ultra-thin atmosphere (<1% Earth air density).",
      'Named Wright Brothers Field by the International Civil Aviation Organization (ICAO).',
      (grp) => {
        const m = cyl(0.6, 0.04, mat(0x9a5832, 0, 1), 16);
        m.position.y = 0.02;
        grp.add(m);
        return m;
      }
    );
  }

  return items;
}

// ---------------------------------------------------------------------------
// COORDINATE UTILITIES
// ---------------------------------------------------------------------------
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
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

// ---------------------------------------------------------------------------
// 6. MAIN SURFACE EXPLORER GAME COMPONENT
// ---------------------------------------------------------------------------
export const SurfaceExplorerGame: React.FC<SurfaceExplorerGameProps> = ({
  artifact,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isMars = artifact.body === 'mars';

  // Game UI States
  const [isEntered, setIsEntered] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<InspectableTarget | null>(null);
  const [inspectModalTarget, setInspectModalTarget] = useState<InspectableTarget | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number>(22);
  const [hudCoords, setHudCoords] = useState<string>(
    formatOffsetCoords(artifact.coordinates.lat, artifact.coordinates.lon, 14, 20, isMars)
  );
  const [nearestInfo, setNearestInfo] = useState<string>('Scanning surface...');
  const [itemsLoggedCount, setItemsLoggedCount] = useState<number>(0);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [partsInspectedCount, setPartsInspectedCount] = useState<number>(0);
  const [totalPartsCount, setTotalPartsCount] = useState<number>(0);
  const [modelSourceLabel, setModelSourceLabel] = useState<'CAD' | 'NASA GLB'>('CAD');

  // Mutable refs for high-frequency game loop
  const isEnteredRef = useRef(isEntered);
  isEnteredRef.current = isEntered;
  const flashlightOnRef = useRef(isFlashlightOn);
  flashlightOnRef.current = isFlashlightOn;
  const inspectModalRef = useRef(inspectModalTarget);
  inspectModalRef.current = inspectModalTarget;

  const handleExit = useCallback(() => {
    playTelemetryBeep(420);
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    onClose();
  }, [onClose]);

  const toggleFlashlight = useCallback(() => {
    setIsFlashlightOn((prev) => {
      const next = !prev;
      playTelemetryBeep(next ? 880 : 380);
      return next;
    });
  }, []);

  const openInspection = useCallback((target: InspectableTarget) => {
    playSuccessChime();
    setInspectModalTarget(target);
  }, []);

  const closeInspection = useCallback(() => {
    playTelemetryBeep(480);
    setInspectModalTarget(null);
    const canvas = mountRef.current?.querySelector('canvas');
    canvas?.requestPointerLock?.();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let isDisposed = false;
    let rafId = 0;

    // 1. RENDERER & PERFORMANCE DETECTOR
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

    // 2. SCENE & ENVIRONMENT
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

    // 3. CAMERA & FLASHLIGHT RIG (KEY G)
    const camera = new THREE.PerspectiveCamera(
      70,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.1,
      4000
    );
    camera.rotation.order = 'YXZ';

    // Flashlight SpotLight mounted directly to camera
    const flashlight = new THREE.SpotLight(0xfff0d8, 0, 85, 0.42, 0.5, 1);
    flashlight.position.set(0.18, -0.14, 0);
    flashlight.target.position.set(0, 0, -8);
    camera.add(flashlight);
    camera.add(flashlight.target);
    scene.add(camera);

    // 4. NATURAL SUN & SKY LIGHTING RIG
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

    // 5. SKY DISC ELEMENTS
    const skyGeometries: THREE.BufferGeometry[] = [];
    const skyMaterials: THREE.Material[] = [];
    const skyTextures: THREE.Texture[] = [];

    if (!isMars) {
      const starCount = 2500;
      const starPos: number[] = [];
      const randStar = createSeededRandom('lunar-stars-v3');
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

    // 6. 1200x1200m TERRAIN
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

    const randRock = createSeededRandom(artifact.id + '-rocks-v3');
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

    // 8. SPACECRAFT SETUP & PARTS REGISTRATION
    const siteAnchor = new THREE.Group();
    const centerGroundY = sampleH(0, 0);
    siteAnchor.position.set(0, centerGroundY, 0);
    scene.add(siteAnchor);

    const { craftGroup, targetScale, craftRadius } = buildProceduralSpacecraft(artifact);
    siteAnchor.add(craftGroup);

    // Craft parts definitions & tracking
    const craftPartsMap = getCraftParts(artifact);
    const totalParts = Object.keys(craftPartsMap).length;
    setTotalPartsCount(totalParts);

    let craftMeshes: THREE.Mesh[] = [];
    let craftBounds: CraftBounds = {
      minY: 0,
      height: 1,
      cx: 0,
      cz: 0,
      width: 1,
      radius: 1,
    };
    let craftSphere: THREE.Sphere | null = null;

    function updateCraftBoundingData(root: THREE.Object3D) {
      root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(root);
      const sz = b.getSize(new THREE.Vector3());
      const cn = b.getCenter(new THREE.Vector3());
      craftBounds = {
        minY: b.min.y,
        height: sz.y || 1,
        cx: cn.x,
        cz: cn.z,
        width: Math.max(sz.x, sz.z) || 1,
        radius: Math.max(sz.x, sz.z) / 2 || 1,
      };
      craftSphere = new THREE.Sphere(cn, sz.length() / 2 + 0.5);

      craftMeshes = [];
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          craftMeshes.push(o as THREE.Mesh);
        }
      });
    }

    updateCraftBoundingData(craftGroup);

    // Load official NASA GLB if available
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

          siteAnchor.remove(craftGroup);
          disposeObject3D(craftGroup);
          siteAnchor.add(loaded);
          gltfRoot = loaded;
          updateCraftBoundingData(loaded);
          setModelSourceLabel('NASA GLB');
          dracoLoader.dispose();
        })
        .catch(() => {
          dracoLoader.dispose();
        });
    }

    // 9. COMPANION GROUND SITE ITEMS REGISTRATION
    const siteItems = buildMissionSiteItems(artifact, scene, sampleH, isMars);
    setTotalItemsCount(siteItems.length);

    // 10. MESH HIGHLIGHTING (setHL)
    let highlightedMesh: THREE.Mesh | null = null;
    function setHL(m: THREE.Mesh | null) {
      if (highlightedMesh === m) return;
      if (highlightedMesh && highlightedMesh.userData?.origMat) {
        highlightedMesh.material = highlightedMesh.userData.origMat;
      }
      highlightedMesh = m;
      if (m) {
        if (!m.userData) m.userData = {};
        if (!m.userData.origMat) {
          m.userData.origMat = m.material;
        }
        if (!m.userData.highlightMat) {
          const srcMat = Array.isArray(m.userData.origMat)
            ? m.userData.origMat[0]
            : m.userData.origMat;
          const c = srcMat.clone();
          if ('emissive' in c) {
            c.emissive.setHex(isMars ? 0xd97706 : 0xd4aa4f);
            c.emissiveIntensity = 0.35;
          }
          m.userData.highlightMat = c;
        }
        m.material = m.userData.highlightMat;
      }
    }

    // 11. FOOTPRINTS SYSTEM
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

    // 12. PLAYER STATE & INPUTS
    const EYE_HEIGHT = 1.7;
    const WORLD_LIMIT = 580;

    const player = {
      pos: new THREE.Vector3(startX, sampleH(startX, startZ), startZ),
      vel: new THREE.Vector3(),
      onGround: true,
      yaw: Math.atan2(startX, startZ),
      pitch: -0.05,
    };

    const keys: Record<string, boolean> = {};
    let isDraggingLook = false;
    let lastDragX = 0;
    let lastDragY = 0;

    // Raycaster for Crosshair Point-and-Inspect
    const raycaster = new THREE.Raycaster();
    raycaster.far = 12;
    const screenCenter = new THREE.Vector2(0, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'KeyG' && isEnteredRef.current) {
        toggleFlashlight();
      }
      if (e.code === 'KeyE' && isEnteredRef.current) {
        if (inspectModalRef.current) {
          closeInspection();
        } else if (activeTargetRef.current) {
          openInspection(activeTargetRef.current);
        }
      }
      if (e.code === 'Space' && isEnteredRef.current && player.onGround) {
        e.preventDefault();
        player.vel.y = isMars ? 3.8 : 3.4;
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

    // 13. RESIZE OBSERVER
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

    const printDummy = new THREE.Object3D();
    const activeTargetRef = { current: null as InspectableTarget | null };

    let lastHudUpdate = 0;
    let probeTimer = 0;
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

      if (isEnteredRef.current) {
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

        // Boot footprints
        if (player.onGround && Math.hypot(player.pos.x - lastPrintPos.x, player.pos.z - lastPrintPos.z) > 0.85) {
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

        // Perimeter bounds
        player.pos.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.pos.x));
        player.pos.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.pos.z));

        // Smooth flashlight intensity interpolation
        flashlight.intensity +=
          ((flashlightOnRef.current ? 3.5 : 0) - flashlight.intensity) * Math.min(1, dt * 9);

        // POINT-AND-INSPECT CROSSHAIR RAYCASTING (Throttle to ~25 Hz)
        if ((probeTimer += dt) > 0.04) {
          probeTimer = 0;
          camera.updateMatrixWorld();
          raycaster.setFromCamera(screenCenter, camera);

          let detectedTarget: InspectableTarget | null = null;

          // 1. Raycast spacecraft components if within 22 meters
          const distToCraft = Math.hypot(player.pos.x - craftBounds.cx, player.pos.z - craftBounds.cz);
          if (
            distToCraft < 22 &&
            craftSphere &&
            raycaster.ray.intersectsSphere(craftSphere) &&
            craftMeshes.length > 0
          ) {
            const hits = raycaster.intersectObjects(craftMeshes, false);
            if (hits.length > 0) {
              const h = hits[0];
              const partId = classifyCraftHit(artifact, h.object as THREE.Mesh, h.point, craftBounds);
              const part = craftPartsMap[partId];
              if (part) {
                detectedTarget = {
                  type: 'craft_part',
                  id: partId,
                  name: part.name,
                  text: part.text,
                  why: part.why,
                  mesh: h.object as THREE.Mesh,
                };
              }
            }
          }

          // 2. Check companion ground items if spacecraft not hit
          if (!detectedTarget) {
            const camFwd = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
            let bestScore = 0;
            for (const item of siteItems) {
              const dVec = item.center.clone().sub(player.pos);
              const dist = dVec.length();
              if (dist > item.radius + 4.0) continue;
              const dot = dVec.normalize().dot(camFwd);
              if (dot > 0.92 && dot > bestScore) {
                bestScore = dot;
                detectedTarget = {
                  type: 'site_item',
                  id: item.id,
                  name: item.name,
                  text: item.text,
                  why: item.why,
                  status: item.status,
                  mesh: item.mesh || null,
                };
              }
            }
          }

          activeTargetRef.current = detectedTarget;
          setHoveredTarget(detectedTarget);
          setHL(detectedTarget && !inspectModalRef.current ? detectedTarget.mesh || null : null);
        }

        // TELEMETRY HUD UPDATES (~8 Hz)
        if (now - lastHudUpdate > 120) {
          lastHudUpdate = now;
          const distFromCraft = Math.hypot(player.pos.x, player.pos.z);
          setDistanceMeters(Math.max(0, Math.round(distFromCraft - craftRadius * 0.6)));
          setHudCoords(
            formatOffsetCoords(
              artifact.coordinates.lat,
              artifact.coordinates.lon,
              player.pos.x,
              player.pos.z,
              isMars
            )
          );

          // Find nearest unread companion item
          let nearestDist = 1e9;
          let nearestBearing = 0;
          let hasUnread = false;

          for (const item of siteItems) {
            if (!item.seen) {
              const dx = item.center.x - player.pos.x;
              const dz = item.center.z - player.pos.z;
              const d = Math.hypot(dx, dz);
              if (d < nearestDist) {
                nearestDist = d;
                nearestBearing = (Math.atan2(dx, -dz) * (180 / Math.PI) + 360) % 360;
                hasUnread = true;
              }
            }
          }

          const seenItems = siteItems.filter((i) => i.seen).length;
          setItemsLoggedCount(seenItems);

          if (hasUnread) {
            setNearestInfo(
              `Nearest unread: ${Math.round(nearestDist)} m, bearing ${Math.round(nearestBearing)}°`
            );
          } else {
            const allPartsSeen = Object.values(craftPartsMap).every((p) => p.seen);
            setNearestInfo(
              allPartsSeen
                ? 'Every object logged.'
                : `Debris logged. Aim crosshair at ${artifact.moniker}'s parts and press [E].`
            );
          }

          const seenParts = Object.values(craftPartsMap).filter((p) => p.seen).length;
          setPartsInspectedCount(seenParts);
        }
      }

      // Camera pose
      camera.position.set(player.pos.x, player.pos.y + EYE_HEIGHT, player.pos.z);
      camera.rotation.set(player.pitch, player.yaw, 0);

      // Low-angle sun shadow frustum tracking
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

      disposeObject3D(craftGroup);
      if (gltfRoot) disposeObject3D(gltfRoot);
      siteItems.forEach((it) => disposeObject3D(it.group));
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
  }, [artifact, isMars, toggleFlashlight, openInspection, closeInspection]);

  const handleEnterSurface = useCallback(() => {
    playTelemetryBeep(640);
    setIsEntered(true);
    const canvas = mountRef.current?.querySelector('canvas');
    canvas?.requestPointerLock?.();
  }, []);

  // When an inspect modal opens, mark the item or part as seen
  useEffect(() => {
    if (!inspectModalTarget) return;
    if (inspectModalTarget.type === 'site_item') {
      setItemsLoggedCount((c) => c + 1);
    } else {
      setPartsInspectedCount((c) => c + 1);
    }
  }, [inspectModalTarget]);

  // Planet theme tokens
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
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        aria-label={`3D surface exploration of ${artifact.name}`}
      />

      {/* Top-Left: Exit Surface / Return to Orbit */}
      <div className="absolute top-3 left-2 sm:top-4 sm:left-4 z-30 pointer-events-auto flex items-center gap-2">
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

        {/* Top Flashlight Toggle Shortcut Button */}
        {isEntered && (
          <button
            onClick={toggleFlashlight}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 active:translate-y-0.5 transition-all ${
              isFlashlightOn
                ? isMars
                  ? 'bg-[#D97706] text-[#1C140F] border border-[#F5E6D3]'
                  : 'bg-[#BAE6FD] text-[#1C1D21] border border-[#BAE6FD]'
                : isMars
                ? 'bg-[rgba(28,20,15,0.90)] hover:bg-[#291D16] border border-[#57534E] text-[#F5E6D3]'
                : 'bg-[rgba(28,29,33,0.94)] hover:bg-[#2A2C32] border-2 border-[#BAE6FD] text-[#F4F4F5]'
            }`}
            title="Toggle Flashlight (G)"
          >
            {isFlashlightOn ? (
              <Flashlight className="w-4 h-4" />
            ) : (
              <FlashlightOff className={`w-4 h-4 ${mutedTextClass}`} />
            )}
            <span>Flashlight {isFlashlightOn ? 'ON' : 'OFF'} [G]</span>
          </button>
        )}
      </div>

      {/* Top-Right: Comprehensive Telemetry HUD */}
      {isEntered && (
        <div
          className={`absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-none rounded-xl px-3.5 py-2.5 max-w-[290px] ${panelBgClass}`}
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

          {/* Site Log Progress */}
          <div className="mt-1.5 pt-1.5 border-t border-dashed border-white/10 text-[11px] font-mono flex items-center justify-between">
            <span className={mutedTextClass}>Site Debris Logged:</span>
            <span className={`font-bold tabular-nums ${accentTextClass}`}>
              {itemsLoggedCount}/{totalItemsCount}
            </span>
          </div>

          {/* Spacecraft Components Inspected */}
          <div className="mt-1 text-[11px] font-mono flex items-center justify-between">
            <span className={mutedTextClass}>Components Inspected:</span>
            <span className={`font-bold tabular-nums ${accentTextClass}`}>
              {partsInspectedCount}/{totalPartsCount}
            </span>
          </div>

          {/* Nearest Unread Compass Bearing */}
          <div className={`mt-1 text-[10.5px] font-mono truncate ${accentTextClass}`}>
            {nearestInfo}
          </div>

          {/* Distance to Center Pad */}
          <div
            className={`mt-1.5 pt-1.5 border-t ${dividerClass} flex items-center justify-between text-[11px] font-mono`}
          >
            <span className={mutedTextClass}>
              Flashlight: <strong className={isFlashlightOn ? accentTextClass : ''}>{isFlashlightOn ? 'ON' : 'OFF'}</strong>
            </span>
            <span className={`font-bold tabular-nums ${accentTextClass}`}>
              {distanceMeters === 0 ? 'AT SITE' : `${distanceMeters}m away`}
            </span>
          </div>
        </div>
      )}

      {/* Center Reticle & Dynamic Point-to-Inspect Prompt */}
      {isEntered && !inspectModalTarget && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex flex-col items-center">
            {/* Crosshair dot with dynamic targeting highlight */}
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                hoveredTarget
                  ? isMars
                    ? 'border-[#D97706] scale-125 shadow-[0_0_12px_rgba(217,119,6,0.8)]'
                    : 'border-[#BAE6FD] scale-125 shadow-[0_0_12px_rgba(186,230,253,0.8)]'
                  : 'border-white/50'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  hoveredTarget
                    ? isMars
                      ? 'bg-[#D97706]'
                      : 'bg-[#BAE6FD]'
                    : 'bg-white/80'
                }`}
              />
            </div>

            {/* Point-to-Inspect Notification: Clickable or press E */}
            {hoveredTarget && (
              <button
                onClick={() => openInspection(hoveredTarget)}
                className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wide pointer-events-auto flex items-center gap-2 cursor-pointer transition-all active:scale-95 ${
                  isMars
                    ? 'bg-[rgba(28,20,15,0.92)] border border-[#57534E] text-[#F5E6D3] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
                    : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none'
                }`}
              >
                <Eye className={`w-4 h-4 ${accentTextClass}`} />
                <span>
                  Press <strong className={accentTextClass}>[E]</strong> to inspect {hoveredTarget.name}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Point-and-Inspect Educational Modal / Plaque */}
      {isEntered && inspectModalTarget && (
        <div className="absolute inset-x-4 bottom-20 sm:bottom-24 z-30 flex justify-center pointer-events-none">
          <div
            className={`pointer-events-auto w-full max-w-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${panelBgClass}`}
          >
            <div
              className={`px-4 sm:px-5 py-3 flex items-start justify-between gap-3 ${headerBarClass}`}
            >
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest ${accentTextClass}`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {artifact.nssdcaId || artifact.catalogRef || artifact.moniker} · {artifact.year}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight mt-0.5 leading-snug text-[#FFFFFF]">
                  {inspectModalTarget.name}
                </h2>
              </div>
              <button
                onClick={closeInspection}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                  isMars
                    ? 'bg-[#1C140F] border-[#44403C] hover:border-[#D97706] text-[#A8A29E] hover:text-[#F5E6D3]'
                    : 'bg-[#1C1D21] border-[#52525B] hover:border-[#BAE6FD] text-[#A1A1AA] hover:text-[#F4F4F5]'
                }`}
                aria-label="Close component inspection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm leading-relaxed max-h-48 overflow-y-auto pr-1">
                {inspectModalTarget.text}
              </p>

              {inspectModalTarget.why && (
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                    isMars
                      ? 'bg-[#1C140F] border-[#44403C] text-[#F5E6D3]'
                      : 'bg-[#27282D] border-[#3F3F46] text-[#E4E4E7]'
                  }`}
                >
                  <strong className={accentTextClass}>Why it matters: </strong>
                  <span>{inspectModalTarget.why}</span>
                </div>
              )}

              {inspectModalTarget.status && (
                <div className={`mt-2 text-[11px] font-mono italic ${mutedTextClass}`}>
                  Status: {inspectModalTarget.status}
                </div>
              )}

              <div
                className={`mt-4 pt-3 border-t ${dividerClass} flex items-center justify-between gap-2 text-[11px] font-mono`}
              >
                <span className={mutedTextClass}>
                  Press <strong className={accentTextClass}>[E]</strong> or click button to close
                </span>
                <button
                  onClick={closeInspection}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${buttonActionClass}`}
                >
                  Continue Exploring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Hint Bar (Ergonomic, non-obstructive) */}
      {isEntered && (
        <div className="absolute bottom-4 inset-x-4 z-20 flex justify-center pointer-events-none">
          <div
            className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-mono flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 ${panelBgClass}`}
          >
            <span>
              <strong className={accentTextClass}>WASD / Arrows</strong> Move
            </span>
            <span>
              <strong className={accentTextClass}>
                {isPointerLocked ? 'Mouse' : 'Click/Drag'}
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
              <strong className={accentTextClass}>E</strong> Inspect Targeted Object
            </span>
            <button
              onClick={toggleFlashlight}
              className={`pointer-events-auto px-2 py-0.5 rounded border transition-colors ${
                isFlashlightOn
                  ? isMars
                    ? 'bg-[#D97706] text-[#1C140F] border-[#F5E6D3]'
                    : 'bg-[#BAE6FD] text-[#1C1D21] border-[#BAE6FD]'
                  : isMars
                  ? 'border-[#57534E] text-[#F5E6D3]'
                  : 'border-[#BAE6FD] text-[#F4F4F5]'
              }`}
            >
              <strong className={accentTextClass}>G</strong> Flashlight ({isFlashlightOn ? 'ON' : 'OFF'})
            </button>
          </div>
        </div>
      )}

      {/* Initial Landing Briefing Overlay */}
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
            <div
              className={`px-6 py-4 flex items-center justify-between gap-2 ${
                isMars
                  ? 'bg-[#1C140F] border-b border-[#44403C]'
                  : 'bg-[#27282D] border-b border-[#3F3F46]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${badgeClass}`}
                >
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
                Step onto the {isMars ? 'Martian regolith' : 'lunar regolith'} to walk the historic site. Aim your crosshair at spacecraft parts and companion equipment to point and inspect what each object is!
              </p>

              <div
                className={`mt-4 p-3.5 rounded-2xl border text-xs font-mono space-y-1.5 ${
                  isMars
                    ? 'bg-[#1C140F] border-[#44403C]'
                    : 'bg-[#27282D] border-[#3F3F46]'
                }`}
              >
                <div>
                  <strong className={accentTextClass}>Aim Crosshair:</strong> Points to parts and reveals their identity
                </div>
                <div>
                  <strong className={accentTextClass}>Press [E]:</strong> Inspect highlighted object in detail
                </div>
                <div>
                  <strong className={accentTextClass}>Press [G]:</strong> Toggle night/shadow Flashlight
                </div>
                <div>
                  <strong className={accentTextClass}>WASD / Space / Shift:</strong> Walk, Jump, Run
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
