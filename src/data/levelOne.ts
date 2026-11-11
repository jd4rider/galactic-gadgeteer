import type { Gadget } from '../player/Player'
import type { PlatformKind } from '../art/Textures'

export interface PlatformDef {
  x: number
  y: number
  w: number
  h: number
  kind?: PlatformKind
  oneWay?: boolean
  moving?: { toY: number; duration: number }
  falling?: boolean
}

export interface EnemyDef {
  type: 'mite' | 'drone' | 'turret'
  x: number
  y: number
  patrol?: number
}

export interface ShardDef {
  x: number
  y: number
}

export interface PickupDef {
  gadget: Gadget
  x: number
  y: number
}

export interface HintDef {
  x: number
  text: string
}

export interface CheckpointDef {
  id: string
  name: string
  x: number
  y: number
}

export interface LevelData {
  id: string
  worldNumber: number
  levelNumber: number
  world: string
  name: string
  subtitle: string
  width: number
  height: number
  spawn: { x: number; y: number }
  platforms: PlatformDef[]
  shards: ShardDef[]
  capsules: Array<{ id: string; x: number; y: number; title: string; text: string }>
  enemies: EnemyDef[]
  pickups: PickupDef[]
  checkpoints: CheckpointDef[]
  spikes: Array<{ x: number; y: number; w: number }>
  hints: HintDef[]
  crate: { x: number; y: number }
  plate: { x: number; y: number }
  gate: { x: number; y: number; height: number }
  barrier: { x: number; y: number; height: number }
  wall: { x: number; y: number; w: number; h: number }
  goal: { x: number; y: number }
}

const shardRows: ShardDef[] = [
  { x: 270, y: 688 },
  { x: 340, y: 655 },
  { x: 410, y: 628 },
  { x: 480, y: 655 },
  { x: 550, y: 688 },
  { x: 900, y: 686 },
  { x: 950, y: 640 },
  { x: 1000, y: 610 },
  { x: 1050, y: 640 },
  { x: 1120, y: 686 },
  { x: 330, y: 500 },
  { x: 390, y: 470 },
  { x: 450, y: 500 },
  { x: 1280, y: 640 },
  { x: 1340, y: 600 },
  { x: 1510, y: 625 },
  { x: 1580, y: 610 },
  { x: 1730, y: 688 },
  { x: 1810, y: 650 },
  { x: 1880, y: 620 },
  { x: 2560, y: 570 },
  { x: 2790, y: 485 },
  { x: 3000, y: 400 },
  { x: 3180, y: 490 },
  { x: 3440, y: 688 },
  { x: 3650, y: 650 },
  { x: 3980, y: 688 },
  { x: 4140, y: 640 },
  { x: 4420, y: 688 },
  { x: 4910, y: 450 },
  { x: 5100, y: 410 },
  { x: 5310, y: 450 },
  { x: 5740, y: 688 },
  { x: 5860, y: 640 },
  { x: 5980, y: 610 },
  { x: 6070, y: 660 },
]

export const LEVEL_ONE: LevelData = {
  id: 'w1-1',
  worldNumber: 1,
  levelNumber: 1,
  world: 'STARLIGHT MEADOWS',
  name: 'The Fallen Beacon',
  subtitle: 'A Starlight Engine fragment is singing in the old meadow.',
  width: 6400,
  height: 1100,
  spawn: { x: 150, y: 690 },
  platforms: [
    { x: 0, y: 760, w: 620, h: 160 },
    { x: 760, y: 760, w: 700, h: 160 },
    { x: 1640, y: 760, w: 760, h: 160 },
    { x: 1500, y: 690, w: 92, h: 20, oneWay: true, kind: 'mushroom' },
    { x: 3350, y: 760, w: 550, h: 160 },
    { x: 3920, y: 760, w: 800, h: 160 },
    { x: 4820, y: 520, w: 660, h: 80, kind: 'grass' },
    { x: 5600, y: 760, w: 800, h: 160 },
    { x: 2500, y: 640, w: 150, h: 26, oneWay: true },
    { x: 2720, y: 550, w: 140, h: 26, oneWay: true },
    { x: 2940, y: 470, w: 150, h: 26, oneWay: true },
    { x: 3160, y: 560, w: 140, h: 26, oneWay: true },
    { x: 3310, y: 660, w: 110, h: 24, oneWay: true },
    { x: 300, y: 560, w: 180, h: 20, oneWay: true },
    { x: 1160, y: 700, w: 120, h: 24, oneWay: true, kind: 'mushroom' },
    { x: 3800, y: 690, w: 150, h: 22, oneWay: true, kind: 'stone' },
    { x: 4180, y: 680, w: 170, h: 22, oneWay: true, kind: 'stone' },
    { x: 4490, y: 620, w: 160, h: 22, oneWay: true, kind: 'stone' },
    { x: 5450, y: 400, w: 170, h: 22, oneWay: true },
    { x: 5700, y: 640, w: 160, h: 22, oneWay: true, kind: 'mushroom' },
    { x: 5910, y: 575, w: 150, h: 22, oneWay: true },
    { x: 6100, y: 650, w: 90, h: 22, oneWay: true, kind: 'stone' },
    { x: 2040, y: 620, w: 120, h: 24, oneWay: true, kind: 'stone' },
    { x: 2200, y: 550, w: 110, h: 24, oneWay: true, kind: 'stone' },
    { x: 4200, y: 520, w: 90, h: 20, moving: { toY: 400, duration: 2600 }, kind: 'metal' },
  ],
  shards: shardRows,
  capsules: [
    {
      id: 'capsule-meadow',
      x: 1130,
      y: 690,
      title: 'FIELD NOTE 01',
      text: 'The engine does not break. It remembers. Every shard is still trying to find the others.',
    },
    {
      id: 'capsule-canopy',
      x: 3010,
      y: 390,
      title: 'FIELD NOTE 02',
      text: 'BOLT says the old gardeners built the floating stones to follow music. They still hum when Pip jumps.',
    },
  ],
  enemies: [
    { type: 'mite', x: 470, y: 724, patrol: 170 },
    { type: 'mite', x: 1030, y: 724, patrol: 140 },
    { type: 'drone', x: 1560, y: 600, patrol: 120 },
    { type: 'mite', x: 2110, y: 724, patrol: 160 },
    { type: 'drone', x: 2860, y: 500, patrol: 150 },
    { type: 'turret', x: 3720, y: 714 },
    { type: 'mite', x: 4350, y: 724, patrol: 180 },
    { type: 'turret', x: 5080, y: 474 },
    { type: 'drone', x: 5750, y: 560, patrol: 170 },
    { type: 'mite', x: 5900, y: 724, patrol: 140 },
    { type: 'mite', x: 6040, y: 724, patrol: 120 },
  ],
  pickups: [
    { gadget: 'jetpack', x: 2310, y: 680 },
    { gadget: 'magnet', x: 3420, y: 680 },
    { gadget: 'spring', x: 4660, y: 680 },
    { gadget: 'phase', x: 5060, y: 450 },
  ],
  checkpoints: [
    { id: 'meadow-gate', name: 'Meadow Gate', x: 3390, y: 760 },
    { id: 'high-garden', name: 'High Garden', x: 4870, y: 520 },
  ],
  spikes: [
    { x: 2020, y: 742, w: 82 },
    { x: 4210, y: 742, w: 96 },
    { x: 5740, y: 742, w: 100 },
  ],
  hints: [
    { x: 120, text: 'BOLT: This way, Pip. The fragment is somewhere past the old meadow gate.' },
    { x: 1250, text: 'BOLT: Loose bridge stones ahead. Keep your boots dry.' },
    { x: 2200, text: 'BOLT: A jetpack! Select it with 2, then hold K to fly.' },
    { x: 3360, text: 'BOLT: The crate is magnetic. Select the glove with 4 and hold K to pull it onto the plate.' },
    { x: 4590, text: 'BOLT: Spring boots! Select them with 3, hold K to charge, release to launch.' },
    { x: 4970, text: 'BOLT: That pink wall is phase-thin. Select 5, then Shift to dash through.' },
    { x: 6000, text: 'BOLT: There it is. The fragment is still singing.' },
  ],
  crate: { x: 3590, y: 690 },
  plate: { x: 3780, y: 748 },
  gate: { x: 3896, y: 500, height: 260 },
  barrier: { x: 5430, y: 260, height: 260 },
  wall: { x: 1040, y: 700, w: 44, h: 60 },
  goal: { x: 6160, y: 760 },
}
