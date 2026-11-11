import type { PlatformKind } from '../art/Textures'
import type { SaveData } from '../core/save'
import {
  LEVEL_ONE,
  type EnemyDef,
  type HintDef,
  type LevelData,
  type PickupDef,
  type PlatformDef,
  type ShardDef,
} from './levelOne'

export const LEVELS_PER_WORLD = 15
export const TOTAL_LEVELS = LEVELS_PER_WORLD * 10
export const TOTAL_CAPSULES = TOTAL_LEVELS * 2

export interface WorldDefinition {
  number: number
  name: string
  subtitle: string
  tint: number
  platform: PlatformKind
  levelNames: string[]
}

export interface LevelRef {
  id: string
  worldNumber: number
  levelNumber: number
  world: string
  name: string
  subtitle: string
}

interface WorldSeed extends Omit<WorldDefinition, 'number'> {}

const WORLD_SEEDS: WorldSeed[] = [
  {
    name: 'Starlight Meadows',
    subtitle: 'Where the first beacon fell.',
    tint: 0xc9ffe0,
    platform: 'grass',
    levelNames: [
      'The Fallen Beacon',
      'Dewline Run',
      'The Swaying Span',
      'Briarwick Hollow',
      'The Glass Orchard',
      'Firefly Steps',
      'Mossgate Ruins',
      'The Long Canopy',
      'Sunken Garden',
      'Thornlight Path',
      'The Listening Stones',
      'High Meadow Relay',
      'Amberfall Crossing',
      'The Silent Greenhouse',
      "Beacon's Echo",
    ],
  },
  {
    name: 'Amber Foundry',
    subtitle: 'The old machines still breathe.',
    tint: 0xffb26b,
    platform: 'metal',
    levelNames: [
      'Cinder Gate',
      'The Slagworks',
      'Molten Relay',
      'Brassroot Tunnels',
      'The Bellows',
      'Foundry Nine',
      'Emberline',
      'The Anvil Garden',
      'Copperfall',
      'Smokestack Ascent',
      'The Quenching Sea',
      'Rivet Row',
      'The Last Furnace',
      'Golden Slag',
      'Foundry Dawn',
    ],
  },
  {
    name: 'Glass Tides',
    subtitle: 'Every wave remembers the sky.',
    tint: 0x8fe8ff,
    platform: 'stone',
    levelNames: [
      'Shoal of Stars',
      'The Mirror Reef',
      'Saltlight Bay',
      'The Drowned Observatory',
      'Tideglass',
      'The Kelp Cathedral',
      'Undertow Gate',
      'Lantern Current',
      'The Hollow Tide',
      'Coral Circuit',
      'Driftglass',
      'The Sleeping Leviathan',
      'Brinefall',
      'The Far Shore',
      "Tide's End",
    ],
  },
  {
    name: 'Verdant Circuit',
    subtitle: 'A garden wired into the engine.',
    tint: 0x9dffb0,
    platform: 'mushroom',
    levelNames: [
      'Rootwire',
      'The Overgrown Array',
      'Sporelight',
      'The Green Machine',
      'Canopy Current',
      'Moss Capacitor',
      'The Pollen Vault',
      'Vineyard Seven',
      'The Breathing Grid',
      'Seedbank Zero',
      'Bloomfall',
      'The Great Mycelium',
      'Chlorophyll Run',
      'The Last Orchard',
      'Greenwake',
    ],
  },
  {
    name: 'Frostline Archive',
    subtitle: 'The cold kept every record.',
    tint: 0xcfeaff,
    platform: 'stone',
    levelNames: [
      'First Snow',
      'The Frozen Index',
      'Icicle Relay',
      'Cold Storage',
      'The White Library',
      'Glacier Stack',
      'Hailstone Gallery',
      'The Long Winter',
      'Permafrost Vault',
      'Snowblind Spire',
      'The Quiet Shelf',
      'Frostbyte',
      'The Icebound Codex',
      'Rimefall',
      'Archive Zero',
    ],
  },
  {
    name: 'Emberfall Ridge',
    subtitle: 'The mountain is still awake.',
    tint: 0xff9a70,
    platform: 'stone',
    levelNames: [
      'Ashpath',
      'The Broken Caldera',
      'Cinder Scramble',
      'The Smoke Stair',
      'Firebreak',
      'Obsidian Run',
      'The Ember Gate',
      'Blackglass',
      'Magma Choir',
      'The Cinder Crown',
      'Heat Shimmer',
      'Basalt Steps',
      'The Last Ember',
      'Ashfall',
      'Ridge of Dawn',
    ],
  },
  {
    name: 'Mirrorhold',
    subtitle: 'The fortress reflects itself.',
    tint: 0xd9ccff,
    platform: 'metal',
    levelNames: [
      'The Silver Gate',
      'Reflection Run',
      'The Hall of Echoes',
      'Prism Break',
      'Glasshouse Seven',
      'The Möbius Stair',
      'Mirrorfall',
      'The Shattered Court',
      'Lightwell',
      'The Reversed Garden',
      'Spectrum Vault',
      'The Quiet Reflection',
      'Silversong',
      'Behind the Glass',
      'Mirrorhold',
    ],
  },
  {
    name: 'Neon Undercity',
    subtitle: 'The lights never went out.',
    tint: 0xff8fd8,
    platform: 'metal',
    levelNames: [
      'Nightwire',
      'The Electric Market',
      'Signal Alley',
      'The Glowline',
      'Chrome Rain',
      'The Data Bazaar',
      'Neon Choir',
      'Circuit Breaker',
      'The Hologram Steps',
      'Voltedge',
      'The Last Advert',
      'Gridlock',
      'Static Garden',
      'Afterimage',
      'City of Lights',
    ],
  },
  {
    name: 'Starfall Reach',
    subtitle: 'Beyond the last safe orbit.',
    tint: 0xaab8ff,
    platform: 'stone',
    levelNames: [
      'The Comet Road',
      'Zero Gravity Garden',
      'Meteor Walk',
      'The Falling Sky',
      'Starlight Shoal',
      'Orbitbreak',
      'The Vacuum Choir',
      'Constellation Run',
      'The Dark Between',
      'Solar Wind',
      'The Long Fall',
      'Event Horizon',
      'Astral Steps',
      'The Last Star',
      'Starfall',
    ],
  },
  {
    name: 'The Starlight Engine',
    subtitle: 'Every lost world returns here.',
    tint: 0xffd37a,
    platform: 'metal',
    levelNames: [
      'The First Gate',
      'Heart of the Engine',
      'The Memory Core',
      'Clockwork Sun',
      'The Final Relay',
      'All the Lost Worlds',
      'The Singing Machine',
      'The Last Fragment',
      'Enginefall',
      'The Quiet Before',
      'The Door of Worlds',
      'Starlight Unbound',
      'The Homecoming',
      'The Final Beacon',
      'A New Sky',
    ],
  },
]

export const WORLDS: WorldDefinition[] = WORLD_SEEDS.map((world, index) => ({
  ...world,
  number: index + 1,
}))

export const ALL_LEVELS: LevelRef[] = WORLDS.flatMap((world) =>
  world.levelNames.map((name, index) => ({
    id: `w${world.number}-${index + 1}`,
    worldNumber: world.number,
    levelNumber: index + 1,
    world: world.name.toUpperCase(),
    name,
    subtitle: world.subtitle,
  })),
)

const REFS_BY_ID = new Map(ALL_LEVELS.map((level) => [level.id, level]))
const GENERATED = new Map<string, LevelData>()

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function between(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

function buildGeneratedLevel(ref: LevelRef): LevelData {
  const world = WORLDS[ref.worldNumber - 1]
  const random = seededRandom(hashString(ref.id))
  const groundY = 760
  const sectionCount = 8 + Math.floor((ref.levelNumber - 1) / 3)
  const gapBase = 130 + ref.worldNumber * 2 + Math.floor(ref.levelNumber / 2)
  const sections: Array<{ x: number; w: number }> = []

  let cursorX = 0
  for (let i = 0; i < sectionCount; i += 1) {
    const width = between(random, 520, 650)
    sections.push({ x: cursorX, w: width })
    cursorX += width
    if (i < sectionCount - 1) cursorX += between(random, gapBase, gapBase + 30)
  }

  const endX = sections[sections.length - 1].x + sections[sections.length - 1].w
  const width = endX + 180
  const platforms: PlatformDef[] = sections.map((section) => ({
    x: section.x,
    y: groundY,
    w: section.w,
    h: 160,
    kind: world.platform,
  }))

  // Optional upper routes keep the levels readable while varying their shape.
  for (let i = 1; i < sections.length - 1; i += 1) {
    if (random() < 0.24) continue
    const section = sections[i]
    const platformWidth = between(random, 110, 180)
    platforms.push({
      x: section.x + between(random, 35, Math.max(36, section.w - platformWidth - 35)),
      y: between(random, 585, 650),
      w: platformWidth,
      h: 22,
      oneWay: true,
      kind: world.platform,
    })
  }

  // Some chasms get a small stepping stone, giving players a safer route.
  for (let i = 0; i < sections.length - 1; i += 1) {
    const gapStart = sections[i].x + sections[i].w
    const gapEnd = sections[i + 1].x
    if (gapEnd - gapStart > 160 && random() > 0.45) {
      const stoneWidth = 64
      platforms.push({
        x: gapStart + Math.floor((gapEnd - gapStart - stoneWidth) / 2),
        y: 724,
        w: stoneWidth,
        h: 18,
        oneWay: true,
        kind: 'stone',
      })
    }
  }

  if (ref.levelNumber % 5 === 0) {
    const section = sections[4]
    platforms.push({
      x: section.x + Math.floor(section.w * 0.35),
      y: 560,
      w: 90,
      h: 20,
      kind: 'metal',
      moving: { toY: 440, duration: 2400 },
    })
  }

  const capSection = sections[5]
  const capY = 520
  const capWidth = 150
  const capX = capSection.x + capSection.w - capWidth - 40
  platforms.push({ x: capX, y: capY, w: capWidth, h: 20, oneWay: true, kind: 'metal' })
  platforms.push({
    x: capX - 90,
    y: 645,
    w: 82,
    h: 18,
    oneWay: true,
    kind: 'stone',
  })

  const gateSection = sections[3]
  const gateX = gateSection.x + gateSection.w - 110
  const gate = { x: gateX, y: 500, height: 260 }
  const crate = { x: gateX - 250, y: 700 }
  const plate = { x: gateX - 115, y: 748 }

  const barrierSection = sections[Math.min(6, sections.length - 2)]
  const barrierX = barrierSection.x + Math.floor(barrierSection.w * 0.55)
  const barrier = { x: barrierX, y: 540, height: 220 }

  const wallSection = sections[1]
  const wallX = wallSection.x + Math.floor(wallSection.w * 0.55)
  const wall = { x: wallX, y: 700, w: 44, h: 60 }

  const pickups: PickupDef[] = [
    { gadget: 'jetpack', x: sections[1].x + Math.floor(sections[1].w * 0.45), y: 686 },
    { gadget: 'magnet', x: sections[2].x + Math.floor(sections[2].w * 0.55), y: 686 },
    { gadget: 'spring', x: sections[4].x + Math.floor(sections[4].w * 0.45), y: 686 },
    { gadget: 'phase', x: capSection.x + Math.floor(capSection.w * 0.3), y: 686 },
  ]

  const shards: ShardDef[] = []
  for (const section of sections) {
    for (const offset of [0.28, 0.5, 0.72]) {
      shards.push({ x: section.x + Math.floor(section.w * offset), y: 686 })
    }
  }
  const upperPlatforms = platforms.filter(
    (platform) => platform.oneWay && platform.y >= 510 && platform.y <= 660,
  )
  for (const platform of upperPlatforms) {
    shards.push({ x: platform.x + Math.floor(platform.w * 0.3), y: platform.y - 40 })
    shards.push({ x: platform.x + Math.floor(platform.w * 0.7), y: platform.y - 40 })
    if (shards.length >= 36) break
  }
  let fill = 0
  while (shards.length < 36) {
    const section = sections[fill % sections.length]
    shards.push({
      x: section.x + Math.floor(section.w * 0.4) + Math.floor(fill / sections.length) * 22,
      y: 620 - (fill % 3) * 18,
    })
    fill += 1
  }
  shards.length = 36
  shards.sort((a, b) => a.x - b.x)

  const enemyCount = Math.min(18, 5 + Math.floor(ref.levelNumber / 2) + Math.floor(ref.worldNumber / 2))
  const enemies: EnemyDef[] = []
  for (let i = 0; i < enemyCount; i += 1) {
    const section = sections[1 + (i % (sections.length - 1))]
    const type: EnemyDef['type'] = random() < 0.56 ? 'mite' : random() < 0.78 ? 'drone' : 'turret'
    let x = section.x + between(random, 60, Math.max(61, section.w - 60))
    if (Math.abs(x - gateX) < 110) x = Math.max(section.x + 50, x - 150)
    if (Math.abs(x - barrierX) < 110) x = Math.min(section.x + section.w - 50, x + 150)
    const y = type === 'drone' ? between(random, 545, 625) : type === 'turret' ? 714 : 724
    enemies.push({
      type,
      x,
      y,
      patrol: type === 'turret' ? undefined : between(random, 100, 190),
    })
  }

  const spikeCount = 1 + Math.min(2, Math.floor((ref.worldNumber + ref.levelNumber) / 10))
  const spikes: Array<{ x: number; y: number; w: number }> = []
  for (let i = 0; i < spikeCount; i += 1) {
    const section = sections[Math.min(2 + i * 2, sections.length - 1)]
    spikes.push({
      x: section.x + Math.floor(section.w * 0.72),
      y: 742,
      w: between(random, 60, 92),
    })
  }

  const hints: HintDef[] = [
    { x: 120, text: `BOLT: ${ref.subtitle} The fragment is somewhere ahead.` },
    {
      x: pickups[0].x - 150,
      text: 'BOLT: Jetpack ahead — select 2, then hold K in the air to fly.',
    },
    {
      x: gateX - 390,
      text: 'BOLT: The gate needs weight. Use the magnet glove — select 4 and hold K to pull the crate onto the plate.',
    },
    {
      x: barrierX - 340,
      text: 'BOLT: That pink wall is phase-thin. Select 5, then press Shift to dash through.',
    },
    { x: width - 720, text: 'BOLT: There it is. Bring the fragment home.' },
  ].sort((a, b) => a.x - b.x)

  const checkpoints = [
    { id: `${ref.id}-relay-1`, name: 'Signal Relay', x: sections[2].x + 55, y: groundY },
    {
      id: `${ref.id}-relay-2`,
      name: 'Far Relay',
      x: barrierSection.x + 45,
      y: groundY,
    },
  ]

  const capsules = [
    {
      id: `${ref.id}-capsule-a`,
      x: wallX + 106,
      y: 686,
      title: 'FIELD NOTE 01',
      text: `The ${world.name} fragment is still warm. BOLT says the engine left a little of itself in every world it touched.`,
    },
    {
      id: `${ref.id}-capsule-b`,
      x: capX + Math.floor(capWidth / 2),
      y: capY - 40,
      title: 'FIELD NOTE 02',
      text: `A maintenance stamp from the old engineers: “If you can read this, the beacon survived. Keep going.”`,
    },
  ]

  return {
    id: ref.id,
    worldNumber: ref.worldNumber,
    levelNumber: ref.levelNumber,
    world: ref.world.toUpperCase(),
    name: ref.name,
    subtitle: ref.subtitle,
    width,
    height: 1100,
    spawn: { x: 120, y: 690 },
    platforms,
    shards,
    capsules,
    enemies,
    pickups,
    checkpoints,
    spikes,
    hints,
    crate,
    plate,
    gate,
    barrier,
    wall,
    goal: { x: endX - 90, y: groundY },
  }
}

export function getLevelRef(id: string): LevelRef | undefined {
  return REFS_BY_ID.get(id)
}

export function levelsInWorld(worldNumber: number): LevelRef[] {
  return ALL_LEVELS.filter((level) => level.worldNumber === worldNumber)
}

export function nextLevel(id: string): LevelRef | null {
  const index = ALL_LEVELS.findIndex((level) => level.id === id)
  return index >= 0 ? (ALL_LEVELS[index + 1] ?? null) : null
}

export function firstIncompleteLevel(save: SaveData): LevelRef {
  return ALL_LEVELS.find((level) => !save.levels[level.id]?.completed) ?? ALL_LEVELS[0]
}

export function firstIncompleteInWorld(worldNumber: number, save: SaveData): LevelRef {
  const levels = levelsInWorld(worldNumber)
  return levels.find((level) => !save.levels[level.id]?.completed) ?? levels[0]
}

export function getLevelData(id: string | undefined): LevelData | null {
  if (!id) return null
  if (id === LEVEL_ONE.id) return LEVEL_ONE
  const ref = REFS_BY_ID.get(id)
  if (!ref) return null
  const cached = GENERATED.get(id)
  if (cached) return cached
  const level = buildGeneratedLevel(ref)
  GENERATED.set(id, level)
  return level
}
