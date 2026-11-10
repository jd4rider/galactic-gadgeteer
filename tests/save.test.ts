import { describe, expect, it } from 'vitest'
import {
  defaultSave,
  formatTime,
  loadSave,
  recordLevel,
  sanitizeSave,
  totalStars,
  updateSettings,
  writeSave,
  type StorageLike,
} from '../src/core/save'
import { DEFAULT_BINDINGS } from '../src/input/actions'

function memoryStore(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

describe('save data', () => {
  it('fills safe defaults from corrupt input', () => {
    const save = sanitizeSave({ settings: 'nope', levels: 42, shards: -5 })
    expect(save.version).toBe(1)
    expect(save.shards).toBe(0)
    expect(save.settings.bindings.jump).toEqual(DEFAULT_BINDINGS.jump)
  })

  it('keeps keyboard bindings that were remapped and clamped settings', () => {
    const save = sanitizeSave({
      settings: {
        masterVolume: 9,
        bindings: { jump: ['KeyZ', 'KeyZ'], fire: ['MouseLeft'] },
      },
    })
    expect(save.settings.masterVolume).toBe(1)
    expect(save.settings.bindings.jump).toEqual(['KeyZ'])
    expect(save.settings.bindings.fire).toEqual(['MouseLeft'])
  })

  it('records the best stars, shortest time and a union of capsules', () => {
    const first = recordLevel(defaultSave(), 'w1-1', {
      stars: 2,
      timeMs: 90_000,
      shards: 21,
      capsules: ['a'],
    })
    const second = recordLevel(first, 'w1-1', {
      stars: 1,
      timeMs: 120_000,
      shards: 18,
      capsules: ['b'],
    })
    expect(second.levels['w1-1'].stars).toBe(2)
    expect(second.levels['w1-1'].bestMs).toBe(90_000)
    expect(second.levels['w1-1'].capsules).toEqual(['a', 'b'])
    expect(totalStars(second)).toBe(2)
  })

  it('round-trips through storage', () => {
    const store = memoryStore()
    const save = updateSettings(defaultSave(), { masterVolume: 0.3, screenShake: false })
    writeSave(save, store)
    const restored = loadSave(store)
    expect(restored.settings.masterVolume).toBe(0.3)
    expect(restored.settings.screenShake).toBe(false)
  })

  it('formats level times', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65_000)).toBe('1:05')
    expect(formatTime(600_000)).toBe('10:00')
  })
})
