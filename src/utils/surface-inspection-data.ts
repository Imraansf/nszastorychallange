import * as THREE from 'three';

export interface SurfaceInspectionPart {
  id: string;
  name: string;
  text: string;
  why: string;
  status?: string;
  seen?: boolean;
}

export interface MeshPartStats {
  sx: number;
  sy: number;
  sz: number;
  gold: boolean;
}

export interface CraftBounds {
  minY: number;
  H: number;
  cx: number;
  cz: number;
  W: number;
  R: number;
}

export interface SpacecraftInspectionConfig {
  nssdcLabel: string;
  craftShortName: string;
  parts: Record<string, SurfaceInspectionPart>;
  classify: (
    stats: MeshPartStats,
    pt: THREE.Vector3,
    bounds: CraftBounds
  ) => string;
}

function createApolloLMParts(mission: '11' | '12' | '15'): Record<string, SurfaceInspectionPart> {
  const craftName = mission === '11' ? 'Eagle' : mission === '12' ? 'Intrepid' : 'Falcon';
  const crewNote =
    mission === '11'
      ? 'Neil Armstrong could slow down and steer around big rocks.'
      : mission === '12'
      ? 'Pete Conrad steered Intrepid to land right next to Surveyor 3!'
      : 'Dave Scott landed Falcon right between tall Moon mountains.';

  const cabinNote =
    mission === '11'
      ? 'This is the room where Neil and Buzz stayed. It was tiny, about the size of the inside of a small car, and they stood up the whole time. Before leaving the Moon, Buzz saw that a small button needed to start the engine had broken off. He pushed a felt-tip pen into the hole, and the engine started.'
      : mission === '12'
      ? 'This is the cozy room where Pete Conrad and Alan Bean lived and slept in hammocks during their 31 hours on the Moon. It had no seats—the astronauts stood strapped to the floor while flying!'
      : 'This is the room where Dave Scott and Jim Irwin stayed for almost three days! They even opened a top hatch to stand up and look around the valley before driving their Moon buggy.';

  const cabinWhy =
    mission === '11'
      ? 'Why it’s cool: a simple felt-tip pen saved the day and brought the first moonwalkers home.'
      : 'Why it’s cool: standing instead of sitting saved weight and gave astronauts huge windows close to the glass.';

  return {
    dps: {
      id: 'dps',
      name: 'Descent engine and crushable nozzle skirt',
      text: `This is the rocket engine that slowed ${craftName} down so it could land gently. The astronauts could turn its power up and down, like a gas pedal in a car. The bell at the bottom was made to crumple if it bumped the ground, so it wouldn’t break anything important.`,
      why: `Why it’s cool: because the power could change, ${crewNote}`,
    },
    probe: {
      id: 'probe',
      name: 'Lunar surface contact probe',
      text: `A long, thin stick hanging down under some of ${craftName}’s feet. When its tip touched the Moon, a light came on inside and the astronauts turned the engine off. On Apollo 11, Buzz Aldrin called out, “Contact light!”`,
      why: 'Why it’s cool: Moon dust blew around like a storm and hid the ground, so this simple stick told the astronauts the exact moment they touched down.',
    },
    pad: {
      id: 'pad',
      name: 'Landing gear footpad',
      text: `Each of ${craftName}’s four feet is a big, round metal plate. Wide feet spread out the spaceship’s weight, just like snowshoes keep you from sinking in deep snow, so the lander wouldn’t sink into soft Moon dust.`,
      why: 'Why it’s cool: nobody knew for sure how soft the Moon’s dust was, so wide saucer feet were a safe, smart choice.',
    },
    gear: {
      id: 'gear',
      name: 'Landing gear leg and crush struts',
      text: `${craftName}’s four legs work like giant shock absorbers on a bike. Inside the tubes are metal pieces shaped like honeycombs that squish when the lander touches down, soaking up the bump. The legs folded up for the rocket ride and swung out before landing.`,
      why: 'Why it’s cool: using crushable metal instead of tricky springs meant there was almost nothing that could jam or break.',
    },
    dstage: {
      id: 'dstage',
      name: 'Descent stage: thermal blankets and equipment bays',
      text: `This bottom half carried the landing engine, fuel tanks, and legs. It is wrapped in thin, shiny gold foil that bounces the Sun’s fierce heat away so the lander doesn’t bake. A fold-down door on its side held ${
        mission === '15'
          ? 'the folded-up electric Moon buggy and science tools.'
          : 'the TV camera that showed Earth the astronauts’ first steps.'
      }`,
      why: 'Why it’s cool: space has no air to cool things down, so shiny foil works like a giant space thermos.',
    },
    interface: {
      id: 'interface',
      name: 'Ascent/descent stage interface',
      text: `${craftName} was two spaceships stacked together! Little explosive bolts held the top and bottom halves together, and at liftoff they popped apart. The bottom half stayed behind to act as a flat launch pad while the top half flew back to orbit.`,
      why: 'Why it’s cool: leaving the heavy bottom half and landing legs behind meant the top half needed much less fuel to blast off.',
    },
    rcs: {
      id: 'rcs',
      name: 'Reaction control thruster quad',
      text: `These are small steering rockets that nudge ${craftName} to tilt, turn, or slide sideways—like little puffs of air pushing a balloon. There are 16 of them, arranged in four groups of four around the top half.`,
      why: 'Why it’s cool: spread all around the lander, they let astronauts steer smoothly in any direction in zero gravity.',
    },
    dock: {
      id: 'dock',
      name: 'Overhead docking hatch and tunnel',
      text: `A round door on top of ${craftName}. When ${craftName} flew back up to meet the main spaceship waiting in Moon orbit, the two ships locked together here and the astronauts crawled through the tunnel carrying their boxes of Moon rocks.`,
      why: 'Why it’s cool: the astronauts could climb between two flying spaceships without having to go outside.',
    },
    dish: {
      id: 'dish',
      name: 'S-band antenna and rendezvous radar',
      text: `${craftName} had two round dishes on top. One beamed voices, live TV pictures, and data back to Earth. The other was a radar dish that tracked the main ship in orbit. On Apollo 11, extra radar signals made the computer flash alarms—but the smart computer skipped tiny chores and landed safely!`,
      why: 'Why it’s cool: NASA programmers built smart backup rules so the computer wouldn’t crash even when overloaded.',
    },
    vhf: {
      id: 'vhf',
      name: 'VHF antenna',
      text: `Thin metal antenna sticks, just like the aerial on a walkie-talkie. The radios inside the astronauts’ backpacks weren’t strong enough to reach Earth on their own, so ${craftName} caught their voices and boosted them onward.`,
      why: `Why it’s cool: ${craftName} worked like a miniature cell tower sitting right on the Moon.`,
    },
    cabin: {
      id: 'cabin',
      name: 'Ascent stage crew cabin',
      text: cabinNote,
      why: cabinWhy,
    },
  };
}

function classifyApolloLM(
  st: MeshPartStats,
  pt: THREE.Vector3,
  L: CraftBounds
): string {
  const fy = (pt.y - L.minY) / L.H;
  const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
  const w = Math.max(st.sx, st.sz);
  const fp = w / L.W;
  const thin = w < 0.06 * L.H && st.sy > 0.1 * L.H;

  if (fy < 0.45 && rr < 0.28 && fp < 0.4) return 'dps';
  if (thin && rr > 0.45 && fy < 0.35) return 'probe';
  if (fy < 0.14 && rr > 0.55) return 'pad';
  if (rr > 0.5 && fy < 0.45) return 'gear';
  if (fy > 0.72 && rr < 0.2) return 'dock';
  if (fy > 0.72 && fp < 0.35) return st.sy > 2.5 * w ? 'vhf' : 'dish';
  if (fy > 0.49 && rr > 0.4 && fp < 0.25) return 'rcs';
  if (fy > 0.4 && fy <= 0.49) return 'interface';
  if (fy <= 0.49) return 'dstage';
  return 'cabin';
}

export function getSpacecraftInspectionConfig(
  artifactId: string
): SpacecraftInspectionConfig {
  if (artifactId === 'apollo-11-eagle-easep') {
    return {
      nssdcLabel: 'NSSDC 1969-059C · Eagle (LM-5)',
      craftShortName: 'Eagle',
      parts: createApolloLMParts('11'),
      classify: classifyApolloLM,
    };
  }

  if (artifactId === 'apollo-12-intrepid-alsep') {
    return {
      nssdcLabel: 'NSSDC 1969-099C · Intrepid (LM-6)',
      craftShortName: 'Intrepid',
      parts: createApolloLMParts('12'),
      classify: classifyApolloLM,
    };
  }

  if (artifactId === 'apollo-15-falcon-lrv-alsep') {
    return {
      nssdcLabel: 'NSSDC 1971-063C · Falcon (LM-10)',
      craftShortName: 'Falcon',
      parts: createApolloLMParts('15'),
      classify: classifyApolloLM,
    };
  }

  if (artifactId === 'surveyor-3') {
    return {
      nssdcLabel: 'NSSDC 1967-035A · Surveyor 3',
      craftShortName: 'Surveyor 3',
      parts: {
        solar: {
          id: 'solar',
          name: 'High-gain solar panel and antenna mast',
          text: 'This flat blue panel on top turned sunlight into electricity to power Surveyor 3’s radio and camera. It sat high on a pole so it could catch the Sun and beam pictures back to Earth.',
          why: 'Why it’s cool: it proved robots could land safely on the Moon and send back weather and soil clues before astronauts arrived.',
        },
        camera: {
          id: 'camera',
          name: 'Surveyor television camera',
          text: 'A tube-shaped camera with a mirror on top that spun around to take over 6,300 pictures! Two and a half years later, Apollo 12 astronauts walked right up to Surveyor 3, unbolted this exact camera, and brought it back to Earth.',
          why: 'Why it’s cool: scientists studied the camera back on Earth to see how long-term Moon radiation affects metal and glass.',
        },
        legs: {
          id: 'legs',
          name: 'Tripod landing legs and honeycomb pads',
          text: 'Surveyor 3 stood on three lightweight aluminum legs with wide crushable footpads. When its radar saw the ground, its engines cut off just above the surface and it bounced gently onto its feet.',
          why: 'Why it’s cool: seeing how shallow its footprints were proved the Moon’s crust could hold up a heavy crewed Apollo lander!',
        },
        frame: {
          id: 'frame',
          name: 'Spaceframe and soil scoop bay',
          text: 'The open metal skeleton held radio boxes, silver-zinc batteries, and a small accordion-like robot arm that dug four little trenches in Moon dust to test how sticky and strong the soil was.',
          why: 'Why it’s cool: it was the very first robot to dig into another world’s soil.',
        },
      },
      classify: (st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        if (fy > 0.65) return 'solar';
        if (fy > 0.42 && rr > 0.25 && Math.max(st.sx, st.sz) < 0.35 * L.W) return 'camera';
        if (fy < 0.35 || rr > 0.58) return 'legs';
        return 'frame';
      },
    };
  }

  if (artifactId === 'viking-1-lander') {
    return {
      nssdcLabel: 'NSSDC 1975-075C · Viking 1 Lander',
      craftShortName: 'Viking 1',
      parts: {
        dish: {
          id: 'dish',
          name: 'High-gain parabolic radio dish',
          text: 'This big white dish pointed straight toward Earth so Viking 1 could send the very first clear photos and weather reports from the surface of Mars across hundreds of millions of kilometers!',
          why: 'Why it’s cool: it worked faithfully for more than six years in freezing Martian dust storms.',
        },
        rtg: {
          id: 'rtg',
          name: 'SNAP-19 nuclear power generators',
          text: 'Those two dark ribbed cylinders on the sides made steady electricity from warm plutonium heat instead of sunlight. That meant Viking 1 never worried about dust covering solar panels or dark winter days.',
          why: 'Why it’s cool: nuclear heat kept Viking 1 warm and awake through harsh Martian nights as cold as minus 100 degrees.',
        },
        cameras: {
          id: 'cameras',
          name: 'Twin panoramic cameras and weather mast',
          text: 'Tall metal eyes that scanned up and down, slice by slice, to build crisp color pictures of rusty Mars rocks and pink skies, while sensors measured wind speed, air pressure, and temperature.',
          why: 'Why it’s cool: Viking 1 snapped the very first color photograph ever taken from Mars.',
        },
        legs: {
          id: 'legs',
          name: 'Three-legged shock-absorbing landing gear',
          text: 'After parachutes and three braking rockets slowed Viking 1 down, these three sturdy legs squished slightly to cushion its touchdown on the rocky Chryse Planitia plain in July 1976.',
          why: 'Why it’s cool: Viking 1 became the first American spacecraft to safely land and work on Mars.',
        },
        body: {
          id: 'body',
          name: 'Biology lab and robotic soil scoop body',
          text: 'Inside this insulated six-sided box sat a miniature chemistry and biology laboratory! A 3-meter robot arm scooped up Martian dirt and dropped it inside to hunt for tiny signs of life.',
          why: 'Why it’s cool: it was like squeezing an entire science lab into a kitchen table and flying it to Mars.',
        },
      },
      classify: (st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        const w = Math.max(st.sx, st.sz);
        if (fy > 0.65 && w > 0.22 * L.W) return 'dish';
        if (fy > 0.58) return 'cameras';
        if (fy < 0.34 || rr > 0.68) return 'legs';
        if (rr > 0.42 && fy >= 0.34 && fy <= 0.65) return 'rtg';
        return 'body';
      },
    };
  }

  if (artifactId === 'insight-lander') {
    return {
      nssdcLabel: 'NSSDC 2018-042A · InSight Lander',
      craftShortName: 'InSight',
      parts: {
        solar: {
          id: 'solar',
          name: 'Twin circular Ultraflex solar arrays',
          text: 'These two huge round wings opened up like giant folding paper fans after landing! Each wing is over 2 meters wide and caught Martian sunlight to charge InSight’s batteries.',
          why: 'Why it’s cool: folding fan-style wings pack super flat inside a rocket and pop open smoothly on Mars.',
        },
        arm: {
          id: 'arm',
          name: 'Robotic Instrument Deployment Arm',
          text: 'A clever 1.8-meter mechanical arm with a claw hand and a camera on its wrist. It gently picked up InSight’s earthquake dome and heat probe right off the deck and set them down on the dirt.',
          why: 'Why it’s cool: it was the first time a robot arm ever placed a science tool directly onto the ground of another planet!',
        },
        legs: {
          id: 'legs',
          name: 'Three-legged shock-absorbing landing gear',
          text: 'Three sturdy legs with crushable honeycomb inside kept InSight level on the sandy Elysium Planitia plain after its rocket thrusters slowed it down for touchdown.',
          why: 'Why it’s cool: standing perfectly steady kept the lander from wobbling while it listened for marsquakes.',
        },
        deck: {
          id: 'deck',
          name: 'Insulated science deck and radio box',
          text: 'The central platform protected InSight’s computer brain, weather sensors, and radios that helped scientists measure how much Mars wobbles as it spins—revealing the size of Mars’s liquid metal core!',
          why: 'Why it’s cool: InSight acted like a doctor checking Mars’s heartbeat and temperature from the outside.',
        },
      },
      classify: (st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        if (rr > 0.48 && fy > 0.35) return 'solar';
        if (fy < 0.36) return 'legs';
        if (fy > 0.58 || (Math.max(st.sx, st.sz) < 0.25 * L.W && fy > 0.42)) return 'arm';
        return 'deck';
      },
    };
  }

  if (artifactId === 'ingenuity-mars-helicopter') {
    return {
      nssdcLabel: 'NSSDC 2020-056B · Ingenuity Mars Helicopter',
      craftShortName: 'Ingenuity',
      parts: {
        solar: {
          id: 'solar',
          name: 'Top solar charging panel',
          text: 'This small dark panel sits right above the helicopter blades and soaked up Martian sunshine to warm up Ingenuity’s batteries and get them ready for short, powerful flights.',
          why: 'Why it’s cool: Ingenuity charged completely on its own using only sunlight—no wires or plugs on Mars!',
        },
        rotors: {
          id: 'rotors',
          name: 'Twin counter-rotating carbon-fiber rotors',
          text: 'Two super-light 1.2-meter blades that spun in opposite directions at 2,500 revolutions per minute—nearly ten times faster than a helicopter on Earth—because Mars’s air is 100 times thinner than ours!',
          why: 'Why it’s cool: these blades achieved the first airplane-style powered flight on another planet in history.',
        },
        legs: {
          id: 'legs',
          name: 'Springy carbon-fiber landing legs',
          text: 'Four pencil-thin, feather-light legs that flexed like springs when Ingenuity hopped off the ground or touched back down on rocky Martian sand.',
          why: 'Why it’s cool: the entire helicopter weighed less than 2 kilograms on Earth—lighter than a bag of apples!',
        },
        fuselage: {
          id: 'fuselage',
          name: 'Insulated avionics and camera box',
          text: 'This tiny tissue-box-sized body wrapped in gold foil kept Ingenuity’s flight computer, heaters, tilt sensors, and downward navigation camera safe from freezing minus-90-degree Martian nights.',
          why: 'Why it’s cool: it flew 72 times instead of the planned 5, scouting ahead for the Perseverance rover!',
        },
      },
      classify: (_st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        if (fy > 0.88) return 'solar';
        if (fy > 0.66) return 'rotors';
        if (fy < 0.34 || rr > 0.55) return 'legs';
        return 'fuselage';
      },
    };
  }

  if (artifactId === 'spirit-and-opportunity') {
    return {
      nssdcLabel: 'NSSDC 2003-032A · MER Opportunity / Spirit',
      craftShortName: 'MER Rover',
      parts: {
        wheels: {
          id: 'wheels',
          name: 'Six-wheel rocker-bogie suspension',
          text: 'Six clever aluminum wheels with built-in motors and springy spokes! The special hinge system lets the rover climb over rocks as tall as its own wheels without tipping over.',
          why: 'Why it’s cool: Opportunity drove over 45 kilometers—more than a full marathon on Mars—when it was only built for 1 kilometer!',
        },
        solar: {
          id: 'solar',
          name: 'Fold-out solar array wings',
          text: 'Flat blue solar panels spread out like bat wings across the rover’s back, turning weak Martian sunlight into electricity. Martian dust storms coated them, and lucky gusts of wind often blew them clean again!',
          why: 'Why it’s cool: those wind gusts helped Opportunity survive for nearly 15 years instead of 90 days.',
        },
        mast: {
          id: 'mast',
          name: 'Pancam stereo camera mast',
          text: 'The rover’s tall white neck and head! Its twin “eyes” saw Mars in 3D color and infrared, helping drivers back on Earth pick safe paths around craters and sand traps.',
          why: 'Why it’s cool: it stood right around human eye height, so Mars photos looked just like standing there yourself.',
        },
        dish: {
          id: 'dish',
          name: 'High-gain steerable dish antenna',
          text: 'A round directional radio dish on the back deck that aimed straight at Earth to send home rock close-ups and driving logs.',
          why: 'Why it’s cool: it let scientists chat with a robot geologist across millions of kilometers of space.',
        },
        body: {
          id: 'body',
          name: 'Warm Electronics Box (WEB)',
          text: 'Wrapped in shiny gold insulation, this sturdy central body acted like a winter coat for the rover’s computer brain and batteries during freezing Martian nights.',
          why: 'Why it’s cool: inside sat spectrometers that helped prove liquid water once flowed on ancient Mars!',
        },
      },
      classify: (st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        if (fy > 0.65) return 'mast';
        if (fy < 0.34 || (rr > 0.62 && fy < 0.45)) return 'wheels';
        if (fy > 0.5 && Math.max(st.sx, st.sz) < 0.3 * L.W && rr > 0.3) return 'dish';
        if (fy > 0.43 && Math.max(st.sx, st.sz) > 0.4 * L.W) return 'solar';
        return 'body';
      },
    };
  }

  if (artifactId === 'mars-pathfinder-sojourner') {
    return {
      nssdcLabel: 'NSSDC 1996-068A · Mars Pathfinder',
      craftShortName: 'Pathfinder',
      parts: {
        petals: {
          id: 'petals',
          name: 'Solar-panel landing petals',
          text: 'Pathfinder landed wrapped inside giant bouncy airbags! Once the bags deflated, these three triangle-shaped doors flipped open like flower petals to set the lander upright and soak up sunlight.',
          why: 'Why it’s cool: airbag bouncing let NASA land on Mars way faster and cheaper than before.',
        },
        mast: {
          id: 'mast',
          name: 'IMP stereo camera & weather mast',
          text: 'A pop-up stereo camera and wind sock tower that photographed the Sojourner rover rolling down its ramp and measured Martian dust devils.',
          why: 'Why it’s cool: its photos became the first wildly popular NASA internet hits in 1997!',
        },
        dish: {
          id: 'dish',
          name: 'High-gain Earth dish antenna',
          text: 'A steerable radio dish that sent Sojourner’s rock discoveries and over 16,500 Pathfinder pictures back to scientists on Earth.',
          why: 'Why it’s cool: Pathfinder acted as the base station relaying everything the tiny rover discovered.',
        },
        core: {
          id: 'core',
          name: 'Central tetrahedron lander hub',
          text: 'The pyramid-shaped insulated core that kept Pathfinder’s radio, computer, and batteries warm after bouncing 15 times across rocky Ares Vallis.',
          why: 'Why it’s cool: it carried the little Sojourner rover tucked safely inside until landing day.',
        },
      },
      classify: (_st, pt, L) => {
        const fy = (pt.y - L.minY) / L.H;
        const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
        if (fy > 0.65) return 'mast';
        if (rr > 0.52 && fy < 0.35) return 'petals';
        if (fy > 0.45 && rr > 0.2) return 'dish';
        return 'core';
      },
    };
  }

  // Phoenix Mars Lander fallback & default
  return {
    nssdcLabel: 'NSSDC 2007-034A · Phoenix Mars Lander',
    craftShortName: 'Phoenix',
    parts: {
      solar: {
        id: 'solar',
        name: 'Twin circular solar arrays',
        text: 'Two round solar wings spread out in Mars’s chilly Arctic plain to gather 24-hour polar summer sunlight for Phoenix’s digging arm and tiny ovens.',
        why: 'Why it’s cool: Phoenix landed closer to Mars’s north pole than any lander before it!',
      },
      mast: {
        id: 'mast',
        name: 'Stereo camera & laser weather mast',
        text: 'A tall tower with stereo cameras and a green laser beam that pointed straight up into the sky—discovering real snow falling from Martian clouds!',
        why: 'Why it’s cool: Phoenix actually watched snow fall on Mars.',
      },
      legs: {
        id: 'legs',
        name: 'Three-legged polar landing gear',
        text: 'Three sturdy legs that kept Phoenix balanced above frozen northern ground where water ice hides just centimeters beneath the dirt.',
        why: 'Why it’s cool: its rocket exhaust blew dirt away and revealed shiny white water ice right under the lander!',
      },
      deck: {
        id: 'deck',
        name: 'Miniature ice-testing lab deck',
        text: 'A cozy insulated platform carrying tiny high-heat ovens and wet-chemistry beakers that melted Martian ice and confirmed it was real water ice.',
        why: 'Why it’s cool: Phoenix literally tasted and sniffed Martian ice for the first time in history.',
      },
    },
    classify: (_st, pt, L) => {
      const fy = (pt.y - L.minY) / L.H;
      const rr = Math.hypot(pt.x - L.cx, pt.z - L.cz) / L.R;
      if (fy > 0.65) return 'mast';
      if (rr > 0.52 && fy > 0.32) return 'solar';
      if (fy < 0.32) return 'legs';
      return 'deck';
    },
  };
}
