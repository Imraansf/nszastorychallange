/**
 * @file space-data.ts
 * @si-attribution Data module structure assisted by Super Intelligence (Google AI Studio / Gemini).
 * All historical mission telemetry, archival image references, and narrative storytelling copy are 100% human-created/curated.
 */

import { Artifact, PlanetaryLandmark, CelestialBody } from '../types/space';

/**
 * Source of truth for artifact category colors
 */
export const getArtifactColor = (artifact: Artifact, isSelected?: boolean): string => {
  if (isSelected) return '#F8FAFC';
  switch (artifact.category) {
    case 'interstellar_probe':
      return '#9333EA'; // Cosmic Purple Interstellar
    case 'space_telescope':
      return '#38BDF8'; // Ice Blue Telescopes
    case 'planetary_orbiter':
      return '#7C3AED'; // Cosmic Violet Orbiters
    case 'asteroid_impactor':
      return '#E0F2FE'; // Ice White Asteroids
    case 'apollo_crewed':
      return '#38BDF8'; // Ice Blue Apollo
    case 'uncrewed_lander':
      return '#0EA5E9'; // Ice Blue Landers
    case 'rover':
      return '#7C3AED'; // Cosmic Purple Rovers
    default:
      return '#E0F2FE'; // Ice White for others
  }
};

/**
 * Hex number version for Three.js
 */
export const getArtifactColorHex = (artifact: Artifact, isSelected?: boolean): number => {
  const color = getArtifactColor(artifact, isSelected);
  return parseInt(color.replace('#', '0x'), 16);
};

// ============================================================================
// 1. MOON ARTIFACTS (4 Items)
// ============================================================================
export const MOON_ARTIFACTS: Artifact[] = [
  {
    id: 'surveyor-3',
    artifactNumber: '04',
    name: 'Surveyor 3',
    mission: 'Surveyor 3',
    moniker: 'Surveyor 3',
    body: 'moon',
    category: 'uncrewed_lander',
    categoryLabel: 'Robotic Lunar Soft-Lander',
    agency: 'NASA',
    date: 'April 20, 1967',
    year: 1967,
    status: 'historic_monument',
    statusLabel: 'Visited Monument',
    locationName: 'Southeastern Oceanus Procellarum, Moon',
    coordinates: {
      lat: -3.0,
      lon: -23.41,
      display: '3.00° S, 23.41° W',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1967-04-17',
      landed: '1967-04-20',
      ended: '1967-05-04',
      summary: 'Launched: April 17, 1967 | Landed: April 20, 1967 | Last Contact: May 4, 1967',
    },
    plannedVsActual:
      'I worked hard through my primary lunar day until two days after the freezing lunar night fell on May 4, 1967—then 31 months later, Apollo 12 astronauts visited me in person.',
    specs:
      'I weighed 997.9 kg (2,200 lbs) at launch, and I carried a fold-out surface-sampler arm that could reach 1.5 m (5 ft) and dig 18 cm (7 in) deep.',
    instruments: [
      'Surveillance TV Camera (25 mm and 100 mm lenses beneath a movable mirror)',
      'Robotic Surface Sampler Scoop',
    ],
    scientificDiscoveries:
      'I beamed home 6,326 television pictures and used my robotic claw to dig four trenches and make 13 impact tests, proving Moon dust felt like damp sand (~10 psi) and could safely hold the weight of an Apollo Lunar Module.',
    storytellingHook:
      'When I came down to land, bright lunar rocks confused my radar and kept my engines firing—so I bounced twice on the Moon, once 10 meters high into the sky, before settling inside a crater where humans later walked right up to me.',
    firstPersonMonologue:
      'When I arrived at the Ocean of Storms in April 1967, bright lunar rocks confused my radar and tricked my engines into firing too long, causing me to bounce twice on the Moon—once jumping 10 meters high!—before settling safely in the dust. For 31 months I stood completely silent after digging trenches and taking 6,326 photos, until two human astronauts from Apollo 12 walked right down the crater slope to my frame in November 1969. Pete Conrad and Alan Bean unbolted my television camera and soil scoop to carry back to Earth, making me the first robot on another world ever visited face-to-face by people.',
    officialSource: 'https://science.nasa.gov/mission/surveyor-3/',
    nssdcaId: '1967-035A',
    catalogRef: 'NSSDCA ID 1967-035A',
    massKg: 998,
    story: {
      headline: 'The Only Robot on Another World Visited Face-to-Face by Humans',
      introduction:
        'I arrived on the Moon two years before any human, bouncing twice like a kangaroo when rocks tricked my radar—before sitting quietly in a crater waiting for Apollo 12 astronauts to come say hello.',
      theScience:
        'I snapped 6,326 television images and dug four trenches with my robotic claw, proving lunar regolith could support an Apollo crewed lander (~10 psi) without sinking into deep dust.',
      whyLeftBehind:
        'Built as a one-way robotic scout, I went to sleep in May 1967 and stayed on duty as a monument in Oceanus Procellarum, where Pete Conrad and Alan Bean inspected me in November 1969.',
      forSchoolKids:
        'I checked whether Moon dust was solid enough for astronauts to walk on—and 31 months later, Apollo 12 astronauts walked right up to me and brought my camera back to Earth!',
    },
    famousQuote:
      'I became the only robot on another world ever visited face-to-face by human astronauts.',
    funFacts: [
      'I bounced twice during touchdown—once rising 10 meters high—before settling inside a small crater.',
      'I transmitted 6,326 television pictures and dug four soil trenches with my scoop arm.',
      'Apollo 12 astronauts retrieved my TV camera and soil scoop 31 months later to study how hardware survives in space.',
    ],
    keyComponents: [
      'Surveillance TV Camera (25 mm and 100 mm lenses beneath a movable mirror)',
      'Robotic Surface Sampler Scoop',
    ],
    imageUrl: '/assets/aistudio/surveyor_3_3bcae6ba.jpg',
    imageCaption: 'Apollo 12 astronaut Alan Bean inspecting Surveyor 3 with Lunar Module Intrepid in the distance',
    statPills: {
      mass: '997.9 kg (2,200 lbs) launch',
      size: '1.5 m (5 ft) sampler arm',
      power: 'Solar panel + silver-zinc battery',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'apollo-11-eagle-easep',
    artifactNumber: '01',
    name: "Apollo 11 Lunar Module 'Eagle' & EASEP",
    mission: 'Apollo 11',
    moniker: 'Eagle & EASEP',
    body: 'moon',
    category: 'apollo_crewed',
    categoryLabel: 'Crewed Lunar Module (Descent Stage) & Surface Science Package',
    agency: 'NASA',
    date: 'July 20, 1969',
    year: 1969,
    status: 'historic_monument',
    statusLabel: 'Tranquility Base Monument',
    locationName: 'Mare Tranquillitatis (Sea of Tranquility), Moon',
    coordinates: {
      lat: 0.67416,
      lon: 23.47314,
      display: 'Descent Stage: 0.67416° N, 23.47314° E | EASEP: 0.6735° N, 23.4730° E',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1969-07-16',
      landed: '1969-07-20',
      ended: '1969-08-27',
      summary:
        'Launched: July 16, 1969 | Landed: July 20, 1969 | Ascent Liftoff: July 21, 1969 (21h 36m on surface) | EASEP Ended: Aug 27, 1969',
    },
    plannedVsActual:
      'My EASEP science station was built for one lunar day (~14 Earth days), yet it survived into a second day despite heat 30°C hotter than designed—and my laser mirror is still working today.',
    specs:
      'My full Lunar Module weighed 15,103 kg (my lower descent stage is 2,034 kg dry, 9.4 m across my footpads). My 48 kg EASEP science package ran on two solar panels and an isotope heater.',
    instruments: [
      'Passive Seismometer',
      'Lunar Dust Detector',
      'Laser Ranging Retroreflector (LRRR)',
      'Solar Wind Composition Foil Collector',
    ],
    scientificDiscoveries:
      'I helped astronauts achieve humanity’s first Moon landing and bring home 21.55 kg of lunar rocks. My EASEP recorded the first moonquakes, and Earth telescopes still bounce lasers off my power-free mirror to measure the Moon drifting away at 3.8 cm every year.',
    storytellingHook:
      "My golden lower half still stands upright at Tranquility Base as a silent launch pad, wearing a stainless-steel plaque on my front leg that reads: 'Here men from the planet Earth first set foot upon the Moon July 1969, A.D. We came in peace for all mankind.'",
    firstPersonMonologue:
      "In July 1969, my golden four-legged base settled gently into the gray dust of Tranquility Base, carrying the very first humans to walk on the Moon. After 21 hours and 36 minutes on the surface, my top half blasted off to carry Neil Armstrong and Buzz Aldrin back to orbit, leaving my lower frame standing upright like a silent launch pad. Attached to my front leg is a stainless-steel plaque signed by the crew and President Nixon that still reads: 'Here men from the planet Earth first set foot upon the Moon July 1969, A.D. We came in peace for all mankind.'",
    youtubeUrl: 'https://www.youtube.com/watch?v=nOcDftgR5UQ',
    officialSource: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C',
    nssdcaId: '1969-059C',
    catalogRef: 'NSSDCA ID 1969-059C',
    massKg: 2034,
    story: {
      headline: 'The First Crewed Landing Site on Another World',
      introduction:
        "I am Eagle's golden descent stage, standing silently upright at Tranquility Base where Neil Armstrong and Buzz Aldrin took humanity's first steps on the Moon in July 1969.",
      theScience:
        'Beside my 21.55 kg rock-collection mission, I left behind a seismometer to listen inside the Moon and a 100-prism laser mirror that scientists on Earth still bounce light off today.',
      whyLeftBehind:
        'To save precious fuel for the trip home, my lower stage acted as a stationary launch pad while the top ascent cabin carried the astronauts safely back into lunar orbit.',
      forSchoolKids:
        'My golden lower stage is still standing upright on the Moon today, and astronomers still shine lasers at my mirror array to watch the Moon move away by 3.8 centimeters every year!',
    },
    famousQuote: 'Houston, Tranquility Base here. The Eagle has landed.',
    funFacts: [
      'My crew brought back 21.55 kg of Moon rocks and soil for scientists on Earth.',
      'My power-free LRRR mirror array still reflects Earth laser pulses more than 55 years later.',
      'My EASEP science station survived into a second lunar day despite extreme heat 30°C over its design limit.',
    ],
    keyComponents: [
      'Passive Seismometer',
      'Lunar Dust Detector',
      'Laser Ranging Retroreflector (LRRR)',
      'Solar Wind Composition Foil Collector',
    ],
    imageUrl: '/assets/aistudio/apollo_11_a2084ccf.jpg',
    imageCaption: "Buzz Aldrin standing beside Apollo 11 Lunar Module 'Eagle' at Tranquility Base (July 1969)",
    statPills: {
      mass: '2,034 kg descent stage dry',
      size: '9.4 m across footpads',
      power: 'Batteries + 2 EASEP solar panels',
    },
    model3dUrl: '/models/Apollo%20Lunar%20Module.glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'apollo-12-intrepid-alsep',
    artifactNumber: '03',
    name: "Apollo 12 Lunar Module 'Intrepid' & ALSEP",
    mission: 'Apollo 12',
    moniker: 'Intrepid & ALSEP',
    body: 'moon',
    category: 'apollo_crewed',
    categoryLabel: 'Crewed Lunar Module & Full Nuclear ALSEP Station',
    agency: 'NASA',
    date: 'November 19, 1969',
    year: 1969,
    status: 'historic_monument',
    statusLabel: 'Ocean of Storms Monument',
    locationName: 'Oceanus Procellarum (Ocean of Storms), Moon',
    coordinates: {
      lat: -3.0128,
      lon: -23.4219,
      display:
        'LM Descent Stage: 3.0128° S, 23.4219° W (just 180 m from Surveyor 3) | ALSEP: 3.0094° S, 23.4246° W',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1969-11-14',
      landed: '1969-11-19',
      ended: '1977-09-30',
      summary:
        'Launched: Nov 14, 1969 | Landed: Nov 19, 1969 | Ascent Liftoff: Nov 20, 1969 (31h 31m on surface) | ALSEP Shutdown: Sept 30, 1977',
    },
    plannedVsActual:
      'My nuclear-powered ALSEP station operated nonstop for nearly eight full years—from November 1969 until September 1977—making it one of the longest-working weather and quake outposts on the Moon.',
    specs:
      'My full Lunar Module weighed 15,235 kg (my descent stage is 2,118 kg dry). My 25 kg ALSEP Central Station was powered by a 17 kg SNAP-27 Plutonium-238 nuclear generator (~70 W DC).',
    instruments: [
      'Passive Seismometer',
      'Suprathermal Ion Detector',
      'Cold Cathode Ion Gauge',
      'Lunar Dust Detector',
      'Lunar Surface Magnetometer',
      'Solar Wind Spectrometer',
    ],
    scientificDiscoveries:
      'I proved pinpoint planetary landing works by touching down only 180 meters from Surveyor 3, helping collect 34.35 kg of Moon rocks plus 10 kg of Surveyor parts. When my empty ascent stage crashed 60 km away, my seismometer heard the Moon ring like a giant bell for nearly an hour.',
    storytellingHook:
      'My astronauts Pete Conrad and Alan Bean strolled right down a crater wall to visit the quiet Surveyor 3 robot—which had slept in the dust for 2.5 years—snapping selfies beside it and unbolting its camera to carry home.',
    firstPersonMonologue:
      "I pulled off history's very first pinpoint landing in the Ocean of Storms in November 1969, touching down just 180 meters away from a quiet robot named Surveyor 3. Astronauts Pete Conrad and Alan Bean strolled right up to that old lander—which had sat silent in the lunar dust for two and a half years—snapped photos beside it, and unbolted its camera and soil scoop to bring home to Earth. Along with those robot parts and 34.35 kilograms of Moon rocks, I left behind a nuclear science station, and my empty top stage later crashed into the Moon, making it ring like a giant bell for nearly an hour.",
    youtubeUrl: 'https://www.youtube.com/watch?v=l11sW5KOi_g',
    officialSource: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C',
    nssdcaId: '1969-099C',
    catalogRef: 'NSSDCA ID 1969-099C',
    massKg: 2118,
    story: {
      headline: 'Pinpoint Touchdown Beside Surveyor 3 & Eight Years of ALSEP Science',
      introduction:
        'I am Intrepid, and in November 1969 I proved NASA could aim a spaceship with laser-like precision—landing within walking distance of Surveyor 3 on a crater rim.',
      theScience:
        'Besides helping gather 34.35 kg of rocks and 10 kg of Surveyor 3 parts, my ALSEP science station ran for nearly eight years and heard the Moon vibrate for almost an hour after my empty ascent cabin crashed nearby.',
      whyLeftBehind:
        'My lower stage stayed behind as Pete and Alan’s launch pad back to orbit, while my nuclear-powered ALSEP station stayed awake transmitting lunar science until September 1977.',
      forSchoolKids:
        'I landed so accurately that my astronauts walked down a crater slope straight to Surveyor 3—and when my empty top half crashed on the Moon, the Moon rang like a bell for nearly an hour!',
    },
    famousQuote:
      'Whoopee! Man, that may have been a small one for Neil, but that’s a long one for me!',
    funFacts: [
      'I landed just 180 meters from the Surveyor 3 robot in Oceanus Procellarum.',
      'My SNAP-27 nuclear ALSEP station stayed awake for nearly eight years.',
      'My crew brought home 34.35 kg of lunar rocks plus 10 kg of Surveyor 3 hardware.',
    ],
    keyComponents: [
      'Passive Seismometer',
      'Suprathermal Ion Detector',
      'Cold Cathode Ion Gauge',
      'Lunar Dust Detector',
      'Lunar Surface Magnetometer',
      'Solar Wind Spectrometer',
    ],
    imageUrl: '/assets/aistudio/apollo_12_b2070a11.webp',
    imageCaption: "Apollo 12 astronaut Alan Bean climbing down Lunar Module 'Intrepid' onto Oceanus Procellarum",
    galleryImages: [
      {
        url: '/assets/aistudio/alsep_apollo_5dfb72e9.jpg',
        caption: 'Apollo ALSEP science station powered by the SNAP-27 nuclear generator',
        postcardTarget: 'stats',
      },
    ],
    statPills: {
      mass: '2,118 kg descent + 25 kg ALSEP',
      size: '9.4 m LM footpad span',
      power: 'SNAP-27 Pu-238 RTG (~70 W DC)',
    },
    model3dUrl: '/models/Apollo%20Lunar%20Module.glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'apollo-15-falcon-lrv-alsep',
    artifactNumber: '02',
    name: "Apollo 15 Lunar Module 'Falcon', LRV-1 & ALSEP",
    mission: 'Apollo 15',
    moniker: 'Falcon, LRV-1 & ALSEP',
    body: 'moon',
    category: 'apollo_crewed',
    categoryLabel: 'Crewed Lunar Module, First Electric Lunar Roving Vehicle & Nuclear Science Station',
    agency: 'NASA',
    date: 'July 30, 1971',
    year: 1971,
    status: 'historic_monument',
    statusLabel: 'Hadley-Apennine Monument',
    locationName: 'Mare Imbrium at the foot of the Apennine Mountains (Hadley-Apennine), Moon',
    coordinates: {
      lat: 26.13239,
      lon: 3.6333,
      display:
        'LM Descent Stage: 26.13239° N, 3.63330° E | ALSEP Central Station: 26.1341° N, 3.6298° E',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1971-07-26',
      landed: '1971-07-30',
      ended: '1977-09-30',
      summary:
        'Launched: July 26, 1971 | Landed: July 30, 1971 | Ascent Liftoff: Aug 2, 1971 (66h 55m on surface) | ALSEP Shutdown: Sept 30, 1977',
    },
    plannedVsActual:
      'My nuclear-powered ALSEP science station ran nonstop for over six years (July 1971 – September 1977), sending measurements from deep inside the Moon back to Earth.',
    specs:
      'My full spacecraft weighed 16,430 kg (my descent stage is 2,797 kg dry). My 25 kg ALSEP Central Station ran on a 17 kg SNAP-27 RTG (~70 W DC), and my electric LRV-1 rover carried two 36-volt batteries.',
    instruments: [
      'Lunar Roving Vehicle (LRV-1)',
      'Passive Seismometer',
      'Lunar Surface Magnetometer',
      'Solar Wind Spectrometer',
      'Suprathermal Ion Detector',
      'Cold Cathode Ion Gauge',
      'Lunar Dust Detector',
      'Heat Flow Experiment',
    ],
    scientificDiscoveries:
      'I carried the very first electric Moon buggy—driving 27.9 km across three moonwalks—and helped gather 77.31 kg of rocks, including the 4.1-billion-year-old Genesis Rock. My ALSEP also measured moonquakes and heat leaking from the Moon’s core.',
    storytellingHook:
      'Before my crew blasted back to orbit, Commander David Scott dropped a heavy hammer and a falcon feather at the same time in front of my TV camera—proving Galileo right as both hit the dust together.',
    firstPersonMonologue:
      "I touched down at the foot of the towering Apennine Mountains on July 30, 1971, unfolding the very first electric Moon buggy so my crew could drive 27.9 kilometers across Hadley-Apennine. Near the end of our 66-hour and 55-minute stay, Commander David Scott dropped a heavy geology hammer and a falcon feather at the exact same instant in the airless vacuum around me, proving Galileo's law of gravity live on television as both landed side by side. Before lifting off on August 2, 1971, my crew also placed the small 'Fallen Astronaut' figurine in the dust to honor 14 space explorers, while my science station kept working until September 1977.",
    youtubeUrl: 'https://www.youtube.com/watch?v=oYEgdZ3iEKA',
    officialSource: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C',
    nssdcaId: '1971-063C',
    catalogRef: 'NSSDCA ID 1971-063C',
    massKg: 2797,
    story: {
      headline: 'First Electric Moon Buggy & Galileo’s Hammer-and-Feather Test',
      introduction:
        'I am Falcon, and I brought the first electric car to the Moon—plus a geology hammer and a falcon feather that proved an iconic 400-year-old science experiment.',
      theScience:
        'My LRV-1 Moon buggy let astronauts drive 27.9 kilometers and collect 77.31 kg of samples like the ancient Genesis Rock, while my ALSEP measured moonquakes and interior heat until 1977.',
      whyLeftBehind:
        'My lower stage remained as Falcon’s launch platform, my LRV-1 stayed parked 100 meters away so its camera could film our liftoff, and my ALSEP station kept working for six more years.',
      forSchoolKids:
        'I carried the very first electric car to drive on the Moon—and right beside me, my commander dropped a hammer and a feather that hit the ground at the exact same moment!',
    },
    famousQuote:
      'How about that! Mr. Galileo was correct in his findings.',
    funFacts: [
      'My electric LRV-1 Moon buggy drove 27.9 kilometers across three moonwalks.',
      'My astronauts collected 77.31 kg of samples including the 4.1-billion-year-old Genesis Rock.',
      'My crew left the Fallen Astronaut sculpture honoring 14 space explorers beside my landing site.',
    ],
    keyComponents: [
      'Lunar Roving Vehicle (LRV-1)',
      'Passive Seismometer',
      'Lunar Surface Magnetometer',
      'Solar Wind Spectrometer',
      'Suprathermal Ion Detector',
      'Cold Cathode Ion Gauge',
      'Lunar Dust Detector',
      'Heat Flow Experiment',
    ],
    imageUrl: '/assets/aistudio/apolloo15_459b4502.jpg',
    imageCaption: "Astronaut Jim Irwin saluting beside Lunar Module 'Falcon' and LRV-1 at Hadley-Apennine",
    galleryImages: [
      {
        url: '/assets/aistudio/LRV1_apollo_3dd17864.jpg',
        caption: 'Commander David Scott driving the electric Lunar Roving Vehicle (LRV-1)',
        postcardTarget: 'diary',
      },
      {
        url: '/assets/aistudio/LRV1apollo_b6304495.png',
        caption: 'Close-up of the parked 4-wheel electric LRV-1 Moon buggy on the lunar surface',
        postcardTarget: 'stats',
      },
    ],
    statPills: {
      mass: '2,797 kg descent + 210 kg LRV-1',
      size: '3.1 m long electric Moon buggy',
      power: 'SNAP-27 RTG (~70 W) + two 36V batteries',
    },
    model3dUrl: '/models/Apollo%20Lunar%20Module.glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
];

// ============================================================================
// 2. MARS ARTIFACTS (6 Items)
// ============================================================================
export const MARS_ARTIFACTS: Artifact[] = [
  {
    id: 'viking-1-lander',
    artifactNumber: '07',
    name: 'Viking 1 Lander (Thomas Mutch Memorial Station)',
    mission: 'Viking 1',
    moniker: 'Viking 1 Lander',
    body: 'mars',
    category: 'uncrewed_lander',
    categoryLabel: 'Orbiter & Stationary Lander Pair',
    agency: 'NASA',
    date: 'July 20, 1976',
    year: 1976,
    status: 'historic_monument',
    statusLabel: 'Thomas Mutch Memorial Station',
    locationName: "Western slopes of Chryse Planitia ('Golden Plain'), Mars",
    coordinates: {
      lat: 22.483,
      lon: -47.94,
      display: '22.483° N, 47.94° W',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1975-08-20',
      landed: '1976-07-20',
      ended: '1982-11-11',
      summary:
        'Launched: Aug 20, 1975 | Entered Orbit: June 19, 1976 | Landed: July 20, 1976 | Last Contact: Nov 11, 1982',
    },
    plannedVsActual:
      'I was only expected to last 90 days on Mars—instead I stayed awake and sent science home for over six years (1976–1982) before an accidental software update cut off my signal.',
    specs:
      'My full spacecraft weighed 3,527 kg (7,776 lbs), and my lander body weighs 978 kg (2,156 lbs), powered by two SNAP-19 Plutonium-238 nuclear batteries.',
    instruments: [
      '2 Facsimile Color Cameras',
      'Gas Chromatograph Mass Spectrometer (GCMS)',
      'Biological Laboratory',
      'X-Ray Fluorescence Spectrometer',
      'Remote Sampler Arm',
      'Weather Package',
    ],
    scientificDiscoveries:
      'I became the first spacecraft to successfully land and operate on Mars! I snapped the first clear color photos from the Red Planet, tested Martian dirt in my biology lab, and tracked over six years of Martian weather (-86°C pre-dawn to -33°C afternoon).',
    storytellingHook:
      'Renamed the Thomas Mutch Memorial Station in 1982, I faithfully beamed home weekly Mars weather reports for over six years until a routine software command from Earth accidentally turned my antenna away.',
    firstPersonMonologue:
      'I touched down safely on the rusty red plains of Mars on July 20, 1976, after launching back in August 1975—becoming the first robot in history to work long-term on the Red Planet. My mission was planned to last just 90 days, yet my nuclear batteries kept me sending weather reports and panoramic photos for over six years! Later renamed the Thomas Mutch Memorial Station in 1982, I stayed faithfully on duty until November 1982, when a routine software update from Earth accidentally pointed my radio dish away from home.',
    youtubeUrl: 'https://www.youtube.com/watch?v=991yOhGC32c',
    officialSource: 'https://science.nasa.gov/mission/viking-1/',
    nssdcaId: '1975-075C',
    catalogRef: 'NSSDCA ID 1975-075C',
    massKg: 978,
    story: {
      headline: 'First Successful Martian Soft-Landing & Six Years of Weather Reports',
      introduction:
        'I am Viking 1, the pioneer who sent home the very first clear color photographs from the surface of Mars and listened to the Martian wind for more than six years.',
      theScience:
        'Using my 3-meter digging arm, color scanner cameras, and miniature biology lab, I ran humanity’s first surface search for signs of life and tracked Martian temperatures (-86°C to -33°C).',
      whyLeftBehind:
        'Built as a stationary nuclear lander on Chryse Planitia, I went quiet in November 1982 after an accidental command rotated my antenna away from Earth.',
      forSchoolKids:
        'I sent back the very first clear color photos from the surface of Mars—and instead of stopping after 90 days, I kept working for over six whole years!',
    },
    famousQuote:
      'I turned a three-month mission into a six-year adventure on the Red Planet.',
    funFacts: [
      'I snapped the very first clear surface photograph of Mars on July 20, 1976.',
      'I run on two SNAP-19 Plutonium-238 nuclear generators that worked right through dust storms.',
      'In 1982, NASA renamed me the Thomas Mutch Memorial Station.',
    ],
    keyComponents: [
      '2 Facsimile Color Cameras',
      'Gas Chromatograph Mass Spectrometer (GCMS)',
      'Biological Laboratory',
      'X-Ray Fluorescence Spectrometer',
      'Remote Sampler Arm',
      'Weather Package',
    ],
    imageUrl: '/assets/aistudio/viking_1_lander_035b8559.jpg',
    imageCaption: 'Viking 1 Lander (Thomas Mutch Memorial Station) extending its soil sampler arm',
    statPills: {
      mass: '978 kg (2,156 lbs) lander',
      size: '3.0 m wide × 2.1 m tall',
      power: 'Two SNAP-19 Pu-238 RTG generators',
    },
    model3dUrl: '/models/Viking%20Lander.glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'mars-pathfinder-sojourner',
    artifactNumber: '05',
    name: 'Mars Pathfinder & Sojourner Rover',
    mission: 'Mars Pathfinder',
    moniker: 'Pathfinder & Sojourner',
    body: 'mars',
    category: 'rover',
    categoryLabel: 'Stationary Lander (Carl Sagan Memorial Station) & First Wheeled Mars Rover',
    agency: 'NASA',
    date: 'July 4, 1997',
    year: 1997,
    status: 'historic_monument',
    statusLabel: 'Carl Sagan Memorial Station',
    locationName: 'Ares Vallis (ancient flood plain in Chryse Planitia), Mars',
    coordinates: {
      lat: 19.3,
      lon: -33.52,
      display: '19.30° N, 33.52° W (19.13° N, 33.22° W aerographic)',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '1996-12-04',
      landed: '1997-07-04',
      ended: '1997-09-27',
      summary:
        'Launched: Dec 4, 1996 | Landed: July 4, 1997 | Final Transmission: Sept 27, 1997',
    },
    plannedVsActual:
      'My little Sojourner rover was only built for a 7-day test (and I was planned for 30 days)—yet together we explored Mars for 83 Martian sols, nearly 12 times longer than planned!',
    specs:
      'Sojourner weighs only 10.6 kg (23 lbs) and stands 30 cm (1 ft) tall—about the size of a microwave oven—powered by solar panels and batteries.',
    instruments: [
      'Alpha Proton X-Ray Spectrometer (APXS)',
      'Imager for Mars Pathfinder (IMP) stereo camera',
      'Rover cameras',
      'Atmospheric Structure & Meteorology Package',
    ],
    scientificDiscoveries:
      'We sent home 2.3 billion bits of data, 16,500+ lander photos, 550+ rover photos, and 15+ chemical tests of Martian rocks and soil—finding rounded pebbles that proved raging water once flooded Mars.',
    storytellingHook:
      'Wrapped inside a 5.8-meter bunch of giant airbags, I slammed into Mars at 31 mph and bounced like a beach ball 15 times—up to 15 meters high!—before opening my petals so little Sojourner could drive onto another planet.',
    firstPersonMonologue:
      'I slammed into the rusty red ground of Mars on July 4, 1997, at 31 miles per hour wrapped inside a 5.8-meter cluster of giant airbags, bouncing across the rocks like a giant beach ball 15 times—launching up to 15 meters high into the air! Once I rolled to a stop and opened up my petals like a flower, I let my microwave-sized companion, the Sojourner rover, drive down my ramp onto Martian soil for the very first time. Even though Sojourner was only built for a 7-day mission after our December 1996 launch, we worked together until September 27, 1997, snapping over 16,500 images and studying nearby rocks.',
    officialSource: 'https://science.nasa.gov/mission/mars-pathfinder/',
    nssdcaId: '1996-068A',
    catalogRef: 'NSSDCA ID 1996-068A',
    massKg: 11,
    story: {
      headline: 'Airbag Bounce Touchdown & First Wheeled Rover on Mars',
      introduction:
        'I am Mars Pathfinder—renamed the Carl Sagan Memorial Station—and in 1997 I bounced across Mars in giant airbags before opening my petals to let the very first Mars rover roll free.',
      theScience:
        'Together, Sojourner and I beamed back over 16,500 photos and studied rocks like Barnacle Bill and Yogi, discovering smooth flood-rounded pebbles that proved liquid water once rushed across Mars.',
      whyLeftBehind:
        'After 83 Martian days—nearly 12 times Sojourner’s 7-day warranty—fading batteries and the bitter Martian cold ended our final radio message on September 27, 1997.',
      forSchoolKids:
        'I bounced across Mars inside giant airbags like a beach ball before opening my petals and letting the microwave-sized Sojourner rover drive onto another planet for the first time!',
    },
    famousQuote:
      'I bounced onto Mars in giant airbags and set the very first Mars rover rolling.',
    funFacts: [
      'I bounced 15 times on giant Kevlar airbags up to 15 meters high when landing on Mars.',
      'My little partner Sojourner is only the size of a microwave oven at 10.6 kg.',
      'Together we beamed home over 16,500 lander images and 550+ rover photos.',
    ],
    keyComponents: [
      'Alpha Proton X-Ray Spectrometer (APXS)',
      'Imager for Mars Pathfinder (IMP) stereo camera',
      'Rover cameras',
      'Atmospheric Structure & Meteorology Package',
    ],
    imageUrl: '/assets/aistudio/mars_path_finder_008da1e5.webp',
    imageCaption: 'Mars Pathfinder lander & deflated airbags on Ares Vallis with Sojourner parked on top',
    galleryImages: [
      {
        url: '/assets/aistudio/sojourney_rover_3a985ceb.jpg',
        caption: 'Sojourner rover inspecting Martian rocks beside the Carl Sagan Memorial Station',
        postcardTarget: 'history',
      },
    ],
    statPills: {
      mass: '10.6 kg (23 lbs) Sojourner rover',
      size: '65 cm long × 30 cm tall (microwave-sized)',
      power: 'Solar panels + primary batteries',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'spirit-and-opportunity',
    artifactNumber: '06',
    name: 'Mars Exploration Rovers: Spirit & Opportunity',
    mission: 'Mars Exploration Rovers',
    moniker: 'Spirit & Opportunity',
    body: 'mars',
    category: 'rover',
    categoryLabel: 'Twin Robotic Geologist Rovers',
    agency: 'NASA',
    date: 'January 2004',
    year: 2004,
    status: 'historic_monument',
    statusLabel: 'Twin Field Geologists',
    locationName: 'Spirit: Gusev Crater | Opportunity: Meridiani Planum (Perseverance Valley), Mars',
    coordinates: {
      lat: -14.57,
      lon: 175.47,
      secondaryLat: -2.28,
      secondaryLon: 354.77,
      display:
        'Spirit: 14.57° S, 175.47° E | Opportunity: Landed 1.95° S, 354.47° E; final resting site 2.28° S, 354.77° E',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '2003-06-10 / 2003-07-07',
      landed: '2004-01-03 / 2004-01-24',
      ended: '2010-03-22 / 2018-06-10',
      summary:
        'Spirit Landed: Jan 3, 2004 (Ended: 2010) | Opportunity Landed: Jan 24, 2004 (Last Contact: June 10, 2018)',
    },
    plannedVsActual:
      'We were only promised a 90-sol (3-month) mission—yet my twin Spirit explored for over 6 years (7.73 km driven) and I, Opportunity, kept rolling for nearly 15 years (45.16 km / 28.06 miles)!',
    specs:
      'We are golf-cart-sized six-wheeled rovers powered by solar wings (periodically dusted off by lucky Martian wind gusts) and lithium-ion batteries.',
    instruments: [
      'Panoramic Camera (Pancam)',
      'Microscopic Imager',
      'Rock Abrasion Tool (RAT)',
      'Mössbauer Spectrometer',
      'Alpha Particle X-Ray Spectrometer (APXS)',
      'Mini-TES',
    ],
    scientificDiscoveries:
      "We uncovered unmistakable chemical clues—including tiny iron-rich mineral spheres nicknamed 'blueberries'—proving liquid water once pooled and flowed across ancient Mars in places where tiny life could have lived.",
    storytellingHook:
      'I outlived my 90-day warranty by 55 times—driving over 28 miles across Mars until a monster planet-wide dust storm blotted out the Sun in June 2018 and put me to rest on the rim of Perseverance Valley.',
    firstPersonMonologue:
      'Launching from Earth in June and July 2003 and landing on opposite sides of Mars in January 2004, my twin Spirit and I set out on a 90-day mission to hunt for signs of ancient water. Spirit kept climbing hills and studying rocks until March 2010, while I—Opportunity—outlived my 90-day warranty by 55 times, trekking 28.06 miles across craters and plains! After nearly 15 years of exploring, a massive planet-wide dust storm hid the Sun in June 2018, leaving me silent on the rim of Perseverance Valley.',
    youtubeUrl: 'https://www.youtube.com/watch?v=8u6gNH6xIfc',
    officialSource:
      'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/',
    nssdcaId: '2003-027A / 2003-032A',
    catalogRef: 'NSSDCA ID 2003-027A / 2003-032A',
    massKg: 185,
    story: {
      headline: 'Twin Robot Geologists That Outlived a 90-Day Warranty for Years',
      introduction:
        'We are twin robot geologists—Spirit and Opportunity—sent to opposite sides of Mars for what was only supposed to be a 90-day rock-hunting road trip.',
      theScience:
        "Using our diamond Rock Abrasion Tool and spectrometers, we spotted mineral 'blueberries' and ancient silica vents that proved Mars once had standing liquid water.",
      whyLeftBehind:
        'Spirit got stuck in soft Martian sand at Troy in 2009 and lost contact in 2010, while a global dust storm blocked sunlight from my solar wings in June 2018.',
      forSchoolKids:
        'Spirit and I were only built to work for 90 days on Mars—yet Spirit explored for over 6 years and I drove 28 miles across nearly 15 years!',
    },
    famousQuote:
      'My battery is low and it’s getting dark.',
    funFacts: [
      'I drove 45.16 km (28.06 miles)—setting a driving record on another world that stood for years.',
      'Lucky Martian dust devils swept dust right off our solar wings to keep us alive.',
      'We discovered tiny hematite spheres nicknamed Martian blueberries that only form with water.',
    ],
    keyComponents: [
      'Panoramic Camera (Pancam)',
      'Microscopic Imager',
      'Rock Abrasion Tool (RAT)',
      'Mössbauer Spectrometer',
      'Alpha Particle X-Ray Spectrometer (APXS)',
      'Mini-TES',
    ],
    imageUrl: '/assets/aistudio/mars_spirit_3663b9b1.jpg',
    imageCaption: 'Mars Exploration Rover Spirit surveying rocky plains inside Gusev Crater',
    galleryImages: [
      {
        url: '/assets/aistudio/mars_opportinity_9346cf4e.jpg',
        caption: 'Twin rover Opportunity exploring Meridiani Planum over its 28-mile marathon trek',
        postcardTarget: 'history',
      },
    ],
    statPills: {
      mass: '185 kg (408 lbs) per rover',
      size: '1.6 m × 2.3 m (golf-cart sized)',
      power: 'Solar wings + Li-ion batteries',
    },
    model3dUrl: '/models/Mars%20Exploration%20Rover%20-%20Opportunity%20(MER-B).glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'phoenix-mars-lander',
    artifactNumber: '08',
    name: 'Phoenix Mars Lander',
    mission: 'Phoenix',
    moniker: 'Phoenix Lander',
    body: 'mars',
    category: 'uncrewed_lander',
    categoryLabel: 'Stationary Martian Arctic Lander',
    agency: 'NASA',
    date: 'May 25, 2008',
    year: 2008,
    status: 'historic_monument',
    statusLabel: 'Arctic Permafrost Monument',
    locationName: 'Green Valley, Vastitas Borealis (Martian Arctic), Mars',
    coordinates: {
      lat: 68.2188,
      lon: -125.7492,
      display: '68.2188° N, 125.7492° W',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '2007-08-04',
      landed: '2008-05-25',
      ended: '2008-11-02',
      summary:
        'Launched: Aug 4, 2007 | Landed: May 25, 2008 | Last Contact: Nov 2, 2008 (Declared Complete: May 24, 2010)',
    },
    plannedVsActual:
      'I was designed for a 90-sol summer mission in the Martian Arctic, yet I kept digging and studying sky clouds for 157 Martian sols until dark winter froze my solar power.',
    specs:
      'My 350 kg (770 lbs) body opens twin octagonal solar wings and reaches out with a 2.35-meter (7.7 ft) titanium-aluminum digging arm.',
    instruments: [
      'Robotic Arm (RA) & Robotic Arm Camera (RAC)',
      'Surface Stereo Imager (SSI)',
      'Thermal & Evolved Gas Analyzer (TEGA)',
      'MECA Wet Chemistry & Microscopy Lab',
      'Meteorological Station (MET)',
    ],
    scientificDiscoveries:
      'I dug straight into the frozen Arctic ground and scooped up real white water ice just centimeters below the dust! I also discovered perchlorate salts in the soil and watched snow fall from high Martian clouds.',
    storytellingHook:
      'Named after the mythical bird reborn from ashes because engineers built me from spare hardware of a canceled 2001 lander, I tasted real water ice—and later passed my spacecraft body design on to InSight.',
    firstPersonMonologue:
      'Named after the mythical bird reborn from ashes because I was built from the hardware of a canceled 2001 lander, I touched down in the icy Arctic plains of Mars on May 25, 2008. Using my 2.35-meter robotic digging arm, I scooped into frozen permafrost to bake and confirm real water ice—and later passed my exact spacecraft design on to the InSight lander! After launching in August 2007 for a 90-day mission, I worked right through 157 Martian days until shrinking Arctic winter sunlight put me to sleep in November 2008.',
    youtubeUrl: 'https://www.youtube.com/watch?v=hH5pNFROlYU',
    officialSource: 'https://science.nasa.gov/mission/phoenix/',
    nssdcaId: '2007-034A',
    catalogRef: 'NSSDCA ID 2007-034A',
    massKg: 350,
    story: {
      headline: 'Reborn From Canceled Hardware to Taste Water Ice in Mars’ Arctic',
      introduction:
        'I am Phoenix—literally built from spare parts of a canceled lander to prove frozen water hides just a few inches under the Martian Arctic dirt.',
      theScience:
        'My robotic arm scooped bright white chunks of water ice into my TEGA ovens, spotted perchlorate salts in my chemistry beakers, and watched Martian snow drift down from high cirrus clouds.',
      whyLeftBehind:
        'Standing in Vastitas Borealis near Mars’ north pole, I lost sunlight when freezing Arctic winter darkness and dry-ice frost arrived in November 2008.',
      forSchoolKids:
        'I dug right into Mars’ icy north pole and proved real frozen water ice sits just inches under the dirt—and I even watched Martian snow fall from clouds!',
    },
    famousQuote:
      'We have water ice on Mars—I touched and verified it right in the Arctic soil.',
    funFacts: [
      'I was built from hardware originally constructed for a canceled 2001 Mars lander.',
      'My 2.35-meter robotic arm uncovered bright subsurface water ice just centimeters deep.',
      'My laser weather mast watched snow falling from high Martian cirrus clouds.',
    ],
    keyComponents: [
      'Robotic Arm (RA) & Robotic Arm Camera (RAC)',
      'Surface Stereo Imager (SSI)',
      'Thermal & Evolved Gas Analyzer (TEGA)',
      'MECA Wet Chemistry & Microscopy Lab',
      'Meteorological Station (MET)',
    ],
    imageUrl: '/assets/aistudio/mars_phoenix_lander_9790363d.jpg',
    imageCaption: 'Phoenix Mars Lander digging into icy Arctic permafrost in Vastitas Borealis',
    statPills: {
      mass: '350 kg (770 lbs) landing mass',
      size: '5.5 m span × 2.35 m digging arm',
      power: 'Twin octagonal solar arrays + NiH2 battery',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'insight-lander',
    artifactNumber: '09',
    name: 'InSight Lander',
    mission: 'InSight',
    moniker: 'InSight Lander',
    body: 'mars',
    category: 'uncrewed_lander',
    categoryLabel: 'Stationary Geophysical Lander',
    agency: 'NASA',
    date: 'November 26, 2018',
    year: 2018,
    status: 'historic_monument',
    statusLabel: 'Elysium Planitia Seismic Station',
    locationName: 'Western Elysium Planitia, Mars',
    coordinates: {
      lat: 4.5,
      lon: 135.62,
      display: "4.50° N, 135.62° E (about 600 km from Curiosity's Gale Crater)",
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '2018-05-05',
      landed: '2018-11-26',
      ended: '2022-12-15',
      summary:
        'Launched: May 5, 2018 | Landed: Nov 26, 2018 | End of Mission: Dec 15, 2022',
    },
    plannedVsActual:
      'Built for one Martian year (~2 Earth years), I listened to Mars’ heartbeat for over four Earth years until heavy red dust blanketed my solar wings.',
    specs:
      'Built on Phoenix’s proven lander frame with two round solar fans and a 1.8-meter (5 ft 9 in) robotic arm built to lift instruments directly onto the Martian dirt.',
    instruments: [
      'SEIS (ultra-sensitive dome seismometer)',
      'HP³ heat-flow probe',
      'RISE radio-science experiment',
      'Wind and air-pressure sensors',
      'Deployment cameras',
    ],
    scientificDiscoveries:
      'I gave Mars its very first medical checkup—detecting over 1,300 marsquakes and meteoroid hits, mapping the thickness of its crust and liquid iron core, and recording the first audio of Martian wind.',
    storytellingHook:
      'As four years of red dust piled across my circular solar panels, I saved one last trickle of energy in December 2022 to snap a final dusty selfie before drifting peacefully to sleep.',
    firstPersonMonologue:
      'Built from the proven frame of the Phoenix lander, I spent four years sitting quietly on Elysium Planitia giving Mars its very first medical checkup—listening closely for marsquakes and meteoroid strikes with my 1.8-meter robotic arm and dome seismometer. As thick red dust slowly covered my two round solar fans, I used my final trickle of power in December 2022 to snap one last dusty selfie for Earth before going to sleep. My mission began on May 5, 2018, landed on November 26, 2018, and officially wrapped up on December 15, 2022.',
    youtubeUrl: 'https://www.youtube.com/watch?v=JJZ6UlH_TfQ',
    officialSource: 'https://science.nasa.gov/mission/insight/',
    nssdcaId: '2018-042A',
    catalogRef: 'NSSDCA ID 2018-042A',
    massKg: 358,
    story: {
      headline: 'Taking the Planetary Pulse of Mars With Over 1,300 Marsquakes',
      introduction:
        'I am InSight, the robot doctor who placed a super-sensitive seismometer straight onto Martian dirt to hear what lies miles beneath the Red Planet’s rusty surface.',
      theScience:
        'Over four years I heard more than 1,300 marsquakes and meteorite impacts, captured the first sound of Martian wind, and measured Mars’ crust, mantle, and liquid iron core.',
      whyLeftBehind:
        'Because I am a stationary lander without wheels, thick Martian dust gradually coated my solar panels until my batteries ran out in December 2022.',
      forSchoolKids:
        'I placed a super-sensitive stethoscope right onto Mars’ ground and listened to over 1,300 marsquakes rumbling deep inside the planet!',
    },
    famousQuote:
      'Don’t worry about me though: my time here has been both productive and serene.',
    funFacts: [
      'I detected over 1,300 marsquakes and meteoroid impacts across four Earth years.',
      'I recorded the very first direct audio of Martian winds brushing my solar panels.',
      'My radio-wobble experiment measured the size and liquid iron core deep inside Mars.',
    ],
    keyComponents: [
      'SEIS (ultra-sensitive dome seismometer)',
      'HP³ heat-flow probe',
      'RISE radio-science experiment',
      'Wind and air-pressure sensors',
      'Deployment cameras',
    ],
    imageUrl: '/assets/aistudio/insight_lander_mars_04e619c3.jpg',
    imageCaption: 'InSight Lander with its dome SEIS seismometer deployed on Elysium Planitia',
    statPills: {
      mass: '358 kg (789 lbs) lander',
      size: '6.0 m solar span × 1.8 m arm',
      power: 'Two circular 2.15 m solar arrays',
    },
    model3dUrl: '/models/InSight%20Cruise%20Lander%20(arm%20deployed).glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'ingenuity-mars-helicopter',
    artifactNumber: '10',
    name: 'Ingenuity Mars Helicopter',
    mission: 'Mars 2020 / Ingenuity',
    moniker: 'Ingenuity Helicopter',
    body: 'mars',
    category: 'rover',
    categoryLabel: 'Autonomous Solar-Powered Rotorcraft',
    agency: 'NASA',
    date: 'February 18, 2021',
    year: 2021,
    status: 'historic_monument',
    statusLabel: 'First Off-World Aircraft',
    locationName: 'Valinor Hills, Jezero Crater, Mars',
    coordinates: {
      lat: 18.49,
      lon: 77.42,
      display: 'Landed at 18.44° N, 77.45° E; final resting site at Valinor Hills (18.49° N, 77.42° E)',
    },
    hasSurfaceCoordinates: true,
    timeline: {
      launched: '2020-07-30',
      landed: '2021-02-18',
      ended: '2024-01-25',
      summary:
        'Launched: July 30, 2020 | Landed: Feb 18, 2021 | First Flight: April 19, 2021 | Final Flight (#72): Jan 18, 2024 | Retired: Jan 25, 2024',
    },
    plannedVsActual:
      'Engineers built me for a 30-day test of just 5 short flights—yet I soared 72 times across almost three years (128.8 flying minutes, 17.0 km covered, up to 24.0 m high)!',
    specs:
      'I weigh just 1.8 kg (3.97 lbs on Earth, and only 0.68 kg / 1.5 lbs in Mars gravity!). My counter-rotating carbon-fiber rotors span 1.2 m (4 ft) and spin off solar-charged batteries.',
    instruments: [
      'High-resolution downward navigation camera',
      'Horizon-facing color camera',
      'Laser altimeter',
      'Inclinometer',
      'Two-way radio link via Perseverance',
    ],
    scientificDiscoveries:
      'I gave humanity its Wright Brothers moment on another world—proving controlled flight works in Martian air thinner than 1% of Earth’s atmosphere—while scouting ahead for the Perseverance rover.',
    storytellingHook:
      'Tucked safely inside me is a postage-stamp-sized square of fabric from the 1903 Wright Flyer; after 72 historic flights and a chipped blade tip, I now rest proudly as a stationary weather monument on Mars.',
    firstPersonMonologue:
      'I carried a tiny, postage-stamp-sized piece of fabric from the original 1903 Wright Flyer tucked inside me, linking the very first airplane on Earth to the first flight on another planet. Even though I was only built for a 30-day test of five short flights, I soared 72 times across Jezero Crater—flying 24 meters high and covering 17 kilometers—before chipping a rotor blade and becoming a quiet weather station on Mars. My adventure started when I launched in July 2020 and landed on February 18, 2021, taking my first historic flight on April 19, 2021 and my 72nd flight on January 18, 2024.',
    youtubeUrl: 'https://www.youtube.com/watch?v=qMbHE_VXI-8',
    officialSource:
      'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/',
    nssdcaId: '2020-052A',
    catalogRef: 'NSSDCA ID 2020-052A',
    massKg: 2,
    story: {
      headline: 'Humanity’s First Powered Flight on Another World (72 Sorties)',
      introduction:
        'I am Ingenuity, the tiny 4-pound helicopter that proved human-made aircraft can fly in the super-thin skies of another planet.',
      theScience:
        'Spreading my 1.2-meter carbon-fiber blades at ~2,400 RPM in Mars’ 1% atmosphere, I flew 72 times for 128.8 total minutes and scouted rocky trails ahead of Perseverance.',
      whyLeftBehind:
        'After chipping a rotor blade landing in sandy dunes during Flight 72 on January 18, 2024, I retired at Valinor Hills in Jezero Crater as an active monument.',
      forSchoolKids:
        'I weigh only 4 pounds on Earth and carried a tiny piece of the Wright brothers’ 1903 airplane wing fabric across 72 Martian flights!',
    },
    famousQuote:
      'From Airfield Alpha on Mars—I proved powered flight works beyond Earth.',
    funFacts: [
      'I carry a postage-stamp-sized swatch of fabric from the 1903 Wright Flyer.',
      'I completed 72 flights instead of the 5 flights engineers originally planned.',
      'My 1.2 m counter-rotating carbon-fiber rotors spin ~2,400 RPM—five times faster than Earth helicopters.',
    ],
    keyComponents: [
      'High-resolution downward navigation camera',
      'Horizon-facing color camera',
      'Laser altimeter',
      'Inclinometer',
      'Two-way radio link via Perseverance',
    ],
    imageUrl: '/assets/aistudio/ingenuity_mars_helicopter_ec4fc174.webp',
    imageCaption: 'Ingenuity Mars Helicopter resting on the dusty floor of Jezero Crater',
    statPills: {
      mass: '1.8 kg (3.97 lbs Earth / 1.5 lbs Mars)',
      size: '1.2 m (4 ft) twin carbon-fiber rotors',
      power: 'Top solar panel + Li-ion batteries',
    },
    model3dUrl: '/models/Ingenuity%20Mars%20Helicopter.glb',
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
];

// ============================================================================
// 3. DEEP SPACE ARTIFACTS (5 Items)
// ============================================================================
export const DEEP_SPACE_ARTIFACTS: Artifact[] = [
  {
    id: 'pioneer-10',
    artifactNumber: '13',
    name: 'Pioneer 10',
    mission: 'Pioneer 10',
    moniker: 'Pioneer 10',
    body: 'deep_space',
    category: 'interstellar_probe',
    categoryLabel: 'Outer-Planet Flyby & Interstellar Probe',
    agency: 'NASA',
    date: 'March 2, 1972',
    year: 1972,
    status: 'interstellar_escape',
    statusLabel: 'Interstellar Escape (Taurus)',
    locationName:
      'Drifting silently through interstellar space (over 11 billion miles from Earth) toward the red giant star Aldebaran in Taurus.',
    coordinates: {
      lat: 0,
      lon: 0,
      display: 'Interstellar trajectory toward Aldebaran (Constellation Taurus)',
    },
    hasSurfaceCoordinates: false,
    timeline: {
      launched: '1972-03-02',
      landed: null,
      ended: '2003-01-23',
      summary:
        "Launched: March 2, 1972 | Jupiter Flyby: Dec 4, 1973 | Crossed Neptune's Orbit: June 13, 1983 | Last Signal: Jan 23, 2003",
    },
    plannedVsActual:
      'Built for a 21-month visit to Jupiter, I kept talking to Earth for over 30 years until my nuclear batteries grew too faint across 7.6 billion miles of space.',
    specs:
      'I weigh 258 kg (569 lbs) and blasted off at 51,682 km/h (32,110 mph) as the first all-nuclear deep-space explorer powered by two SNAP-19 Plutonium-238 RTGs.',
    instruments: [
      'Imaging Photopolarimeter',
      'Helium Vector Magnetometer',
      'Plasma Analyzer',
      'Cosmic Ray & Geiger Tube Telescopes',
      'Meteoroid Detectors',
    ],
    scientificDiscoveries:
      'I was the first spacecraft to weave safely through the asteroid belt, fly past Jupiter, and cross Neptune’s orbit—snapping the first close-ups of Jupiter’s Great Red Spot and mapping its fierce radiation belts.',
    storytellingHook:
      'Bolted to my antenna struts is a golden aluminum plaque showing a man, a woman, our solar system, and a star map to Earth—a message in a bottle flying toward the star Aldebaran over the next two million years.',
    firstPersonMonologue:
      'I carry a shiny gold-anodized plaque bolted to my antenna struts with pictures of a man, a woman, our planets, and a pulsar map showing Earth’s cosmic address—like a message in a bottle drifting toward the star Aldebaran for the next two million years. My adventure began when I launched on March 2, 1972, flew past Jupiter on December 4, 1973, and crossed Neptune’s orbit in 1983 before whispering my very last signal home on January 23, 2003.',
    officialSource: 'https://science.nasa.gov/mission/pioneer-10/',
    nssdcaId: '1972-012A',
    catalogRef: 'NSSDCA ID 1972-012A',
    trajectoryOrRegion: 'Interstellar Space toward Aldebaran (Taurus)',
    targetBodyName: 'Jupiter & Interstellar Space',
    distanceAu: '>133 AU (>11 Billion Miles from Earth)',
    massKg: 258,
    story: {
      headline: 'First Through the Asteroid Belt & Messenger to Taurus',
      introduction:
        'I am Pioneer 10, humanity’s trailblazer across the asteroid belt and Jupiter—still flying silently out between the stars with a golden greeting from Earth.',
      theScience:
        'I captured the first close-up images of Jupiter’s Great Red Spot and moons (Ganymede, Europa, Callisto) and proved spacecraft could survive giant-planet radiation.',
      whyLeftBehind:
        'Jupiter’s massive gravity flung me out of the solar system forever, and my nuclear RTGs gradually cooled too low to power my radio transmitter by January 2003.',
      forSchoolKids:
        'I carry a golden plaque showing where Earth is in the Milky Way as I drift silently toward the red giant star Aldebaran over the next two million years!',
    },
    famousQuote:
      'I am a message in a bottle drifting toward Aldebaran for the next two million years.',
    funFacts: [
      'I was the very first spacecraft to cross the asteroid belt and fly past Jupiter.',
      'I carry the famous golden Pioneer Plaque designed by Carl Sagan and Frank Drake.',
      'I talked with Earth for over 30 years—sending my last faint signal on January 23, 2003.',
    ],
    keyComponents: [
      'Imaging Photopolarimeter',
      'Helium Vector Magnetometer',
      'Plasma Analyzer',
      'Cosmic Ray & Geiger Tube Telescopes',
      'Meteoroid Detectors',
    ],
    imageUrl: '/assets/aistudio/deepspace_pioneer_10_a1bcd772.jpeg',
    imageCaption: 'Pioneer 10 coasting past the outer solar system toward interstellar space',
    statPills: {
      mass: '258 kg (569 lbs)',
      size: '2.74 m (9 ft) dish + long RTG booms',
      power: 'Two SNAP-19 Pu-238 RTGs (~155 W)',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'pioneer-11',
    artifactNumber: '14',
    name: 'Pioneer 11',
    mission: 'Pioneer 11',
    moniker: 'Pioneer 11',
    body: 'deep_space',
    category: 'interstellar_probe',
    categoryLabel: 'Outer-Planet Flyby & Interstellar Probe',
    agency: 'NASA',
    date: 'April 6, 1973',
    year: 1973,
    status: 'interstellar_escape',
    statusLabel: 'Interstellar Escape (Aquila)',
    locationName:
      'Drifting silently through interstellar space (over 9.1 billion miles from Earth) toward the constellation Aquila (passing star Lambda Aquila in ~4 million years).',
    coordinates: {
      lat: 0,
      lon: 0,
      display: 'Interstellar trajectory toward Constellation Aquila',
    },
    hasSurfaceCoordinates: false,
    timeline: {
      launched: '1973-04-06',
      landed: null,
      ended: '1995-11-24',
      summary:
        'Launched: April 6, 1973 | Jupiter Flyby: Dec 3, 1974 | Saturn Flyby: Sept 1, 1979 | Last Signal: Nov 24, 1995',
    },
    plannedVsActual:
      'Built for a 21-month flyby tour, I kept working for over 22 years until my nuclear RTG power dipped too low to aim my antenna dish.',
    specs:
      'I weigh 258.5 kg (570 lbs) with a hexagonal body, a 2.74-meter (9 ft) high-gain dish antenna, and two SNAP-19 Plutonium-238 RTGs.',
    instruments: [
      'Imaging Photopolarimeter',
      'Helium Vector & Triaxial Fluxgate Magnetometers',
      'Infrared Radiometer',
      'Plasma Analyzer',
      'Charged Particle & Cosmic Ray Telescopes',
    ],
    scientificDiscoveries:
      'I became the very first spacecraft to reach Saturn—skimming just 21,000 km above its cloud tops—where I discovered Saturn’s narrow F ring and a hidden moon, after snapping the first close-up views of Jupiter’s poles.',
    storytellingHook:
      'Just like my twin Pioneer 10, I carry Carl Sagan’s golden plaque showing Earth’s location beside 14 pulsars—now gliding silently like a cosmic ghost ship toward the constellation Aquila.',
    firstPersonMonologue:
      'Just like my twin Pioneer 10, I carry a shiny golden plaque showing pictures of humans and a star map pointing straight back to Earth—and now I glide silently like a cosmic ghost ship toward the Milky Way constellation Aquila. My journey started when I launched on April 6, 1973, swung past Jupiter’s poles in December 1974, and became humanity’s first visitor to Saturn on September 1, 1979, before my final signals arrived home in late 1995.',
    officialSource: 'https://science.nasa.gov/mission/pioneer-11/',
    nssdcaId: '1973-019A',
    catalogRef: 'NSSDCA ID 1973-019A',
    trajectoryOrRegion: 'Interstellar Space toward Constellation Aquila',
    targetBodyName: 'Jupiter, Saturn & Interstellar Space',
    distanceAu: '>111 AU (>9.1 Billion Miles from Earth)',
    massKg: 259,
    story: {
      headline: 'First Explorer to Reach Saturn & Cosmic Ghost Ship Toward Aquila',
      introduction:
        'I am Pioneer 11—the scout who banked sharply around Jupiter so I could thread past Saturn’s icy rings for the first time in history.',
      theScience:
        'While skimming 21,000 km above Saturn’s clouds, I discovered the narrow F ring and a new moon, scouting a safe highway for Voyager 1 and 2.',
      whyLeftBehind:
        'Saturn’s gravity launched me onto an endless escape path toward Aquila, and declining nuclear power quieted my radio in November 1995.',
      forSchoolKids:
        'I was the very first spacecraft to visit Saturn, threading safely past its icy rings before flying out of our solar system forever!',
    },
    famousQuote:
      'I am coasting silently like a cosmic ghost ship toward the heart of the Milky Way.',
    funFacts: [
      'I was the very first spacecraft to fly past Saturn in September 1979.',
      'I discovered Saturn’s narrow F ring while skimming 21,000 km above its clouds.',
      'I carry the second gold-anodized Pioneer Plaque toward Constellation Aquila.',
    ],
    keyComponents: [
      'Imaging Photopolarimeter',
      'Helium Vector & Triaxial Fluxgate Magnetometers',
      'Infrared Radiometer',
      'Plasma Analyzer',
      'Charged Particle & Cosmic Ray Telescopes',
    ],
    imageUrl: '/assets/aistudio/deepspace_pioneer_11_fc45c687.jpg',
    imageCaption: 'Pioneer 11 sweeping past Jupiter before heading to Saturn and interstellar space',
    statPills: {
      mass: '258.5 kg (570 lbs)',
      size: '2.74 m (9 ft) high-gain dish',
      power: 'Two SNAP-19 Pu-238 RTGs',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'near-shoemaker',
    artifactNumber: '12',
    name: 'NEAR Shoemaker',
    mission: 'NEAR Shoemaker',
    moniker: 'NEAR Shoemaker',
    body: 'deep_space',
    category: 'asteroid_impactor',
    categoryLabel: 'Asteroid Orbiter Turned Improvised Lander',
    agency: 'NASA',
    date: 'February 17, 1996',
    year: 1996,
    status: 'historic_monument',
    statusLabel: 'Resting on Asteroid 433 Eros',
    locationName:
      'Resting intact on the surface of 21-mile-long asteroid 433 Eros, just south of the saddle-shaped feature named Himeros.',
    coordinates: {
      lat: 0,
      lon: 0,
      display: 'Surface of Asteroid 433 Eros (south of Himeros)',
    },
    hasSurfaceCoordinates: false,
    timeline: {
      launched: '1996-02-17',
      landed: '2001-02-12',
      ended: '2001-02-28',
      summary:
        'Launched: Feb 17, 1996 | Entered Eros Orbit: Feb 14, 2000 | Landed on Eros: Feb 12, 2001 | Last Contact: Feb 28, 2001',
    },
    plannedVsActual:
      'I worked for five full years, including a surprise 16-day bonus mission resting right on an asteroid I was never built to land on!',
    specs:
      'I weigh 805 kg (1,775 lbs) and made history as the first spacecraft powered solely by solar panels beyond Mars—even though I had zero landing legs.',
    instruments: [
      'Multi-Spectral Imager (MSI)',
      'Near-Infrared Spectrometer (NIS)',
      'X-Ray/Gamma-Ray Spectrometer (XGRS)',
      'Magnetometer (MAG)',
      'Laser Rangefinder (NLR)',
    ],
    scientificDiscoveries:
      'I was the first spacecraft ever to orbit and soft-land on an asteroid! I sent back 160,000 images (10 times more data than promised), mapped over 70% of 433 Eros, and proved the space rock has no magnetic field.',
    storytellingHook:
      'Built strictly as an orbiter with zero landing legs, NASA gently eased me down onto asteroid 433 Eros at a walking pace of 4 mph—and I survived touchdown to radio gamma-ray science home for two more weeks!',
    firstPersonMonologue:
      'Built strictly to fly around space rocks with zero landing legs, I was gently guided down onto the asteroid Eros at a slow walking pace of 4 miles per hour! Surviving the touchdown made me the first spacecraft ever to land on an asteroid, and I broadcast gamma-ray science right from the dusty surface for 16 extra days until freezing -173°C (-279°F) cold finally put my systems to sleep. I launched on February 17, 1996, entered Eros’ orbit on February 14, 2000, touched down on February 12, 2001, and sent my final signal on February 28, 2001.',
    youtubeUrl: 'https://www.youtube.com/watch?v=4bWn_DgmNqc',
    officialSource: 'https://science.nasa.gov/mission/near-shoemaker/',
    nssdcaId: '1996-008A',
    catalogRef: 'NSSDCA ID 1996-008A',
    trajectoryOrRegion: 'Surface of Asteroid 433 Eros (~1.46 AU)',
    targetBodyName: 'Asteroid 433 Eros',
    distanceAu: '~1.46 AU (Near-Earth Asteroid Orbit)',
    massKg: 805,
    story: {
      headline: 'The Legless Orbiter That Soft-Landed on Asteroid 433 Eros',
      introduction:
        'I am NEAR Shoemaker—an asteroid orbiter with zero landing gear that pulled off a gentle 4 mph belly landing on 21-mile-long asteroid 433 Eros.',
      theScience:
        'Even from the dusty surface, my X-Ray/Gamma-Ray Spectrometer analyzed Eros’s rocky crust up close after I had already mapped more than 70% of the asteroid from orbit.',
      whyLeftBehind:
        'After touching down near Eros’s saddle-shaped Himeros crater on February 12, 2001, I kept transmitting for 16 days until brutal -173°C cold ended my batteries on February 28.',
      forSchoolKids:
        'Even though I had zero landing legs, engineers gently set me down on asteroid Eros at 4 mph—making me the first spacecraft ever to land on an asteroid!',
    },
    famousQuote:
      'I survived touchdown at 4 mph with zero landing legs on an asteroid.',
    funFacts: [
      'I am the first spacecraft ever to orbit and soft-land on an asteroid.',
      'I returned 160,000 images—10 times more data than originally planned.',
      'I was the first spacecraft powered by solar cells beyond Mars’ orbit.',
    ],
    keyComponents: [
      'Multi-Spectral Imager (MSI)',
      'Near-Infrared Spectrometer (NIS)',
      'X-Ray/Gamma-Ray Spectrometer (XGRS)',
      'Magnetometer (MAG)',
      'Laser Rangefinder (NLR)',
    ],
    imageUrl: '/assets/aistudio/deepspace_near_shoemaker_17375dee.jpeg',
    imageCaption: 'NEAR Shoemaker spacecraft approaching cratered asteroid 433 Eros',
    statPills: {
      mass: '805 kg (1,775 lbs)',
      size: '1.7 m bus + 4 solar wings',
      power: '4 GaAs solar panels (first beyond Mars)',
    },
  },
  {
    id: 'dawn',
    artifactNumber: '11',
    name: 'Dawn Spacecraft',
    mission: 'Dawn',
    moniker: 'Dawn Spacecraft',
    body: 'deep_space',
    category: 'planetary_orbiter',
    categoryLabel: 'Ion-Propelled Deep-Space Orbiter',
    agency: 'NASA',
    date: 'September 27, 2007',
    year: 2007,
    status: 'disposed',
    statusLabel: 'Quiescent Orbit at Ceres',
    locationName:
      'Perpetual, silent, unpowered orbit around dwarf planet Ceres in the main asteroid belt between Mars and Jupiter.',
    coordinates: {
      lat: 0,
      lon: 0,
      display: 'High planetary-protection orbit around Dwarf Planet Ceres',
    },
    hasSurfaceCoordinates: false,
    timeline: {
      launched: '2007-09-27',
      landed: null,
      ended: '2018-11-01',
      summary:
        'Launched: Sept 27, 2007 | Orbited Vesta: 2011–2012 | Orbited Ceres: 2015–2018 | End of Mission: Oct/Nov 2018',
    },
    plannedVsActual:
      'I worked across 11 years and two different worlds before using up the last drops of my hydrazine steering fuel in November 2018.',
    specs:
      'Spanning 19.7 meters (65 ft) tip-to-tip with my huge solar wings, I used three blue-glowing Xenon Ion Thrusters to reshape my orbit across the asteroid belt.',
    instruments: [
      'Framing Camera (FC)',
      'Visible and Infrared Mapping Spectrometer (VIR)',
      'Gamma Ray and Neutron Detector (GRaND)',
    ],
    scientificDiscoveries:
      'I became the first spacecraft ever to orbit two deep-space worlds—giant protoplanet Vesta and dwarf planet Ceres! I spotted glowing white sodium-carbonate salt spots on Ceres left behind by ancient underground brines.',
    storytellingHook:
      'Before my steering fuel ran empty after 11 years, NASA parked me in a high, safe planetary-protection orbit so I will circle Ceres quietly for decades without touching its icy world.',
    firstPersonMonologue:
      'I fired special blue-glowing xenon ion engines to become the very first spacecraft to orbit two different worlds beyond Earth—the giant asteroid Vesta and the dwarf planet Ceres. Before I ran out of steering fuel after 11 years in the asteroid belt, NASA carefully parked me in a high, safe orbit so I will circle Ceres silently for decades without ever touching its icy surface. My road trip began on September 27, 2007, orbiting Vesta from 2011 to 2012 before arriving at Ceres in 2015 and retiring on November 1, 2018.',
    youtubeUrl: 'https://www.youtube.com/watch?v=MGpRPpfeIAw',
    officialSource: 'https://science.nasa.gov/mission/dawn/',
    nssdcaId: '2007-043A',
    catalogRef: 'NSSDCA ID 2007-043A',
    trajectoryOrRegion: 'Ceres Planetary-Protection Orbit (2.77 AU Asteroid Belt)',
    targetBodyName: 'Vesta & Dwarf Planet Ceres',
    distanceAu: '~2.77 AU (Main Asteroid Belt)',
    massKg: 1218,
    story: {
      headline: 'The Ion-Propelled Explorer of Two Worlds: Vesta and Ceres',
      introduction:
        'I am Dawn, a deep-space traveler whose gentle blue ion engines carried me from orbiting giant Vesta all the way to dwarf planet Ceres.',
      theScience:
        'By mapping Vesta’s towering crater mountains and Ceres’s bright salt domes in Occator Crater, I helped unlock how rocky and icy worlds formed at the birth of our solar system.',
      whyLeftBehind:
        'Once my hydrazine steering fuel ran out in late 2018, I stayed in a decades-long safe quarantine orbit high above Ceres so Earth microbes could never contaminate its subsurface brines.',
      forSchoolKids:
        'I used futuristic blue-glowing xenon ion thrusters to orbit Vesta first and then fly on to orbit dwarf planet Ceres—the only spacecraft ever to orbit two deep-space worlds!',
    },
    famousQuote:
      'I am silently circling dwarf planet Ceres in a high planetary-protection orbit.',
    funFacts: [
      'I am the first spacecraft ever to orbit two separate deep-space worlds (Vesta and Ceres).',
      'I accelerated gently using three high-efficiency Xenon Ion Thrusters.',
      'I discovered bright salt deposits left behind by icy cryovolcano brines on Ceres.',
    ],
    keyComponents: [
      'Framing Camera (FC)',
      'Visible and Infrared Mapping Spectrometer (VIR)',
      'Gamma Ray and Neutron Detector (GRaND)',
    ],
    imageUrl: '/assets/aistudio/deepspace_dawn_space_craft_f92d2274.jpg',
    imageCaption: 'Dawn firing its glowing blue xenon ion engine in orbit around dwarf planet Ceres',
    statPills: {
      mass: '1,218 kg (2,685 lbs)',
      size: '19.7 m (65 ft) solar wingspan',
      power: 'Giant twin solar arrays + 3 Xenon Ion engines',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
  {
    id: 'kepler',
    artifactNumber: '15',
    name: 'Kepler Space Telescope (Kepler / K2)',
    mission: 'Kepler / K2',
    moniker: 'Kepler / K2',
    body: 'deep_space',
    category: 'space_telescope',
    categoryLabel: 'Deep-Space Planet-Hunting Observatory',
    agency: 'NASA',
    date: 'March 6, 2009',
    year: 2009,
    status: 'historic_monument',
    statusLabel: 'Safe Heliocentric Orbit',
    locationName:
      'Decommissioned and drifting silently in a safe, Earth-trailing heliocentric orbit around the Sun.',
    coordinates: {
      lat: 0,
      lon: 0,
      display: 'Earth-trailing Heliocentric Orbit around the Sun',
    },
    hasSurfaceCoordinates: false,
    timeline: {
      launched: '2009-03-06',
      landed: null,
      ended: '2018-10-30',
      summary:
        'Launched: March 6, 2009 | K2 Extended Mission: May 2013 | Retired: Oct 30, 2018',
    },
    plannedVsActual:
      "Built for a 3.5-year sky survey, I stared at the stars for 9.5 years—including 19 'K2' campaigns after two reaction wheels failed—until my fuel tank finally ran dry.",
    specs:
      'I carry a 1.4-meter (4 ft 7 in) main mirror and a 0.95-meter (3 ft) photometer—which was the largest digital camera in deep space when I launched.',
    instruments: [
      'Wide-field CCD Photometer array (stared at 150,000+ stars in Cygnus and 500,000+ stars in K2)',
    ],
    scientificDiscoveries:
      'I discovered more than 2,600 confirmed exoplanets—including rocky Earth-sized worlds and multi-planet families—proving there are more planets than stars in our Milky Way galaxy!',
    storytellingHook:
      "When two of my four pointing wheels broke in 2013, engineers refused to quit—balancing me against the gentle push of sunlight itself, like a kayak paddling into a river current, to launch my 'K2' second act.",
    firstPersonMonologue:
      "When two of my four pointing wheels broke in 2013, NASA engineers refused to give up on me—balancing me against the gentle push of sunlight itself, just like a kayak steering into a river current! That clever trick started my 'K2' second act, letting me spot hundreds more exoplanets on top of the thousands I had already uncovered before my fuel tank finally ran dry. My planet hunt began when I launched on March 6, 2009, revealing over 2,600 alien worlds across 9.5 years before NASA peacefully retired me on October 30, 2018.",
    youtubeUrl: 'https://www.youtube.com/watch?v=_V7J05fK5e0',
    officialSource: 'https://science.nasa.gov/mission/kepler/',
    nssdcaId: '2009-011A',
    catalogRef: 'NSSDCA ID 2009-011A',
    trajectoryOrRegion: 'Earth-Trailing Heliocentric Orbit (~1.013 AU)',
    targetBodyName: 'Exoplanets & Stars',
    distanceAu: '~1.01 AU (Earth-Trailing Solar Orbit)',
    massKg: 1052,
    story: {
      headline: 'The Exoplanet Hunter That Proved Planets Outnumber Stars',
      introduction:
        'I am the Kepler Space Telescope—a deep-space planet hunter trailing quietly behind Earth around the Sun, after proving our galaxy is packed with other worlds.',
      theScience:
        'By watching for tiny dips in starlight when planets pass in front of their suns, I found more than 2,600 confirmed exoplanets, showing planets actually outnumber stars in the Milky Way.',
      whyLeftBehind:
        'After 9.5 years of staring across space, I ran out of hydrazine fuel in October 2018 and was safely powered down in an Earth-trailing orbit around the Sun.',
      forSchoolKids:
        'I stared at hundreds of thousands of stars and discovered over 2,600 alien planets—and when two pointing wheels broke, engineers balanced me using sunlight itself!',
    },
    famousQuote:
      'I balanced against the gentle pressure of sunlight to discover over 2,600 alien worlds.',
    funFacts: [
      'I discovered more than 2,600 confirmed exoplanets across 9.5 years in space.',
      'I used solar radiation pressure like a kayak paddle during my K2 extended mission.',
      'My 1.4-meter mirror and camera watched over 500,000 stars for tiny planet shadows.',
    ],
    keyComponents: [
      'Wide-field CCD Photometer array (stared at 150,000+ stars in Cygnus and 500,000+ stars in K2)',
    ],
    imageUrl: '/assets/aistudio/deepspace_kelpler_space_telescope_c3e41554.jpg',
    imageCaption: 'Kepler Space Telescope scanning hundreds of thousands of Milky Way stars for alien planets',
    statPills: {
      mass: '1,052 kg (2,319 lbs)',
      size: '4.7 m tall × 1.4 m mirror',
      power: 'Four solar panels (~1,100 W)',
    },
    nasa3dResourceUrl: 'https://github.com/nasa/NASA-3D-Resources',
  },
];

// ============================================================================
// 4. PLANETARY LANDMARKS (Craters, Volcanoes, Maria & Canyons)
// ============================================================================
export const LUNAR_LANDMARKS: PlanetaryLandmark[] = [
  {
    id: 'tycho',
    name: 'Tycho Crater',
    body: 'moon',
    type: 'crater',
    coordinates: { lat: -43.3, lon: -11.2 },
    diameterKm: 85,
    description:
      'Prominent 85-km impact crater with a massive 1,500-km bright ray system spreading across the lunar south.',
    significance:
      'Formed ~108 million years ago by an asteroid impact in the southern lunar highlands.',
  },
  {
    id: 'copernicus',
    name: 'Copernicus Crater',
    body: 'moon',
    type: 'crater',
    coordinates: { lat: 9.6, lon: -20.1 },
    diameterKm: 93,
    description:
      'Majestic 93-km complex crater with terraced walls and triple central peaks rising 1.2 km above the floor.',
    significance:
      'The defining benchmark for the Copernican lunar geological period (~800 million years ago).',
    associatedArtifactId: 'apollo-12-intrepid-alsep',
  },
  {
    id: 'tranquillitatis',
    name: 'Mare Tranquillitatis (Sea of Tranquility)',
    body: 'moon',
    type: 'mare',
    coordinates: { lat: 0.67, lon: 23.47 },
    diameterKm: 873,
    description: 'Vast titanium-rich dark basaltic volcanic plain formed 3.5 to 3.8 billion years ago.',
    significance:
      'Landing site of Apollo 11 ("Tranquility Base") and the first human landing on another world.',
    associatedArtifactId: 'apollo-11-eagle-easep',
  },
  {
    id: 'imbrium',
    name: 'Mare Imbrium (Sea of Rains)',
    body: 'moon',
    type: 'mare',
    coordinates: { lat: 33.0, lon: -16.0 },
    diameterKm: 1145,
    description:
      'One of the largest impact basins in the Solar System, ringed by towering mountain ridges.',
    significance: 'Site of Apollo 15 exploration along the Hadley-Apennine rim.',
    associatedArtifactId: 'apollo-15-falcon-lrv-alsep',
  },
  {
    id: 'procellarum',
    name: 'Oceanus Procellarum (Ocean of Storms)',
    body: 'moon',
    type: 'mare',
    coordinates: { lat: -3.01, lon: -23.42 },
    diameterKm: 2500,
    description:
      'The largest lunar mare, covering over 4 million square kilometers across the western near side.',
    significance: 'Landing ground of Surveyor 3 and Apollo 12.',
    associatedArtifactId: 'apollo-12-intrepid-alsep',
  },
  {
    id: 'apenninus',
    name: 'Montes Apenninus & Hadley Rille',
    body: 'moon',
    type: 'mountain',
    coordinates: { lat: 26.13, lon: 3.63 },
    diameterKm: 600,
    description:
      'Dramatic mountain arc rising up to 5,000 meters above Mare Imbrium, bordered by the 1,000-ft deep sinuous lava tube Hadley Rille.',
    significance:
      'Site where Apollo 15 astronauts found the 4.1-billion-year-old anorthosite "Genesis Rock".',
    associatedArtifactId: 'apollo-15-falcon-lrv-alsep',
  },
  {
    id: 'aristarchus',
    name: 'Aristarchus Crater',
    body: 'moon',
    type: 'crater',
    coordinates: { lat: 23.7, lon: -47.4 },
    diameterKm: 40,
    description:
      'The brightest large formation on the lunar near side, exhibiting an intense ray system and deep terraced walls on the Aristarchus Plateau.',
    significance:
      'A premier example of a young Copernican-era impact exposing deep highland anorthosite above surrounding mare basalts.',
  },
  {
    id: 'serenitatis',
    name: 'Mare Serenitatis (Sea of Serenity)',
    body: 'moon',
    type: 'mare',
    coordinates: { lat: 28.0, lon: 17.5 },
    diameterKm: 674,
    description:
      'Prominent circular volcanic mare northeast of Mare Tranquillitatis, filled with dark basaltic lava flows and bordered by the Montes Caucasus and Taurus mountains.',
    significance:
      'A classic lunar mascon (mass concentration) basin and exploration boundary for Apollo 15 and Apollo 17.',
  },
];

export const MARS_LANDMARKS: PlanetaryLandmark[] = [
  {
    id: 'olympus-mons',
    name: 'Olympus Mons',
    body: 'mars',
    type: 'volcano',
    coordinates: { lat: 18.65, lon: -133.8 },
    diameterKm: 624,
    description:
      'The largest volcano in the Solar System, towering 21.9 km (72,000 ft) high—nearly three times the height of Mount Everest.',
    significance:
      'A gigantic shield volcano with an 80-km caldera, demonstrating that Mars had no moving tectonic plates to drift volcanoes over mantle plumes.',
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris (Grand Canyon of Mars)',
    body: 'mars',
    type: 'canyon',
    coordinates: { lat: -14.0, lon: -59.2 },
    diameterKm: 4000,
    description:
      'A colossal tectonic canyon system stretching over 4,000 km (2,500 miles) long, up to 200 km wide, and 7 km (23,000 ft) deep.',
    significance:
      'Spans nearly a quarter of the Martian equator; would stretch from New York to Los Angeles on Earth.',
  },
  {
    id: 'jezero-crater',
    name: 'Jezero Crater & River Delta',
    body: 'mars',
    type: 'crater',
    coordinates: { lat: 18.44, lon: 77.45 },
    diameterKm: 45,
    description:
      'Ancient crater that held a 250-meter deep lake fed by an inflow river that deposited a fan-shaped delta of mud and clays.',
    significance:
      'Site of Ingenuity Mars Helicopter’s 72 historic aerial flights ending at Valinor Hills.',
    associatedArtifactId: 'ingenuity-mars-helicopter',
  },
  {
    id: 'gusev-crater',
    name: 'Gusev Crater (Columbia Hills)',
    body: 'mars',
    type: 'crater',
    coordinates: { lat: -14.57, lon: 175.47 },
    diameterKm: 166,
    description:
      'Vast 166-km crater carved by the ancient Ma’adim Vallis river outflow channel, home to the Columbia Hills.',
    significance:
      'Explored by the Spirit rover for 6 years, which discovered pure silica deposits from ancient volcanic hydrothermal vents.',
    associatedArtifactId: 'spirit-and-opportunity',
  },
  {
    id: 'chryse-planitia',
    name: 'Chryse Planitia (Plains of Gold)',
    body: 'mars',
    type: 'plain',
    coordinates: { lat: 22.48, lon: -47.97 },
    diameterKm: 1600,
    description:
      'Smooth low-elevation volcanic and flood plain at the terminus of massive ancient outflow channels.',
    significance:
      'Landing site of Viking 1 Lander in 1976, which returned the first color photos from Mars.',
    associatedArtifactId: 'viking-1-lander',
  },
  {
    id: 'ares-vallis',
    name: 'Ares Vallis (Catastrophic Flood Outflow)',
    body: 'mars',
    type: 'canyon',
    coordinates: { lat: 19.3, lon: -33.52 },
    diameterKm: 1700,
    description:
      'A massive ancient outflow channel carved by cataclysmic torrents of raging water flowing into Chryse Planitia.',
    significance: 'Landing site of the Mars Pathfinder lander and the Sojourner rover in 1997.',
    associatedArtifactId: 'mars-pathfinder-sojourner',
  },
  {
    id: 'elysium-planitia',
    name: 'Elysium Planitia',
    body: 'mars',
    type: 'plain',
    coordinates: { lat: 4.5, lon: 135.62 },
    diameterKm: 3000,
    description:
      'A vast, ultra-flat smooth volcanic plain along the equator of Mars near Elysium Mons.',
    significance:
      'Landing sanctuary of NASA’s InSight lander, which recorded 1,300+ marsquakes and mapped Mars’ liquid core.',
    associatedArtifactId: 'insight-lander',
  },
];

// ============================================================================
// 5. DATA RETRIEVAL & FILTER HELPERS
// ============================================================================
export function getArtifacts(body: CelestialBody): Artifact[] {
  if (body === 'moon') return MOON_ARTIFACTS;
  if (body === 'mars') return MARS_ARTIFACTS;
  if (body === 'deep_space') return DEEP_SPACE_ARTIFACTS;
  return [];
}

export function getAllArtifacts(): Artifact[] {
  return [...MOON_ARTIFACTS, ...MARS_ARTIFACTS, ...DEEP_SPACE_ARTIFACTS];
}

export function getArtifactById(id: string): Artifact | undefined {
  return getAllArtifacts().find((a) => a.id === id);
}

export function getPlanetaryLandmarks(body: CelestialBody): PlanetaryLandmark[] {
  if (body === 'moon') return LUNAR_LANDMARKS;
  if (body === 'mars') return MARS_LANDMARKS;
  return [];
}

export function getLunarLandmarks(): PlanetaryLandmark[] {
  return LUNAR_LANDMARKS;
}

export type ArtifactVoiceName = 'Sami' | 'Riko';

/**
 * Gemini TTS prebuilt voice assignments across all Moon, Mars, and Deep Space artifacts.
 * - Apollo 15 'Falcon' uses 'Sami'.
 * - The remaining 14 artifacts use an even 7/7 distribution of 'Riko' and 'Sami'.
 */
const ARTIFACT_VOICE_MAP: Record<string, ArtifactVoiceName> = {
  // Moon (Falcon -> Sami; remaining 3 -> 2 Riko, 1 Sami)
  'apollo-15-falcon-lrv-alsep': 'Sami',
  'apollo-11-eagle-easep': 'Riko',
  'apollo-12-intrepid-alsep': 'Sami',
  'surveyor-3': 'Riko',

  // Mars (6 -> 3 Sami, 3 Riko)
  'viking-1-lander': 'Sami',
  'mars-pathfinder-sojourner': 'Riko',
  'spirit-and-opportunity': 'Sami',
  'phoenix-mars-lander': 'Riko',
  'insight-lander': 'Sami',
  'ingenuity-mars-helicopter': 'Riko',

  // Deep Space (5 -> 3 Sami, 2 Riko)
  'pioneer-10': 'Sami',
  'pioneer-11': 'Riko',
  'near-shoemaker': 'Sami',
  'dawn': 'Riko',
  'kepler': 'Sami',
};

export function getArtifactVoiceName(artifactId: string): ArtifactVoiceName {
  return ARTIFACT_VOICE_MAP[artifactId] ?? 'Sami';
}
