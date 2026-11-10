import { DEFAULT_BINDINGS, type Bindings } from '../input/actions'
import { STORAGE_KEY } from '../config'

export type Quality = 'low' | 'medium' | 'high'
export type TouchLayout = 'joystick' | 'dpad'

export interface Settings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  muted: boolean
  quality: Quality
  screenShake: boolean
  touchControls: boolean
  touchLayout: TouchLayout
  touchScale: number
  touchOpacity: number
  leftHanded: boolean
  bindings: Bindings
}

export interface LevelRecord {
  completed: boolean
  stars: number
  bestMs: number
  shards: number
  capsules: string[]
}

export interface SaveData {
  version: number
  settings: Settings
  levels: Record<string, LevelRecord>
  shards: number
  capsules: string[]
  achievements: string[]
  checkpoint: string
  lastPlayed: string
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export const SAVE_VERSION = 1

const memory = new Map<string, string>()

function memoryStorage(): StorageLike {
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
    removeItem: (key) => void memory.delete(key),
  }
}

const fallback = memoryStorage()

export function defaultStore(): StorageLike {
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__gg_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return localStorage
    }
  } catch {
    // Private browsing still gets a full session, just not a persisted one.
  }
  return fallback
}

export function defaultSettings(): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.42,
    sfxVolume: 0.8,
    muted: false,
    quality: 'high',
    screenShake: true,
    touchControls: true,
    touchLayout: 'joystick',
    touchScale: 1,
    touchOpacity: 0.72,
    leftHanded: false,
    bindings: structuredClone(DEFAULT_BINDINGS),
  }
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    settings: defaultSettings(),
    levels: {},
    shards: 0,
    capsules: [],
    achievements: [],
    checkpoint: 'start',
    lastPlayed: '',
  }
}

const number = (value: unknown, min: number, max: number, fallbackValue: number): number => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallbackValue
  return Math.min(max, Math.max(min, n))
}

const boolean = (value: unknown, fallbackValue: boolean): boolean =>
  typeof value === 'boolean' ? value : fallbackValue

export function sanitizeSave(raw: unknown): SaveData {
  const clean = defaultSave()
  if (!raw || typeof raw !== 'object') return clean
  const data = raw as Record<string, unknown>

  if (data.settings && typeof data.settings === 'object') {
    const s = data.settings as Record<string, unknown>
    const quality = s.quality
    clean.settings = {
      masterVolume: number(s.masterVolume, 0, 1, 0.8),
      musicVolume: number(s.musicVolume, 0, 1, 0.42),
      sfxVolume: number(s.sfxVolume, 0, 1, 0.8),
      muted: boolean(s.muted, false),
      quality: quality === 'low' || quality === 'medium' || quality === 'high' ? quality : 'high',
      screenShake: boolean(s.screenShake, true),
      touchControls: boolean(s.touchControls, true),
      touchLayout: s.touchLayout === 'dpad' ? 'dpad' : 'joystick',
      touchScale: number(s.touchScale, 0.8, 1.3, 1),
      touchOpacity: number(s.touchOpacity, 0.25, 1, 0.72),
      leftHanded: boolean(s.leftHanded, false),
      bindings: structuredClone(DEFAULT_BINDINGS),
    }
    if (s.bindings && typeof s.bindings === 'object') {
      const source = s.bindings as Record<string, unknown>
      for (const action of Object.keys(DEFAULT_BINDINGS) as (keyof Bindings)[]) {
        const value = source[action]
        if (!Array.isArray(value)) continue
        const codes = [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))]
        if (codes.length > 0) clean.settings.bindings[action] = codes
      }
    }
  }

  if (data.levels && typeof data.levels === 'object') {
    for (const [id, value] of Object.entries(data.levels as Record<string, unknown>)) {
      if (!/^[a-z0-9-]{1,40}$/.test(id) || !value || typeof value !== 'object') continue
      const level = value as Record<string, unknown>
      clean.levels[id] = {
        completed: boolean(level.completed, false),
        stars: Math.round(number(level.stars, 0, 3, 0)),
        bestMs: Math.round(number(level.bestMs, 0, 24 * 60 * 60 * 1000, 0)),
        shards: Math.round(number(level.shards, 0, 999, 0)),
        capsules: Array.isArray(level.capsules)
          ? [...new Set(level.capsules.filter((entry): entry is string => typeof entry === 'string'))]
          : [],
      }
    }
  }

  clean.shards = Math.round(number(data.shards, 0, 999999, 0))
  clean.capsules = Array.isArray(data.capsules)
    ? [...new Set(data.capsules.filter((entry): entry is string => typeof entry === 'string'))]
    : []
  clean.achievements = Array.isArray(data.achievements)
    ? [...new Set(data.achievements.filter((entry): entry is string => typeof entry === 'string'))]
    : []
  clean.checkpoint = typeof data.checkpoint === 'string' ? data.checkpoint.slice(0, 40) : 'start'
  clean.lastPlayed = typeof data.lastPlayed === 'string' ? data.lastPlayed.slice(0, 40) : ''
  return clean
}

export function loadSave(store: StorageLike = defaultStore()): SaveData {
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return defaultSave()
    return sanitizeSave(JSON.parse(raw))
  } catch {
    return defaultSave()
  }
}

export function writeSave(save: SaveData, store: StorageLike = defaultStore()): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(save))
  } catch {
    // A full quota must never interrupt the game.
  }
}

export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, level) => sum + level.stars, 0)
}

export function completedLevels(save: SaveData): number {
  return Object.values(save.levels).filter((level) => level.completed).length
}

export function recordLevel(
  save: SaveData,
  levelId: string,
  result: { stars: number; timeMs: number; shards: number; capsules: string[] },
): SaveData {
  const next = sanitizeSave(save)
  const previous = next.levels[levelId]
  next.levels[levelId] = {
    completed: true,
    stars: Math.max(previous?.stars ?? 0, Math.round(number(result.stars, 0, 3, 0))),
    bestMs:
      previous?.bestMs && previous.bestMs > 0
        ? Math.min(previous.bestMs, Math.round(result.timeMs))
        : Math.round(result.timeMs),
    shards: Math.max(previous?.shards ?? 0, Math.round(result.shards)),
    capsules: [...new Set([...(previous?.capsules ?? []), ...result.capsules])],
  }
  next.shards = Math.max(next.shards, Math.round(result.shards))
  next.capsules = [...new Set([...next.capsules, ...result.capsules])]
  next.lastPlayed = new Date().toISOString()
  writeSave(next)
  return next
}

export function unlockAchievement(save: SaveData, id: string): SaveData {
  if (save.achievements.includes(id)) return save
  const next = sanitizeSave(save)
  next.achievements.push(id)
  writeSave(next)
  return next
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  const next = sanitizeSave(save)
  next.settings = { ...next.settings, ...patch }
  writeSave(next)
  return next
}

export function resetProgress(save: SaveData): SaveData {
  const next = defaultSave()
  next.settings = { ...save.settings }
  writeSave(next)
  return next
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
