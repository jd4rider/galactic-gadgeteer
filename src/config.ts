export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const WORLD_WIDTH = 6400
export const WORLD_HEIGHT = 1100

export const STORAGE_KEY = 'galactic-gadgeteer-save-v1'
export const GAME_ID = 'galactic-gadgeteer'
export const VERSION = '0.1.3'

export const PALETTE = {
  ink: 0x071326,
  deep: 0x0d2440,
  navy: 0x132b52,
  teal: 0x2ec4b6,
  tealLight: 0x7ef5e5,
  cream: 0xfff3d1,
  gold: 0xffc857,
  orange: 0xff9f1c,
  coral: 0xff6b6b,
  pink: 0xff5db1,
  violet: 0x7b61ff,
  grass: 0x74d680,
  grassDark: 0x2f8f6b,
  steel: 0x7c93ad,
  white: 0xffffff,
  danger: 0xff4f6d,
} as const

export const CSS = {
  ink: '#071326',
  deep: '#0d2440',
  teal: '#2ec4b6',
  tealLight: '#7ef5e5',
  cream: '#fff3d1',
  gold: '#ffc857',
  orange: '#ff9f1c',
  coral: '#ff6b6b',
  pink: '#ff5db1',
  violet: '#b9a9ff',
  muted: '#8ba3bd',
  white: '#ffffff',
  danger: '#ff4f6d',
} as const

export const FONT = '"Trebuchet MS", "Avenir Next", "Segoe UI", system-ui, sans-serif'
export const DISPLAY_FONT = '"Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'

export const TUNING = {
  gravity: 1900,
  runSpeed: 330,
  runAcceleration: 2600,
  airAcceleration: 1750,
  groundDrag: 2400,
  airDrag: 680,
  jumpVelocity: -655,
  jumpCutVelocity: -250,
  coyoteMs: 100,
  jumpBufferMs: 120,
  apexGravity: -520,
  apexWindow: 150,
  maxFallSpeed: 920,
  wallSlideSpeed: 155,
  wallJumpX: 380,
  wallJumpY: -610,
  jetpackThrust: -1450,
  jetpackMaxRise: 270,
  jetpackDrain: 30,
  jetpackRefill: 38,
  dashSpeed: 690,
  dashMs: 155,
  dashCooldownMs: 720,
  springChargeMs: 720,
  springJump: -1010,
  magnetRange: 270,
  fireCooldownMs: 190,
  projectileSpeed: 860,
  invulnerableMs: 1250,
} as const
