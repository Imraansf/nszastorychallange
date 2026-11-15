/**
 * @file SurfaceExplorerGame.tsx
 * @si-attribution Application code and architecture built and structured using Super Intelligence (Google AI Studio / Gemini).
 * All historical mission facts, telemetry values, and storytelling remain human-created/curated.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Artifact } from '../types/space';
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  Flashlight,
  HelpCircle,
  Info,
  X,
  Zap,
} from 'lucide-react';
import {
  playArtifactRememberingWhoosh,
  playFootstepSound,
  playWhooshSound,
} from '../utils/audio';
import {
  DRACO_DECODER_CDN_URL,
  getSpacecraftModelAsset,
  loadValidatedGltf,
} from '../utils/spacecraft-models';
import { SurfaceStoryPostcard } from './SurfaceStoryPostcard';

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
        text: `This is the throttleable rocket engine that slowed me (${nameStr}) down for a gentle touchdown on the lunar dust. My bell nozzle was built to crumple on contact if needed so it would never crack my lower stage.`,
        why: isFalcon
          ? "Engineers stretched my nozzle 10 inches longer than Apollo 11's so I could carry a heavy 16-ton J-mission payload—including the electric Lunar Roving Vehicle!"
          : isIntrepid
          ? "My throttle control let Commander Pete Conrad hover over Surveyor Crater and nail history's first pinpoint planetary landing right next to Surveyor 3."
          : "Because my engine thrust could be throttled smoothly, Neil Armstrong was able to steer me past West Crater's dangerous boulder field and find safe ground.",
      },
      probe: {
        id: 'probe',
        name: 'Lunar surface contact sensing probe',
        text: `Look below my footpads—that thin 5.6-foot (1.7 m) sensor wand was my sense of touch. The instant its tip brushed the lunar soil, a blue 'CONTACT' light flashed inside my cabin.`,
        why: "My own rocket exhaust kicked up so much Moon dust in the final 50 feet that my crew couldn't see the ground clearly; my probe told them the exact second we arrived.",
      },
      pad: {
        id: 'pad',
        name: 'Landing gear footpad',
        text: `Each of my four feet is a wide 37-inch dish made of spun aluminum honeycomb wrapped in gold Kapton foil to spread my weight out like a cosmic snowshoe.`,
        why: "Before Apollo, scientists worried the Moon might be buried in deep, soft quicksand-like dust. My wide footpads sank only 2 to 3 inches!",
      },
      gear: {
        id: 'gear',
        name: 'Landing gear leg and crush struts',
        text: `My cantilever landing legs hold crushable aluminum honeycomb cartridges inside the primary struts that permanently absorb landing shock like one-time springs.`,
        why: isFalcon
          ? "I touched down on an 11-degree crater slope—the steepest landing angle of any Apollo mission—and my crush struts held me steady without flinching."
          : "Using pure mechanical crushable aluminum meant I needed zero complex hydraulics that could leak, freeze, or jam in the airless lunar vacuum.",
      },
      dstage: {
        id: 'dstage',
        name: 'Descent stage thermal foil & equipment bays',
        text: `My octagonal lower body carries propellant tanks and science bays, wrapped in 25 gossamer layers of aluminized Mylar and gold Kapton foil.`,
        why: isFalcon
          ? "My Quadrant 1 bay folded up the Lunar Roving Vehicle like a space-age suitcase, while another bay carried my nuclear ALSEP weather and quake station."
          : "My crinkly gold blanket bounces harsh sunlight straight back into space, protecting my delicate electronics during scorching 120°C lunar afternoons.",
      },
      interface: {
        id: 'interface',
        name: 'Ascent / descent stage separation interface',
        text: `Four explosive bolts and a mechanical guillotine sliced cleanly through my wires and coolant tubes the moment my upper cabin blasted off to return my crew home.`,
        why: "Once separated, my golden bottom half stayed behind permanently on the Moon, serving as a quiet launch pad for my upper half's journey back to orbit.",
      },
      rcs: {
        id: 'rcs',
        name: 'Reaction control thruster quads',
        text: `These four clusters of 100-pound-thrust hypergolic rockets let my pilots pitch, roll, yaw, and nudge me sideways in the vacuum where airplane wings are useless.`,
        why: "Firing in crisp millisecond bursts, these little thrusters gave my astronauts surgical fingertip control while hovering above craters.",
      },
      dock: {
        id: 'dock',
        name: 'Overhead docking hatch and tunnel',
        text: `Atop my ascent stage sits my 32-inch circular docking collar and transfer tunnel—the doorway that connected me to the orbiting Command Module.`,
        why: "Through this snug tunnel, my crew floated across with sealed boxes of Moon rocks without ever needing an extra spacewalk in lunar orbit.",
      },
      dish: {
        id: 'dish',
        name: 'S-band steerable antenna & rendezvous radar',
        text: `My 26-inch steerable parabolic dish beamed my telemetry, crew voices, and live television back to Earth, working alongside my rendezvous radar dish.`,
        why: isFalcon
          ? "Through this dish, Earth watched Commander Dave Scott drop a hammer and a falcon feather to prove Galileo's gravity law right beside me."
          : "During Apollo 11's descent, my rendezvous radar flooded my guidance computer with extra data—triggering the famous 1202 alarms that my smart software survived!",
      },
      vhf: {
        id: 'vhf',
        name: 'VHF communication antenna',
        text: `My whip antennas caught radio waves directly from my astronauts' backpacks and relayed their voices and heartbeat telemetry all the way back to Houston.`,
        why: "I acted like a personal lunar cell tower so my crew could hike across craters and talk clearly with mission control hundreds of meters away.",
      },
      cabin: {
        id: 'cabin',
        name: 'Ascent stage crew cabin',
        text: `Inside this cramped, triangular-windowed pressurized cabin, two astronauts stood upright during descent—skipping heavy seats to save every precious kilogram.`,
        why: isIntrepid
          ? "Between moonwalks, Pete Conrad and Alan Bean slung hammocks across my tiny cabin to catch some sleep on the Ocean of Storms."
          : "When a crucial circuit breaker snapped off during Apollo 11, Buzz Aldrin used a felt-tip pen to push the switch and ignite my ascent engine to bring the crew home.",
      },
    };
  }

  // Surveyor 3
  if (id === 'surveyor-3') {
    return {
      cam: {
        id: 'cam',
        name: 'Surveillance TV camera & steerable mirror',
        text: 'This is my variable-focal-length television camera (25 mm and 100 mm lenses) sitting beneath a movable mirror that let me snap 6,326 pictures of Oceanus Procellarum.',
        why: 'Thirty-one months after I went silent, Apollo 12 astronauts Pete Conrad and Alan Bean unbolted this very camera and carried it home so scientists could study how hardware ages in space.',
      },
      scoop: {
        id: 'scoop',
        name: 'Robotic surface sampler claw & arm',
        text: 'My motor-driven claw and folding accordion arm could reach 5 feet (1.5 m) out and dig 7 inches (18 cm) deep into lunar regolith.',
        why: 'With this scoop I dug four trenches and made 13 impact tests, proving Moon soil had the firmness of damp sand (~10 psi) and would hold Apollo landers safely.',
      },
      solar: {
        id: 'solar',
        name: 'Planar solar panel array',
        text: 'Sitting atop my mast is a 0.85-square-meter panel packed with 792 solar cells that fed my central electronics compartment.',
        why: 'It generated 89 watts of electricity—just enough to charge my silver-zinc battery through the blazing two-week lunar day.',
      },
      pad: {
        id: 'pad',
        name: 'Aluminum honeycomb landing footpad',
        text: 'My three crushable aluminum honeycomb footpads were built to soak up landing impact on unknown lunar terrain.',
        why: 'Bright rocks tricked my radar during touchdown so my engines stayed on—making me bounce twice (once 10 meters into the sky!) before my pads finally settled in the dust.',
      },
      leg: {
        id: 'leg',
        name: 'Tubular aluminum tripod landing leg',
        text: 'My hollow aluminum tripod legs carry hydraulic shock dampers to stabilize my frame upon touchdown.',
        why: 'They kept me upright even though I came to rest tilted inside a 14-degree crater slope.',
      },
      dish: {
        id: 'dish',
        name: 'High-gain planar directional antenna',
        text: 'Mounted beside my solar panel, my flat directional antenna aimed squarely back toward Earth.',
        why: 'It beamed all 6,326 of my television frames across 384,000 kilometers to NASA tracking dishes at Goldstone, California.',
      },
      frame: {
        id: 'frame',
        name: 'Tubular aluminum spaceframe chassis',
        text: 'My open triangular aluminum truss frame holds my propellant tanks, helium sphere, and flight-control electronics in plain sight.',
        why: 'Because my skeleton was completely open, Apollo 12 astronauts could walk right up and inspect my wiring and tubes with wire cutters.',
      },
    };
  }

  // Viking 1 Lander
  if (id === 'viking-1-lander') {
    return {
      rtg: {
        id: 'rtg',
        name: 'SNAP-19 radioisotope thermoelectric generators',
        text: 'These two Plutonium-238 nuclear batteries tucked under wind shields gave me nonstop electricity and comforting warmth through freezing Martian nights.',
        why: 'Unlike solar panels that get choked by dust and winter darkness, my twin RTGs kept me alive for more than six straight years on Chryse Planitia.',
      },
      dish: {
        id: 'dish',
        name: 'High-gain parabolic S-band antenna dish',
        text: 'My 0.76-meter steerable dish pointed straight across deep space toward Earth to talk directly with NASA Deep Space Network antennas.',
        why: 'I kept transmitting until November 1982, when a routine software command from Earth accidentally overwrote my pointing data, turning my dish away and ending my six-year run.',
      },
      bio_lab: {
        id: 'bio_lab',
        name: 'Biology & GCMS chemical laboratory',
        text: 'Inside my belly sits a miniature automated biology and chemistry lab that tested Martian dirt for signs of microbes, photosynthesis, and organic carbon.',
        why: 'With these tiny ovens and sensors, I carried out humanity’s very first direct search for life in the soil of another planet.',
      },
      scoop: {
        id: 'scoop',
        name: '3-meter robotic surface sampler arm & scoop',
        text: 'My 3-meter telescoping boom—made from two curled stainless-steel tapes—reached out to dig trenches and scoop Martian soil into my onboard lab.',
        why: 'I carved deep trenches through crusty red duricrust, pushed aside rocks, and dropped fresh soil into my chemical analyzers.',
      },
      cam: {
        id: 'cam',
        name: 'Facsimile color stereo scanning camera',
        text: 'My twin cylindrical scanning cameras swept a tiny nodding mirror up and down to build crisp stereo pictures line by line.',
        why: 'On July 20, 1976, this camera captured humanity’s very first color photograph from the surface of Mars.',
      },
      descent_engine: {
        id: 'descent_engine',
        name: 'Terminal descent monopropellant engines',
        text: 'Instead of one giant rocket bell, each of my three hydrazine landing engines split exhaust through 18 tiny nozzles.',
        why: 'Breaking the blast into 18 gentle jets prevented me from digging a crater beneath myself or blowing away the untouched soil I came to study.',
      },
      leg: {
        id: 'leg',
        name: 'Inverted tripod landing leg & footpad',
        text: 'My three aluminum legs hold crushable honeycomb shock absorbers anchored to broad inverted dish footpads.',
        why: 'They planted me firmly in the rocks of Chryse Planitia through six years of howling Martian dust storms.',
      },
    };
  }

  // Mars Pathfinder & Sojourner
  if (id === 'mars-pathfinder-sojourner') {
    return {
      sojourner_body: {
        id: 'sojourner_body',
        name: 'Sojourner rover chassis & Warm Electronics Box',
        text: 'I am Sojourner—only 10.6 kg (23 lbs) and the size of a microwave oven, packing my computer, radio modems, and three cameras inside an insulated box.',
        why: 'Rolling down my lander’s ramp in July 1997, I became the first wheeled vehicle ever driven on Mars, exploring 100 meters of ancient floodplain.',
      },
      sojourner_wheels: {
        id: 'sojourner_wheels',
        name: '6-wheel rocker-bogie mobility drive',
        text: 'My six aluminum wheels each have their own electric motor and spiked treads mounted on an articulated rocker-bogie suspension.',
        why: 'This clever linkage let my tiny frame clamber over boulders taller than my own wheels without ever tipping over.',
      },
      sojourner_apxs: {
        id: 'sojourner_apxs',
        name: 'Alpha Proton X-Ray Spectrometer (APXS)',
        text: 'My robotic arm pressed this spectrometer nose right up against Martian boulders to sniff out the exact elements inside the rock.',
        why: 'When I nudged rocks nicknamed Barnacle Bill and Yogi, I proved Mars had volcanic andesite and a complex geological past.',
      },
      sojourner_solar: {
        id: 'sojourner_solar',
        name: 'Gallium arsenide solar panel array',
        text: 'The flat solar panel riding on my back gave me 16 watts of peak noon power—barely enough to light a nightlight, yet enough to drive across Mars.',
        why: 'I was built to last 7 Martian sols, but my solar deck kept me roving and sending science for 83 sols—nearly 12 times longer!',
      },
      petals: {
        id: 'petals',
        name: 'Lander triangular solar petals',
        text: 'My Carl Sagan Memorial Station folded into a pyramid during landing, then unfolded three triangular solar-covered petals like a blooming metal flower.',
        why: 'No matter which way my airbags came to rest, opening these motorized petals automatically flipped me right-side up.',
      },
      imp_cam: {
        id: 'imp_cam',
        name: 'Imager for Mars Pathfinder (IMP) stereo camera',
        text: 'Popping up on a 2.6-foot mast, my twin color stereo eyes gave Mars mission engineers true 3D depth perception.',
        why: 'I beamed back 16,500 vivid images so drivers back on Earth wearing 3D glasses could steer little Sojourner safely around rocks.',
      },
      airbags: {
        id: 'airbags',
        name: 'Impact airbag deflation system',
        text: 'Twenty-four interconnected Kevlar airbag lobes wrapped around me for landing, cushions that absorbed a 31 mph slam into Mars.',
        why: 'I bounced 15 times—soaring up to 50 feet high!—proving low-cost airbags could land spacecraft safely without heavy retro-rockets.',
      },
      lander_body: {
        id: 'lander_body',
        name: 'Carl Sagan Memorial Station central core',
        text: 'Here in my central core sit my weather sensors, Earth-link radio transmitter, and the deployable ramps that rolled Sojourner onto Mars.',
        why: 'Shortly after I touched down on July 4, 1997, NASA named my stationary lander base in honor of astronomer Carl Sagan.',
      },
    };
  }

  // Spirit & Opportunity
  if (id === 'spirit-and-opportunity') {
    return {
      pancam: {
        id: 'pancam',
        name: 'Panoramic camera (Pancam) & Navcam stereo mast',
        text: 'Rising 1.5 meters above my deck, my stereo Pancam and Navcam eyes let me look across Mars at human eye level.',
        why: 'With this rotating head I captured sweeping crater panoramas, blue Martian sunsets, and swirling dust devils racing across the plains.',
      },
      wheels: {
        id: 'wheels',
        name: 'Independent motorized cleated aluminum wheels',
        text: 'Each of my six machined aluminum wheels has spiral shock-absorbing spokes and its own brushless motor.',
        why: 'Opportunity rolled 45.16 kilometers (28.06 miles) on these wheels—setting an off-world driving record that stood for years.',
      },
      bogie_rocker: {
        id: 'bogie_rocker',
        name: 'Rocker-bogie articulated suspension',
        text: 'My titanium rocker-bogie joints keep all six wheels pressed onto jagged rocks while keeping my rover body gently balanced.',
        why: 'Even after Spirit’s right-front wheel froze in 2006, dragging it backwards accidentally scraped up bright white silica—proving ancient hot springs once bubbled there.',
      },
      solar_wings: {
        id: 'solar_wings',
        name: 'Gull-wing multi-junction solar array',
        text: 'My wide gull-wing solar panels span 2.3 meters and were sized to harvest up to 900 watt-hours per Martian day.',
        why: 'We were only planned for 90 sols, yet lucky Martian whirlwinds kept sweeping dust off my wings—stretching Opportunity’s life to nearly 15 years!',
      },
      web_body: {
        id: 'web_body',
        name: 'Warm Electronics Box (WEB) & aerogel insulation',
        text: 'My insulated body keeps my computers and batteries cozy inside silica aerogel walls and tiny isotope heaters during -100°C nights.',
        why: 'Aerogel is 99.8% air—light as smoke, yet strong enough thermally to shield my electronic brain through brutal Martian winters.',
      },
      arm_rat: {
        id: 'arm_rat',
        name: 'Instrument arm & Rock Abrasion Tool (RAT)',
        text: 'My five-jointed robotic arm stretches out like a geologist’s hand, carrying a microscope, spectrometers, and a spinning diamond grinder.',
        why: 'Grinding 5 mm holes into weathered rocks let me inspect fresh inner minerals that confirmed liquid water once soaked Mars.',
      },
      hga_dish: {
        id: 'hga_dish',
        name: 'High-gain steerable parabolic X-band dish',
        text: 'My steerable X-band dish aimed directly toward Earth, supplementing the orbital relays flying overhead.',
        why: 'Across more than 14 years of exploration, my radios delivered hundreds of thousands of images and treasure troves of geology data.',
      },
    };
  }

  // Phoenix Mars Lander
  if (id === 'phoenix-mars-lander') {
    return {
      dig_arm: {
        id: 'dig_arm',
        name: '2.35-meter robotic digging arm & rasp scoop',
        text: 'My 2.35-meter titanium-and-aluminum arm ends in a sharp tungsten rasp and scoop strong enough to chip into frozen Arctic permafrost.',
        why: 'Just two inches beneath the red dust, I scraped up bright white chunks of pure water ice—and watched them vanish into vapor over four days.',
      },
      solar_oct: {
        id: 'solar_oct',
        name: 'Twin octagonal ultra-thin solar arrays',
        text: 'My two huge 5.5-meter octagonal solar wings unfolded like paper fans shortly after I touched down in Vastitas Borealis.',
        why: 'They soaked up the 24-hour midnight sun of the Martian Arctic summer until dark autumn frost finally settled over my deck.',
      },
      tega_lab: {
        id: 'tega_lab',
        name: 'Thermal and Evolved Gas Analyzer (TEGA)',
        text: 'My eight tiny ovens baked scooped Arctic soil all the way to 1,000°C while a mass spectrometer sniffed every puff of gas.',
        why: 'Seeing pure water vapor rise from heated dirt inside my ovens gave scientists hands-on proof of Martian water ice.',
      },
      meca_lab: {
        id: 'meca_lab',
        name: 'MECA wet chemistry lab & microscope',
        text: 'I carried four tiny beakers to mix Mars soil with Earth water, plus an atomic-force microscope seeing grains just 10 nanometers wide.',
        why: 'My beakers discovered perchlorate salts in the dirt—chemicals that lower water’s freezing point and could be useful for future explorers.',
      },
      lidar_mast: {
        id: 'lidar_mast',
        name: 'Meteorological lidar station mast',
        text: 'My Canadian-built weather mast fired green laser pulses straight up into the polar sky to watch dust and clouds drift overhead.',
        why: 'My laser caught real water-ice snow falling from high Martian cirrus clouds before evaporating in mid-air!',
      },
      leg: {
        id: 'leg',
        name: 'Tripod landing legs & pulse descent thrusters',
        text: 'My three legs and pulsed hydrazine engines eased me down gently to the Arctic plains without using bouncing airbags.',
        why: 'As I touched down, my thruster blast swept away loose dust—exposing a smooth slab of white water ice right beneath my belly.',
      },
    };
  }

  // InSight Lander
  if (id === 'insight-lander') {
    return {
      seis_dome: {
        id: 'seis_dome',
        name: 'SEIS seismometer dome & Wind/Thermal Shield',
        text: 'My ultra-sensitive French seismometer hides inside a vacuum sphere under a shiny gold-rimmed dome to stay calm in the Martian wind.',
        why: 'Placed directly on the ground, it felt over 1,300 marsquakes and meteorite hits—letting me take Mars’s pulse and map its liquid iron core.',
      },
      solar_ultraflex: {
        id: 'solar_ultraflex',
        name: 'Twin circular Ultraflex solar arrays',
        text: 'My two 2.15-meter circular solar wings snapped open like pleated hand fans right after landing on Elysium Planitia.',
        why: 'They powered me at 4,500 watt-hours per sol at first, until four years of settling red dust slowly dimmed my light to silence in December 2022.',
      },
      arm_ida: {
        id: 'arm_ida',
        name: 'Instrument Deployment Arm (IDA) & grapple',
        text: 'My 1.8-meter robotic arm uses a five-fingered claw grapple and wrist camera to lift heavy gear gently off my deck.',
        why: 'I became the first spacecraft on Mars to pick up science instruments and set them carefully onto the planet’s ground.',
      },
      hp3_probe: {
        id: 'hp3_probe',
        name: 'HP3 Heat Flow Probe ("The Mole")',
        text: 'Built by DLR in Germany, my self-hammering cylinder was designed to burrow down into the crust to measure Mars’s internal heat.',
        why: 'Unexpectedly cement-hard soil pushed back against the Mole, leading my Earth team to creatively press my robotic scoop down to help it dig.',
      },
      rise_antenna: {
        id: 'rise_antenna',
        name: 'RISE radio science medium-gain X-band antennas',
        text: 'My twin horn antennas bounced precision X-band radio signals back and forth with NASA tracking stations on Earth.',
        why: 'Tracking tiny Doppler shifts showed how Mars’s north pole wobbles by inches—confirming the planet holds a molten liquid core.',
      },
      chassis: {
        id: 'chassis',
        name: 'Avionics deck & electronics chassis',
        text: 'My hexagonal body holds my flight computers, batteries, landing radar, and air-pressure sensors.',
        why: 'Using my pressure sensors and seismometer together, I sent home humanity’s first direct audio recordings of Martian wind.',
      },
    };
  }

  // Ingenuity Mars Helicopter
  if (id === 'ingenuity-mars-helicopter') {
    return {
      rotors: {
        id: 'rotors',
        name: 'Counter-rotating carbon-fiber rotor blades',
        text: 'My two 1.2-meter carbon-fiber blades spin in opposite directions at 2,400 to 2,700 RPM—around five times faster than an Earth helicopter.',
        why: 'Mars’s air is less than 1% as thick as Earth’s at sea level, so my blades had to whip wildly just to lift my 1.8 kg frame.',
      },
      solar_panel: {
        id: 'solar_panel',
        name: 'Top solar panel & antenna mast',
        text: 'Sitting above my spinning rotors is a compact solar wing connected to six lithium-ion batteries nestled inside my body.',
        why: 'Every sunny afternoon it soaked up just enough charge to keep my heaters warm through -90°C Jezero Crater nights and fuel another flight.',
      },
      fuselage: {
        id: 'fuselage',
        name: 'Fuselage avionics cube & processors',
        text: 'Inside this 14-centimeter tissue-box cube live smartphone-class processors, a laser altimeter, and my autonomous flight brain.',
        why: 'Radio signals take 5 to 20 minutes between Earth and Mars, so nobody could joystick me—I piloted every single takeoff and landing myself!',
      },
      legs: {
        id: 'legs',
        name: 'Four carbon-fiber landing legs & compliant dampeners',
        text: 'My four springy carbon-fiber legs splay outward with flexible joints to soak up the bump of landing on sand and boulders.',
        why: 'They carried me safely through 72 historic flights until rotor blade damage on Flight 72 finally grounded me at Valinor Hills.',
      },
      nav_camera: {
        id: 'nav_camera',
        name: 'Downward high-speed navigation camera',
        text: 'My downward camera snapped 30 black-and-white frames every second, tracking pebbles and sand ripples rushing beneath me.',
        why: 'Without GPS on Mars, I navigated entirely by watching the ground move beneath my lens.',
      },
      wright_fabric: {
        id: 'wright_fabric',
        name: 'Wright Brothers 1903 Flyer fabric compartment',
        text: 'Tucked under my solar panel in Kapton tape is a postage-stamp swatch of muslin from the wing of the original 1903 Wright Flyer.',
        why: 'Carrying a piece of Kitty Hawk into Martian skies bridged 117 years from humanity’s first airplane to the first powered flight on another world.',
      },
    };
  }

  // Fallback generic parts dictionary
  return {
    chassis: {
      id: 'chassis',
      name: `${artifact.moniker} Main Chassis`,
      text: `This is my central structural core housing my computers, batteries, and radio transmitters.`,
      why: 'Engineers built my hull to endure airless vacuum, cosmic radiation, and brutal day-to-night temperature swings.',
    },
    antenna: {
      id: 'antenna',
      name: 'Communications Antenna System',
      text: 'This is my radio dish that beamed science telemetry back to Earth across millions of kilometers.',
      why: 'It carried my high-resolution images and discoveries home to NASA Deep Space Network antennas.',
    },
    power: {
      id: 'power',
      name: 'Surface Power System',
      text: 'This is my solar or nuclear power source that kept my scientific instruments awake.',
      why: 'Reliable energy let me keep gathering science long after touchdown.',
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
      'memorial_marker',
      'Apollo 11 Surface Marker & Telescoping Rod',
      -8.5,
      -5.0,
      2.5,
      'Neil Armstrong and Buzz Aldrin set up this ceremonial surface marker right beside me, using a horizontal telescoping rod across the top because there is no breeze in the airless lunar vacuum.',
      'When my upper stage blasted back to orbit, the rocket exhaust knocked the assembly down—and after 50+ years of unfiltered solar UV, the fabric has likely bleached to chalk white.',
      'Resting in the regolith beside me, bleached chalk white by unfiltered sunlight.',
      (grp) => {
        const markerMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 0.95),
          new THREE.MeshStandardMaterial({
            color: 0xe5e7eb,
            side: THREE.DoubleSide,
            roughness: 0.95,
          })
        );
        markerMesh.rotation.x = -Math.PI / 2 + 0.12;
        markerMesh.position.set(0.9, 0.1, 0);
        markerMesh.castShadow = true;
        const pole = cyl(0.015, 2.1, grey, 6);
        pole.rotation.z = Math.PI / 2;
        pole.position.set(0.3, 0.08, -0.5);
        grp.add(markerMesh, pole);
        return markerMesh;
      }
    );

    addItem(
      'psep',
      'Passive Seismic Experiment Package (PSEP)',
      16.0,
      -4.0,
      2.5,
      'My astronauts carried this solar-powered seismometer away from my hull so it could listen quietly for moonquakes, tidal vibrations, and meteorite impacts.',
      'It stayed awake for 21 days before the -170°C lunar night silenced it—giving scientists the first proof that the Moon trembles inside.',
      'Quiet since August 1969; standing sentinel beside me on Mare Tranquillitatis.',
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
      'Packed with 100 quartz corner-cube prisms, my mirror panel needs zero electricity—telescopes on Earth still shoot laser pulses at it and time every bounce back.',
      'I am still helping science today! Those laser bounces prove the Moon is drifting away from Earth at 3.8 centimeters every year—about as fast as your fingernails grow.',
      'Still working after 55+ years; routinely pinged by Earth laser observatories.',
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
      'These bulky white backpacks kept Neil and Buzz breathing, cool, and talking over radio during humanity’s very first 2.5-hour moonwalk.',
      'Before my top half lifted off, my crew tossed these heavy packs out the hatch so we could carry 21.55 kg of priceless Moon rocks home instead.',
      'Resting untouched in the lunar soil just outside my front ladder.',
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
      'Right across this crater slope sits Surveyor 3, who waited silently for 2.5 years until my astronauts Pete Conrad and Alan Bean walked down from my ladder to pay a visit.',
      'My crew snipped off Surveyor 3’s television camera and soil scoop to carry back to Earth, showing scientists how spacecraft survive years in deep vacuum.',
      'Standing beside me on the crater wall; its camera now greets visitors at the Smithsonian.',
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
      'My crew set up this nuclear-powered ALSEP weather and moonquake station with a 73-watt Plutonium-238 generator so it could survive freezing two-week lunar nights.',
      'It radioed continuous seismic, magnetic, and solar-wind measurements back to Earth for nearly eight straight years until September 1977.',
      'Mission complete since 1977; resting quietly beside me on the Ocean of Storms.',
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
      'I carried the very first Moon Buggy tucked into my side bay—an electric 4-wheel rover powered by two 36-volt batteries that drove my crew 27.9 km across Hadley-Apennine.',
      'When my astronauts left, they parked LRV-1 100 meters away so its remote-controlled TV camera could film my upper stage blasting off into lunar orbit!',
      'Parked permanently near me at Hadley-Apennine with its camera still aimed at my launch pad.',
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
      'Just 8.5 cm (3.3 inches) tall, this tiny aluminum sculpture rests beside a plaque listing 14 brave astronauts and cosmonauts who gave their lives exploring space.',
      'Commander David Scott placed it gently in the lunar dust without fanfare—the only official work of art created specifically for the Moon.',
      'Resting peacefully in the quiet dust beneath Mt. Hadley.',
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
      'Right here in front of my TV camera, Commander David Scott held out a 1.3 kg geology hammer and a 30-gram falcon feather and let go at the exact same instant.',
      'Without air resistance on the Moon, both hit the dust together—proving Galileo’s 400-year-old gravity discovery live on Earth television!',
      'Hammer and feather still rest side-by-side right where they fell in 1971.',
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
      'This shallow ring in the lunar dust marks where my footpads first struck the Moon before bright rocks tricked my radar and launched me 10 meters back into the sky!',
      'My still-firing vernier engines made me bounce twice across the crater before I finally settled softly—leaving three sets of footprints in the vacuum.',
      'My bouncing footprints remain crisp and unweathered in the airless Moon dust.',
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
      'Using my folding claw arm, I carved four neat trenches up to 18 cm deep right beside my frame.',
      'Digging these walls proved the Moon’s surface soil would hold firm under future Apollo Lunar Modules without swallowing them up.',
      'My 1967 trenches still hold their sharp edges right next to me.',
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
      'I reached out with my 3-meter steel tape boom to carve this trench through crusty Martian dirt and scoop samples into my biology lab.',
      'My chemical ovens discovered reactive oxidizers in the Martian soil that fizzed like living microbes when wet, rewriting how we search for life on Mars.',
      'Decades of gentle Martian wind have softly dusted my old trench.',
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
      'I used these painted color chips and reference mirrors to check my cameras under Mars’s shifting light.',
      'Comparing these colors proved the Martian sky really is dusty butterscotch-pink—settling a big debate among scientists back in 1976!',
      'Lightly coated by regional dust storms across Chryse Planitia.',
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
      'When I (Sojourner) rolled up to this bear-shaped boulder nicknamed Yogi, I backed my spectrometer nose right up against its face to read its chemistry.',
      'The rounded pebbles scattered around Yogi and Ares Vallis helped prove roaring ancient floods once washed across this Martian valley.',
      'Standing guard beside Carl Sagan Memorial Station in Ares Vallis.',
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
      'Twenty-four tough Kevlar airbag lobes wrapped around me when I slammed into Mars at 31 mph—bouncing 15 times before coming to rest.',
      'Once I stopped rolling, I pulled these airbags flat so my triangular solar petals could open and launch little Sojourner.',
      'Resting deflated beside my solar petals on the red floodplain.',
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
      'My cameras spotted millions of tiny BB-sized gray spheres scattered like blueberries across the soil of Meridiani Planum.',
      'When my spectrometers checked them, they turned out to be iron-rich hematite concretions that only grow inside standing ancient water!',
      'Billions of these mineral spheres still carpet the plains around me.',
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
      'I pressed my spinning diamond-tipped Rock Abrasion Tool onto this stone to brush away dust and carve a neat 45 mm wide, 5 mm deep inspection window.',
      'Peeking underneath the weathered red rind exposed fresh inner rock grains formed when ancient Mars was warm and wet.',
      'Clean circular grind mark preserved right in the Martian bedrock.',
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
      'Right here in Vastitas Borealis, my robotic arm scraped aside two inches of Arctic dirt and revealed bright chunks of frozen water ice.',
      'Over four days of photos, my cameras watched those white ice chunks sublimate into thin air—giving humanity touchable proof of Martian water ice.',
      'Frozen water-ice table resting safely beneath the polar dust.',
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
      'Using my robotic arm, I lifted my super-sensitive SEIS seismometer off my deck, set it gently on Mars, and tucked it beneath this wind-blocking gold dome.',
      'Listening quietly to the planet beneath me, it recorded over 1,300 marsquakes and revealed the size of Mars’s crust, mantle, and liquid core.',
      'Resting gently on Elysium Planitia beside my dust-covered solar wings.',
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
      'Right on this 10-meter dusty patch of Jezero Crater on April 19, 2021, I spun my rotors up to 2,537 RPM and rose 3 meters into the thin Martian sky.',
      'That 39-second hop proved powered aerodynamic flight works on another planet—and launched me onto 72 unforgettable flights!',
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
const DESKTOP_MEDIA_QUERY = '(min-width: 1025px) and (pointer: fine)';

export const SurfaceExplorerGame: React.FC<SurfaceExplorerGameProps> = ({
  artifact,
  onClose,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isMars = artifact.body === 'mars';

  const [isTouchOrCompact, setIsTouchOrCompact] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.matchMedia(DESKTOP_MEDIA_QUERY).matches : false
  );
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches : true
  );
  const [isMobileHintVisible, setIsMobileHintVisible] = useState<boolean>(true);
  const [mobileHintResetCount, setMobileHintResetCount] = useState<number>(0);
  const [isStoryPostcardOpen, setIsStoryPostcardOpen] = useState<boolean>(true);

  // Game UI States
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [isRunToggled, setIsRunToggled] = useState(false);
  const [isJumpPressed, setIsJumpPressed] = useState(false);
  const [joystickKnob, setJoystickKnob] = useState<{
    x: number;
    y: number;
    active: boolean;
    sprinting: boolean;
  }>({ x: 0, y: 0, active: false, sprinting: false });
  const [hoveredTarget, setHoveredTarget] = useState<InspectableTarget | null>(null);
  const [inspectModalTarget, setInspectModalTarget] = useState<InspectableTarget | null>(null);
  const [hudCoords, setHudCoords] = useState<string>(
    formatOffsetCoords(artifact.coordinates.lat, artifact.coordinates.lon, 14, 20, isMars)
  );
  const [siteItemsList, setSiteItemsList] = useState<{ id: string; name: string }[]>([]);
  const [craftPartsList, setCraftPartsList] = useState<{ id: string; name: string }[]>([]);
  const [seenItemIds, setSeenItemIds] = useState<string[]>([]);
  const [seenPartIds, setSeenPartIds] = useState<string[]>([]);

  // Mutable refs for high-frequency game loop
  const isTouchOrCompactRef = useRef(isTouchOrCompact);
  isTouchOrCompactRef.current = isTouchOrCompact;
  const flashlightOnRef = useRef(isFlashlightOn);
  flashlightOnRef.current = isFlashlightOn;
  const runToggleRef = useRef(isRunToggled);
  runToggleRef.current = isRunToggled;
  const inspectModalRef = useRef(inspectModalTarget);
  inspectModalRef.current = inspectModalTarget;
  const seenItemIdsRef = useRef<Set<string>>(new Set());
  const seenPartIdsRef = useRef<Set<string>>(new Set());

  // Multi-touch pointerId & virtual thumbstick refs
  const joystickPointerIdRef = useRef<number | null>(null);
  const actionPointerIdsRef = useRef<Set<number>>(new Set());
  const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const joySprintRef = useRef<boolean>(false);
  const triggerJumpRef = useRef<() => void>(() => {});
  const triggerInspectRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const desktopMql = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const mobileOrTouch = !e.matches;
      setIsTouchOrCompact(mobileOrTouch);
      setIsChecklistOpen(!mobileOrTouch);
      if (mobileOrTouch) {
        setIsMobileHintVisible(true);
        setMobileHintResetCount((c) => c + 1);
      }
    };
    const initialMobile = !desktopMql.matches;
    setIsTouchOrCompact(initialMobile);
    setIsChecklistOpen(!initialMobile);
    desktopMql.addEventListener('change', handleMediaChange);
    return () => desktopMql.removeEventListener('change', handleMediaChange);
  }, []);

  // Auto-fade mobile control hint pill after 6 seconds on touch/compact screens
  useEffect(() => {
    setIsMobileHintVisible(true);
    if (!isTouchOrCompact) return;
    const timer = window.setTimeout(() => {
      setIsMobileHintVisible(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [artifact.id, isTouchOrCompact, mobileHintResetCount]);

  useEffect(() => {
    setIsStoryPostcardOpen(true);
  }, [artifact.id]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore cancellation failures
        }
      }
    };
  }, []);

  const handleExit = useCallback(() => {
    setIsStoryPostcardOpen(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        window.setTimeout(() => {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // Ignore delayed cancellation failures
          }
        }, 40);
      } catch {
        // Ignore cancellation failures
      }
    }
    playWhooshSound('out');
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    onClose();
  }, [onClose]);

  const toggleFlashlight = useCallback(() => {
    setIsFlashlightOn((prev) => {
      const next = !prev;
      playWhooshSound('ui');
      return next;
    });
  }, []);

  const toggleRun = useCallback(() => {
    setIsRunToggled((prev) => {
      const next = !prev;
      playWhooshSound('ui');
      return next;
    });
  }, []);

  const resetJoystick = useCallback(() => {
    joystickPointerIdRef.current = null;
    joyVecRef.current = { x: 0, y: 0 };
    joySprintRef.current = false;
    setJoystickKnob({ x: 0, y: 0, active: false, sprinting: false });
  }, []);

  const openInspection = useCallback(
    (target: InspectableTarget) => {
      playArtifactRememberingWhoosh();
      resetJoystick();
      if (target.type === 'site_item') {
        if (!seenItemIdsRef.current.has(target.id)) {
          seenItemIdsRef.current.add(target.id);
          setSeenItemIds(Array.from(seenItemIdsRef.current));
        }
      } else if (!seenPartIdsRef.current.has(target.id)) {
        seenPartIdsRef.current.add(target.id);
        setSeenPartIds(Array.from(seenPartIdsRef.current));
      }
      setInspectModalTarget(target);
    },
    [resetJoystick]
  );

  const closeInspection = useCallback(() => {
    playWhooshSound('out');
    setInspectModalTarget(null);
    if (!isTouchOrCompactRef.current) {
      const canvas = mountRef.current?.querySelector('canvas');
      canvas?.requestPointerLock?.();
    }
  }, []);

  const updateJoystickFromPointer = useCallback(
    (clientX: number, clientY: number, baseEl: HTMLElement) => {
      const rect = baseEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxRadius = rect.width / 2;
      const knobTravel = Math.max(20, maxRadius - 14);
      const rawDx = clientX - cx;
      const rawDy = clientY - cy;
      const rawDist = Math.hypot(rawDx, rawDy);
      const clampedDist = Math.min(rawDist, knobTravel);
      const angle = rawDist > 0.001 ? Math.atan2(rawDy, rawDx) : 0;
      const visX = Math.cos(angle) * clampedDist;
      const visY = Math.sin(angle) * clampedDist;

      const normDist = Math.min(1, rawDist / knobTravel);
      const deadzone = 0.08;
      const effectiveMag =
        normDist < deadzone ? 0 : (normDist - deadzone) / (1 - deadzone);
      const nx = rawDist > 0.001 ? (rawDx / rawDist) * effectiveMag : 0;
      const ny = rawDist > 0.001 ? -(rawDy / rawDist) * effectiveMag : 0;

      const sprinting = rawDist >= maxRadius * 0.85 || normDist >= 0.85;
      joyVecRef.current = { x: nx, y: ny };
      joySprintRef.current = sprinting;
      setJoystickKnob({ x: visX, y: visY, active: true, sprinting });
    },
    []
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    seenItemIdsRef.current = new Set();
    seenPartIdsRef.current = new Set();
    setSeenItemIds([]);
    setSeenPartIds([]);
    setInspectModalTarget(null);
    setHoveredTarget(null);
    playWhooshSound('in');

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

    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.userSelect = 'none';
    (
      renderer.domElement.style as CSSStyleDeclaration & {
        webkitUserSelect?: string;
        webkitTouchCallout?: string;
      }
    ).webkitUserSelect = 'none';
    (
      renderer.domElement.style as CSSStyleDeclaration & {
        webkitTouchCallout?: string;
      }
    ).webkitTouchCallout = 'none';
    container.replaceChildren();
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
    setCraftPartsList(
      Object.values(craftPartsMap).map((p) => ({ id: p.id, name: p.name }))
    );

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
          dracoLoader.dispose();
        })
        .catch(() => {
          dracoLoader.dispose();
        });
    }

    // 9. COMPANION GROUND SITE ITEMS REGISTRATION
    const siteItems = buildMissionSiteItems(artifact, scene, sampleH, isMars);
    setSiteItemsList(siteItems.map((it) => ({ id: it.id, name: it.name })));

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
    let mouseLookActive = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let touchLookPointerId: number | null = null;
    let lastTouchLookX = 0;
    let lastTouchLookY = 0;

    // Raycaster for Crosshair Point-and-Inspect
    const raycaster = new THREE.Raycaster();
    raycaster.far = 12;
    const probeOffsets = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.032, 0),
      new THREE.Vector2(-0.032, 0),
      new THREE.Vector2(0, 0.032),
      new THREE.Vector2(0, -0.032),
    ];
    const _camFwd = new THREE.Vector3();
    const _dVec = new THREE.Vector3();

    const triggerJump = () => {
      if (player.onGround) {
        player.vel.y = isMars ? 3.8 : 3.4;
        player.onGround = false;
      }
    };
    triggerJumpRef.current = triggerJump;

    const triggerInspect = () => {
      if (inspectModalRef.current) {
        closeInspection();
      } else if (activeTargetRef.current) {
        openInspection(activeTargetRef.current);
      }
    };
    triggerInspectRef.current = triggerInspect;

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === 'KeyG') {
        toggleFlashlight();
      }
      if (e.code === 'KeyE') {
        triggerInspect();
      }
      if (e.code === 'Space' && player.onGround) {
        e.preventDefault();
        triggerJump();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onCanvasPointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      if (e.pointerType === 'mouse') {
        if (e.button !== 0) return;
        mouseLookActive = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (!isTouchOrCompactRef.current && document.pointerLockElement !== renderer.domElement) {
          renderer.domElement.requestPointerLock?.();
        }
      } else {
        if (
          e.pointerId === joystickPointerIdRef.current ||
          actionPointerIdsRef.current.has(e.pointerId)
        ) {
          return;
        }
        if (touchLookPointerId === null) {
          e.preventDefault();
          touchLookPointerId = e.pointerId;
          lastTouchLookX = e.clientX;
          lastTouchLookY = e.clientY;
          try {
            renderer.domElement.setPointerCapture(e.pointerId);
          } catch {
            // Ignore capture failures on synthetic events
          }
        }
      }
    };

    const onWindowPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement === renderer.domElement) {
          player.yaw -= e.movementX * 0.0022;
          player.pitch = THREE.MathUtils.clamp(
            player.pitch - e.movementY * 0.0022,
            -1.45,
            1.45
          );
        } else if (mouseLookActive) {
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
          player.yaw -= dx * 0.0032;
          player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0032, -1.45, 1.45);
        }
      } else if (e.pointerId === touchLookPointerId) {
        const dx = e.clientX - lastTouchLookX;
        const dy = e.clientY - lastTouchLookY;
        lastTouchLookX = e.clientX;
        lastTouchLookY = e.clientY;
        player.yaw -= dx * 0.0036;
        player.pitch = THREE.MathUtils.clamp(player.pitch - dy * 0.0036, -1.45, 1.45);
      }
    };

    const onWindowPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        mouseLookActive = false;
      } else if (e.pointerId === touchLookPointerId) {
        touchLookPointerId = null;
        try {
          if (renderer.domElement.hasPointerCapture(e.pointerId)) {
            renderer.domElement.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore release failures
        }
      }
    };

    const onLostPointerCapture = (e: PointerEvent) => {
      if (e.pointerId === touchLookPointerId) {
        touchLookPointerId = null;
      }
    };

    const onPointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === renderer.domElement);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown);
    renderer.domElement.addEventListener('lostpointercapture', onLostPointerCapture);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerEnd);
    window.addEventListener('pointercancel', onWindowPointerEnd);
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
    let lastLockedTargetKey = '';

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

      // Player movement (Desktop Keyboard + Mobile Virtual Thumbstick)
      const keyFw =
        (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
        (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
      const keySt =
        (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
        (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
      const fw = Math.max(-1, Math.min(1, keyFw + joyVecRef.current.y));
      const st = Math.max(-1, Math.min(1, keySt + joyVecRef.current.x));
      const isRunning = Boolean(
        keys['ShiftLeft'] ||
          keys['ShiftRight'] ||
          runToggleRef.current ||
          joySprintRef.current
      );
      const sp = isRunning ? 6.5 : 3.2;

      const wx = -Math.sin(player.yaw) * fw + Math.cos(player.yaw) * st;
      const wz = -Math.cos(player.yaw) * fw - Math.sin(player.yaw) * st;
      const n = Math.hypot(wx, wz) || 1;
      const moveMag = Math.min(1, Math.hypot(fw, st));
      const k = player.onGround ? Math.min(1, dt * 7) : dt * 0.25;

      player.vel.x += ((wx / n) * sp * moveMag - player.vel.x) * k;
      player.vel.z += ((wz / n) * sp * moveMag - player.vel.z) * k;

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

      // Boot footprints & walking footstep sound
      if (player.onGround && Math.hypot(player.pos.x - lastPrintPos.x, player.pos.z - lastPrintPos.z) > 0.85) {
        lastPrintPos.copy(player.pos);
        printStepSide *= -1;
        playFootstepSound(isMars);
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

        let detectedTarget: InspectableTarget | null = null;

        // 1. Raycast spacecraft components if within 22 meters
        const distToCraft = Math.hypot(player.pos.x - craftBounds.cx, player.pos.z - craftBounds.cz);
        if (distToCraft < 22 && craftSphere && craftMeshes.length > 0) {
          const probeCount = isTouchOrCompactRef.current ? probeOffsets.length : 1;
          for (let p = 0; p < probeCount; p++) {
            raycaster.setFromCamera(probeOffsets[p], camera);
            if (!raycaster.ray.intersectsSphere(craftSphere)) continue;
            const hits = raycaster.intersectObjects(craftMeshes, false);
            if (hits.length > 0) {
              const h = hits[0];
              const partId = classifyCraftHit(
                artifact,
                h.object as THREE.Mesh,
                h.point,
                craftBounds
              );
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
                break;
              }
            }
          }
        }

        // 2. Check companion ground items if spacecraft not hit
        if (!detectedTarget) {
          _camFwd.set(0, 0, -1).applyEuler(camera.rotation);
          const dotThreshold = isTouchOrCompactRef.current ? 0.88 : 0.92;
          const extraRange = isTouchOrCompactRef.current ? 4.8 : 4.0;
          let bestScore = 0;
          for (const item of siteItems) {
            _dVec.copy(item.center).sub(player.pos);
            const dist = _dVec.length();
            if (dist > item.radius + extraRange) continue;
            const dot = _dVec.normalize().dot(_camFwd);
            if (dot > dotThreshold && dot > bestScore) {
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

        const nextTargetKey = detectedTarget
          ? `${detectedTarget.type}:${detectedTarget.id}`
          : '';
        activeTargetRef.current = detectedTarget;
        if (nextTargetKey !== lastLockedTargetKey) {
          lastLockedTargetKey = nextTargetKey;
          setHoveredTarget(detectedTarget);
        }
        setHL(detectedTarget && !inspectModalRef.current ? detectedTarget.mesh || null : null);
      }

      // TELEMETRY HUD UPDATES (~8 Hz)
      if (now - lastHudUpdate > 120) {
        lastHudUpdate = now;
        setHudCoords(
          formatOffsetCoords(
            artifact.coordinates.lat,
            artifact.coordinates.lon,
            player.pos.x,
            player.pos.z,
            isMars
          )
        );
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
      renderer.domElement.removeEventListener('pointerdown', onCanvasPointerDown);
      renderer.domElement.removeEventListener('lostpointercapture', onLostPointerCapture);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerEnd);
      window.removeEventListener('pointercancel', onWindowPointerEnd);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
      triggerJumpRef.current = () => {};
      triggerInspectRef.current = () => {};

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

  const seenItemIdSet = new Set(seenItemIds);
  const seenPartIdSet = new Set(seenPartIds);

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
  const buttonActionClass = isMars
    ? 'bg-[#F5E6D3] hover:bg-[#D97706] text-[#1C140F] shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
    : 'bg-[#BAE6FD] hover:bg-[#E0F2FE] text-[#1C1D21] shadow-none';

  const seenTotal = seenItemIds.length + seenPartIds.length;
  const totalLogs = siteItemsList.length + craftPartsList.length;

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden overscroll-none bg-black select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair touch-none select-none"
        aria-label={`3D surface exploration of ${artifact.name}`}
      />

      {/* Top-Left: Exit Button + Mission Checklist HUD (Always in DOM; expanded on desktop, collapsible 'Checklist ▾' pill on mobile) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 pointer-events-none flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            onClick={handleExit}
            className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 active:translate-y-0.5 transition-all bg-[rgba(28,29,33,0.94)] hover:bg-[#2A2C32] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#BAE6FD]" />
            <span className="sm:hidden">Exit Surface</span>
            <span className="hidden sm:inline">Exit Surface / Return to Orbit</span>
          </button>

          {/* Mobile/Tablet Checklist Toggle Pill ('Checklist ▾') */}
          <button
            type="button"
            onClick={() => {
              playWhooshSound('ui');
              setIsChecklistOpen((prev) => !prev);
            }}
            aria-expanded={isChecklistOpen}
            className="surface-mobile-only surface-touch-control min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold items-center gap-1.5 transition-colors bg-[rgba(28,29,33,0.94)] border-2 border-[#BAE6FD] text-[#BAE6FD] whitespace-nowrap shrink-0"
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Checklist</span>
            <span className="tabular-nums text-[11px] text-[#F4F4F5]">
              ({seenTotal}/{totalLogs})
            </span>
            {isChecklistOpen ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          {/* Subtle re-open button when the mobile control hint pill has auto-faded */}
          <button
            type="button"
            onClick={() => {
              playWhooshSound('ui');
              setIsMobileHintVisible(true);
              setMobileHintResetCount((c) => c + 1);
            }}
            aria-label="Show touch control instructions"
            title="Show touch control instructions"
            className={`surface-mobile-only surface-touch-control min-h-[40px] w-[40px] rounded-xl items-center justify-center transition-all bg-[rgba(28,29,33,0.92)] border border-[#BAE6FD]/70 text-[#BAE6FD] shrink-0 ${
              isMobileHintVisible ? 'opacity-0 pointer-events-none scale-90 w-0 min-w-0 px-0 border-0 overflow-hidden' : 'opacity-100 pointer-events-auto scale-100'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Checklist Panel: Always mounted in the DOM! Expanded on desktop; toggled via 'Checklist ▾' on mobile/tablet */}
        <div
          className={`surface-checklist-panel ${
            !isChecklistOpen ? 'is-collapsed' : ''
          } pointer-events-auto scrollbar-none font-sans ${
            isTouchOrCompact
              ? 'w-[260px] max-h-[calc(100dvh-235px)] overflow-y-auto rounded-xl px-3 py-2.5 bg-[rgba(14,17,24,0.90)] border border-[#BAE6FD]/45 text-[#BAE6FD]'
              : 'px-0 py-0 w-[265px] sm:w-[295px] max-h-[calc(100vh-145px)] overflow-y-auto bg-transparent border-0 text-[#BAE6FD]'
          }`}
        >
          <h3 className="text-xs sm:text-sm font-bold truncate text-[#BAE6FD]">
            {artifact.moniker} ({artifact.year})
          </h3>

          <div className="text-[11px] font-sans font-medium tabular-nums mt-0.5 text-[#BAE6FD]">
            {hudCoords}
          </div>

          {/* Site Debris Logged */}
          <div className="mt-2 pt-2">
            <h4 className="text-xs font-bold flex items-center justify-between text-[#BAE6FD]">
              <span>Site Debris Logged</span>
              <span className="tabular-nums font-semibold">
                {seenItemIds.length}/{siteItemsList.length}
              </span>
            </h4>
            {siteItemsList.length > 0 && (
              <ul className="mt-1 space-y-0.5 pl-2">
                {siteItemsList.map((item) => {
                  const isDone = seenItemIdSet.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className={`text-[11px] font-sans leading-snug text-[#FFFFFF] ${
                        isDone
                          ? 'line-through decoration-[#FFFFFF] decoration-[1.5px] opacity-75'
                          : ''
                      }`}
                    >
                      {item.name}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Components Inspected */}
          <div className="mt-2 pt-2">
            <h4 className="text-xs font-bold flex items-center justify-between text-[#BAE6FD]">
              <span>Components Inspected</span>
              <span className="tabular-nums font-semibold">
                {seenPartIds.length}/{craftPartsList.length}
              </span>
            </h4>
            {craftPartsList.length > 0 && (
              <ul className="mt-1 space-y-0.5 pl-2">
                {craftPartsList.map((part) => {
                  const isDone = seenPartIdSet.has(part.id);
                  return (
                    <li
                      key={part.id}
                      className={`text-[11px] font-sans leading-snug text-[#FFFFFF] ${
                        isDone
                          ? 'line-through decoration-[#FFFFFF] decoration-[1.5px] opacity-75'
                          : ''
                      }`}
                    >
                      {part.name}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Top-Right Mobile/Tablet Control Hint Pill (Always in DOM; auto-fades after 6s or when tapped) */}
      <div
        aria-hidden={!isMobileHintVisible}
        className={`surface-mobile-only fixed top-14 md:top-4 right-3 sm:right-4 z-30 max-w-[calc(100vw-24px)] md:max-w-[calc(100vw-420px)] justify-end transition-all duration-500 ${
          isMobileHintVisible && !inspectModalTarget
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-1.5 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setIsMobileHintVisible(false)}
          className={`surface-touch-control px-3.5 py-1.5 rounded-2xl text-[11px] sm:text-xs font-sans font-medium flex items-center gap-2 text-left leading-snug ${panelBgClass}`}
        >
          <span>
            <strong className={accentTextClass}>WASD:</strong> move,{' '}
            <strong className={accentTextClass}>Drag screen:</strong> Look,{' '}
            <strong className={accentTextClass}>G:</strong> Flashlight,{' '}
            <strong className={accentTextClass}>E:</strong> Interact,{' '}
            <strong className={accentTextClass}>SPACE:</strong> Jump,{' '}
            <strong className={accentTextClass}>SHIFT:</strong> Run
          </span>
          <X className={`w-3.5 h-3.5 shrink-0 ${mutedTextClass}`} />
        </button>
      </div>

      {/* Right-Side Interactive Story Postcard & Web Speech Narration */}
      <SurfaceStoryPostcard
        artifact={artifact}
        isOpen={isStoryPostcardOpen}
        onClose={() => setIsStoryPostcardOpen(false)}
        onReplay={() => setIsStoryPostcardOpen(true)}
        isTouchOrCompact={isTouchOrCompact}
        isMobileHintVisible={isMobileHintVisible}
        isObscuredByInspectModal={Boolean(inspectModalTarget)}
      />

      {/* Center Reticle & Dynamic Point-to-Inspect Prompt */}
      {!inspectModalTarget && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative flex flex-col items-center px-4">
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

            {/* Point-to-Inspect Notification: Clickable or press E / Inspect */}
            {hoveredTarget && (
              <button
                onClick={() => openInspection(hoveredTarget)}
                className={`mt-4 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide pointer-events-auto flex items-center gap-2 cursor-pointer transition-all active:scale-95 max-w-[85vw] ${
                  isMars
                    ? 'bg-[rgba(28,20,15,0.92)] border border-[#57534E] text-[#F5E6D3] shadow-[0_8px_24px_rgba(0,0,0,0.6)]'
                    : 'bg-[rgba(28,29,33,0.92)] border-2 border-[#BAE6FD] text-[#F4F4F5] shadow-none'
                }`}
              >
                <Eye className={`w-4 h-4 shrink-0 ${accentTextClass}`} />
                <span className="truncate">
                  {isTouchOrCompact ? (
                    <>
                      Tap <strong className={accentTextClass}>Inspect</strong> · {hoveredTarget.name}
                    </>
                  ) : (
                    <>
                      Press <strong className={accentTextClass}>[E]</strong> to hear about {hoveredTarget.name}
                    </>
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Point-and-Inspect Educational Modal / Plaque */}
      {inspectModalTarget && (
        <div className="absolute inset-x-4 bottom-6 sm:bottom-24 z-30 flex justify-center pointer-events-none font-sans">
          <div
            className={`pointer-events-auto w-full max-w-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${panelBgClass}`}
          >
            <div
              className={`px-4 sm:px-5 py-3 flex items-start justify-between gap-3 ${headerBarClass}`}
            >
              <div className="min-w-0">
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest ${accentTextClass}`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {artifact.moniker} · {artifact.nssdcaId || artifact.catalogRef || artifact.year}
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

            <div className="p-4 sm:p-5 font-sans">
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
                  <strong className={accentTextClass}>What I Helped Prove: </strong>
                  <span>{inspectModalTarget.why}</span>
                </div>
              )}

              {inspectModalTarget.status && (
                <div className={`mt-2 text-[11px] font-sans italic ${mutedTextClass}`}>
                  Right now: {inspectModalTarget.status}
                </div>
              )}

              <div
                className={`mt-4 pt-3 border-t ${dividerClass} flex items-center justify-between gap-2 text-[11px] font-sans`}
              >
                <span className={mutedTextClass}>
                  {isTouchOrCompact ? (
                    'Tap button to continue'
                  ) : (
                    <>
                      Press <strong className={accentTextClass}>[E]</strong> or click button to close
                    </>
                  )}
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

      {/* Roblox-Style Multi-Touch Controls HUD (Always in DOM; shown on <= 1024px / coarse pointer) */}
      <div
        aria-hidden={Boolean(inspectModalTarget)}
        className={`surface-touch-hud pointer-events-none fixed inset-0 z-20 transition-opacity duration-150 ${
          inspectModalTarget ? 'opacity-0 invisible' : 'opacity-100 visible'
        }`}
      >
          {/* Bottom-Left Virtual Thumbstick (120px base + 50px draggable knob) */}
          <div
            role="application"
            aria-label="Movement thumbstick"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (joystickPointerIdRef.current !== null) return;
              joystickPointerIdRef.current = e.pointerId;
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Ignore capture failures
              }
              updateJoystickFromPointer(e.clientX, e.clientY, e.currentTarget);
            }}
            onPointerMove={(e) => {
              if (e.pointerId !== joystickPointerIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              updateJoystickFromPointer(e.clientX, e.clientY, e.currentTarget);
            }}
            onPointerUp={(e) => {
              if (e.pointerId !== joystickPointerIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              } catch {
                // Ignore release failures
              }
              resetJoystick();
            }}
            onPointerCancel={(e) => {
              if (e.pointerId !== joystickPointerIdRef.current) return;
              e.preventDefault();
              e.stopPropagation();
              try {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              } catch {
                // Ignore release failures
              }
              resetJoystick();
            }}
            onLostPointerCapture={(e) => {
              if (e.pointerId === joystickPointerIdRef.current) {
                resetJoystick();
              }
            }}
            className={`surface-touch-control pointer-events-auto absolute bottom-5 left-5 w-[120px] h-[120px] rounded-full flex items-center justify-center border-2 transition-colors ${
              joystickKnob.sprinting
                ? isMars
                  ? 'bg-[rgba(217,119,6,0.22)] border-[#D97706]'
                  : 'bg-[rgba(186,230,253,0.2)] border-[#BAE6FD]'
                : joystickKnob.active
                ? 'bg-[rgba(255,255,255,0.14)] border-white/50'
                : 'bg-[rgba(15,18,24,0.48)] border-white/25'
            }`}
          >
            {/* Subtle 85% sprint threshold guide ring */}
            <div className="pointer-events-none absolute inset-[9px] rounded-full border border-dashed border-white/15" />

            {/* Draggable Inner Knob (50px) */}
            <div
              style={{
                transform: `translate3d(${joystickKnob.x}px, ${joystickKnob.y}px, 0)`,
              }}
              className={`pointer-events-none w-[50px] h-[50px] rounded-full border-2 flex items-center justify-center ${
                joystickKnob.active ? 'transition-none' : 'transition-transform duration-150 ease-out'
              } ${
                joystickKnob.sprinting
                  ? isMars
                    ? 'bg-[#D97706] border-[#F5E6D3] shadow-[0_0_14px_rgba(217,119,6,0.7)]'
                    : 'bg-[#BAE6FD] border-white shadow-[0_0_14px_rgba(186,230,253,0.7)]'
                  : joystickKnob.active
                  ? 'bg-white/40 border-white/85'
                  : 'bg-white/25 border-white/55'
              }`}
            >
              {joystickKnob.sprinting && (
                <span className="text-[9px] font-bold tracking-wider uppercase text-[#111318]">
                  RUN
                </span>
              )}
            </div>
          </div>

          {/* Bottom-Right Action Button Cluster */}
          <div className="surface-touch-control pointer-events-none absolute bottom-5 right-5 w-[156px] h-[156px]">
            {/* Inspect (E): Medium 54px circular button positioned above Jump */}
            <button
              type="button"
              aria-label="Inspect targeted object"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                actionPointerIdsRef.current.add(e.pointerId);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore capture failures
                }
                triggerInspectRef.current();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // Ignore release failures
                }
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              onLostPointerCapture={(e) => {
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              className={`surface-touch-control pointer-events-auto absolute bottom-[92px] right-[11px] w-[54px] h-[54px] rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                hoveredTarget
                  ? isMars
                    ? 'bg-[rgba(217,119,6,0.92)] border-[#F5E6D3] text-[#1C140F] shadow-[0_0_20px_rgba(217,119,6,0.75)] scale-105'
                    : 'bg-[rgba(186,230,253,0.94)] border-white text-[#1C1D21] shadow-[0_0_20px_rgba(186,230,253,0.75)] scale-105'
                  : 'bg-[rgba(15,18,24,0.58)] border-white/25 text-white/60'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-wider uppercase leading-none">
                Inspect
              </span>
            </button>

            {/* Run (Shift): Medium 54px toggle button positioned upper-left of Jump */}
            <button
              type="button"
              aria-label="Toggle run"
              aria-pressed={isRunToggled}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                actionPointerIdsRef.current.add(e.pointerId);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore capture failures
                }
                toggleRun();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // Ignore release failures
                }
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              onLostPointerCapture={(e) => {
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              className={`surface-touch-control pointer-events-auto absolute bottom-[78px] right-[78px] w-[54px] h-[54px] rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                isRunToggled
                  ? isMars
                    ? 'bg-[#D97706] border-[#F5E6D3] text-[#1C140F] shadow-[0_0_14px_rgba(217,119,6,0.55)]'
                    : 'bg-[#BAE6FD] border-white text-[#1C1D21] shadow-[0_0_14px_rgba(186,230,253,0.55)]'
                  : 'bg-[rgba(15,18,24,0.6)] border-white/30 text-white/85'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-wider uppercase leading-none">
                Run
              </span>
            </button>

            {/* Flashlight (G): Medium 54px toggle button positioned left of Jump */}
            <button
              type="button"
              aria-label="Toggle flashlight"
              aria-pressed={isFlashlightOn}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                actionPointerIdsRef.current.add(e.pointerId);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore capture failures
                }
                toggleFlashlight();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // Ignore release failures
                }
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              onLostPointerCapture={(e) => {
                actionPointerIdsRef.current.delete(e.pointerId);
              }}
              className={`surface-touch-control pointer-events-auto absolute bottom-[11px] right-[92px] w-[54px] h-[54px] rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                isFlashlightOn
                  ? isMars
                    ? 'bg-[#D97706] border-[#F5E6D3] text-[#1C140F] shadow-[0_0_14px_rgba(217,119,6,0.55)]'
                    : 'bg-[#BAE6FD] border-white text-[#1C1D21] shadow-[0_0_14px_rgba(186,230,253,0.55)]'
                  : 'bg-[rgba(15,18,24,0.6)] border-white/30 text-white/85'
              }`}
            >
              <Flashlight className="w-4 h-4" />
              <span className="text-[9px] font-bold tracking-wider uppercase leading-none">
                Light
              </span>
            </button>

            {/* Jump (Space): Large 76px circular button anchored bottom-right */}
            <button
              type="button"
              aria-label="Jump"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                actionPointerIdsRef.current.add(e.pointerId);
                setIsJumpPressed(true);
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore capture failures
                }
                triggerJumpRef.current();
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
                setIsJumpPressed(false);
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // Ignore release failures
                }
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                actionPointerIdsRef.current.delete(e.pointerId);
                setIsJumpPressed(false);
              }}
              onLostPointerCapture={(e) => {
                actionPointerIdsRef.current.delete(e.pointerId);
                setIsJumpPressed(false);
              }}
              className={`surface-touch-control pointer-events-auto absolute bottom-0 right-0 w-[76px] h-[76px] rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition-transform ${
                isJumpPressed
                  ? isMars
                    ? 'scale-92 bg-[#D97706]/85 border-[#F5E6D3] text-[#1C140F]'
                    : 'scale-92 bg-[#BAE6FD]/85 border-white text-[#1C1D21]'
                  : 'bg-[rgba(15,18,24,0.62)] border-white/40 text-white'
              }`}
            >
              <ArrowUp className="w-6 h-6" />
              <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                Jump
              </span>
            </button>
          </div>
      </div>

      {/* Bottom Controls Hint Bar (Always in DOM; shown on desktop > 1024px & pointer: fine) */}
      <div className="surface-desktop-legend absolute bottom-4 inset-x-4 z-20 justify-center pointer-events-none">
        <div
          className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-sans flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 ${panelBgClass}`}
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
            <strong className={isFlashlightOn ? 'font-extrabold' : accentTextClass}>G</strong>{' '}
            Flashlight ({isFlashlightOn ? 'ON' : 'OFF'})
          </button>
        </div>
      </div>
    </div>
  );
};
