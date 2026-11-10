import { describe, expect, it } from 'vitest'
import { TUNING } from '../src/config'
import {
  apexGravityOffset,
  applyJumpCut,
  clampFall,
  evaluateJump,
  starsFor,
  type JumpState,
} from '../src/player/movement'

const base: JumpState = {
  grounded: true,
  coyoteTimerMs: 0,
  jumpBufferMs: 0,
  jumpHeld: true,
  velocityY: 0,
  wallDir: 0,
}

describe('movement timing', () => {
  it('jumps from the ground when the buffer is alive', () => {
    const result = evaluateJump({ ...base, jumpBufferMs: 120 })
    expect(result.kind).toBe('ground')
    if (result.kind === 'ground') {
      expect(result.velocityY).toBe(TUNING.jumpVelocity)
      expect(result.jumpBufferMs).toBe(0)
    }
  })

  it('honours coyote time after walking off a ledge', () => {
    const result = evaluateJump({ ...base, grounded: false, coyoteTimerMs: 80, jumpBufferMs: 50 })
    expect(result.kind).toBe('ground')
  })

  it('does not jump once coyote time and the buffer have both expired', () => {
    const result = evaluateJump({ ...base, grounded: false, coyoteTimerMs: 0, jumpBufferMs: 0 })
    expect(result.kind).toBe('none')
  })

  it('performs a wall jump away from the touched wall', () => {
    const result = evaluateJump({
      ...base,
      grounded: false,
      coyoteTimerMs: 0,
      jumpBufferMs: 90,
      wallDir: -1,
    })
    expect(result.kind).toBe('wall')
    if (result.kind === 'wall') {
      expect(result.velocityX).toBe(TUNING.wallJumpX)
      expect(result.velocityY).toBe(TUNING.wallJumpY)
    }
  })

  it('cuts a jump when the button is released', () => {
    expect(applyJumpCut(-800, false)).toBe(TUNING.jumpCutVelocity)
    expect(applyJumpCut(-400, true)).toBe(-400)
  })

  it('softens gravity near the apex only while jump is held', () => {
    expect(apexGravityOffset(20, true)).toBe(TUNING.apexGravity)
    expect(apexGravityOffset(20, false)).toBe(0)
    expect(apexGravityOffset(400, true)).toBe(0)
  })

  it('caps terminal fall speed', () => {
    expect(clampFall(2000)).toBe(TUNING.maxFallSpeed)
  })
})

describe('star scoring', () => {
  it('awards one star for finishing', () => {
    expect(starsFor(0, 0, 30)).toBe(1)
  })

  it('awards two stars for most of the shards', () => {
    expect(starsFor(18, 0, 30)).toBe(2)
  })

  it('awards three stars only for every shard and a capsule', () => {
    expect(starsFor(30, 1, 30)).toBe(3)
    expect(starsFor(30, 0, 30)).toBe(2)
  })
})
