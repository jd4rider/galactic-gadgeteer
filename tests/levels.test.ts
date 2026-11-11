import { describe, expect, it } from 'vitest'
import { LEVEL_ONE } from '../src/data/levelOne'
import {
  ALL_LEVELS,
  LEVELS_PER_WORLD,
  TOTAL_LEVELS,
  WORLDS,
  firstIncompleteInWorld,
  firstIncompleteLevel,
  getLevelData,
  levelsInWorld,
  nextLevel,
} from '../src/data/levels'
import { defaultSave, recordLevel } from '../src/core/save'

describe('expedition catalogue', () => {
  it('ships ten worlds with fifteen expeditions each', () => {
    expect(WORLDS).toHaveLength(10)
    expect(LEVELS_PER_WORLD).toBe(15)
    expect(TOTAL_LEVELS).toBe(150)
    expect(ALL_LEVELS).toHaveLength(150)
    expect(new Set(ALL_LEVELS.map((level) => level.id)).size).toBe(150)
    for (const world of WORLDS) {
      expect(levelsInWorld(world.number)).toHaveLength(15)
    }
  })

  it('keeps the original Starlight Meadows expedition intact', () => {
    expect(getLevelData('w1-1')).toBe(LEVEL_ONE)
    expect(LEVEL_ONE.worldNumber).toBe(1)
    expect(LEVEL_ONE.levelNumber).toBe(1)
    expect(LEVEL_ONE.checkpoints).toHaveLength(2)
  })

  it('generates complete, deterministic layouts for every expedition', () => {
    for (const reference of ALL_LEVELS) {
      const level = getLevelData(reference.id)
      expect(level, reference.id).not.toBeNull()
      expect(level?.id).toBe(reference.id)
      expect(level?.worldNumber).toBe(reference.worldNumber)
      expect(level?.levelNumber).toBe(reference.levelNumber)
      expect(level?.platforms.length).toBeGreaterThan(10)
      expect(level?.shards).toHaveLength(36)
      expect(level?.capsules).toHaveLength(2)
      expect(level?.checkpoints).toHaveLength(2)
      expect(level?.pickups.map((pickup) => pickup.gadget)).toEqual(
        expect.arrayContaining(['jetpack', 'magnet', 'spring', 'phase']),
      )
      expect(level?.goal.x).toBeGreaterThan((level?.width ?? 0) * 0.75)
      expect(level?.goal.x).toBeLessThan(level?.width ?? 0)
      expect(level?.gate.height).toBeGreaterThan(100)
      expect(level?.barrier.height).toBeGreaterThan(100)
      expect(getLevelData(reference.id)).toBe(level)
    }
  })

  it('keeps every generated ground gap inside a normal jump', () => {
    for (const reference of ALL_LEVELS.slice(1)) {
      const level = getLevelData(reference.id)
      if (!level) throw new Error(`${reference.id} missing`)
      const ground = level.platforms
        .filter((platform) => platform.y === 760 && platform.h === 160 && !platform.oneWay)
        .sort((a, b) => a.x - b.x)
      expect(ground.length, reference.id).toBeGreaterThan(5)
      for (let i = 1; i < ground.length; i += 1) {
        const gap = ground[i].x - (ground[i - 1].x + ground[i - 1].w)
        expect(gap, `${reference.id} gap ${i}`).toBeLessThanOrEqual(190)
      }
    }
  })

  it('moves from one expedition to the next and stops at the finale', () => {
    expect(nextLevel('w1-1')?.id).toBe('w1-2')
    expect(nextLevel('w1-15')?.id).toBe('w2-1')
    expect(nextLevel('w10-15')).toBeNull()

    const save = recordLevel(defaultSave(), 'w1-1', {
      stars: 3,
      timeMs: 90_000,
      shards: 36,
      capsules: [],
    })
    expect(firstIncompleteLevel(save).id).toBe('w1-2')
    expect(firstIncompleteInWorld(2, save).id).toBe('w2-1')
  })
})
