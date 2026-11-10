import { TUNING } from '../config'

export interface JumpState {
  grounded: boolean
  coyoteTimerMs: number
  jumpBufferMs: number
  jumpHeld: boolean
  velocityY: number
  wallDir: -1 | 0 | 1
}

export type JumpResult =
  | { kind: 'ground'; velocityX: number; velocityY: number; coyoteTimerMs: number; jumpBufferMs: number }
  | { kind: 'wall'; velocityX: number; velocityY: number; coyoteTimerMs: number; jumpBufferMs: number }
  | { kind: 'none'; coyoteTimerMs: number; jumpBufferMs: number }

/**
 * Pure jump decision so the timing rules can be tested without Phaser.
 * Ground jumps win over wall jumps; buffered input survives a short gap.
 */
export function evaluateJump(state: JumpState): JumpResult {
  const canGroundJump = state.grounded || state.coyoteTimerMs > 0
  if (state.jumpBufferMs > 0 && canGroundJump) {
    return {
      kind: 'ground',
      velocityX: 0,
      velocityY: TUNING.jumpVelocity,
      coyoteTimerMs: 0,
      jumpBufferMs: 0,
    }
  }
  if (state.jumpBufferMs > 0 && !state.grounded && state.wallDir !== 0) {
    return {
      kind: 'wall',
      velocityX: -state.wallDir * TUNING.wallJumpX,
      velocityY: TUNING.wallJumpY,
      coyoteTimerMs: 0,
      jumpBufferMs: 0,
    }
  }
  return {
    kind: 'none',
    coyoteTimerMs: Math.max(0, state.coyoteTimerMs),
    jumpBufferMs: Math.max(0, state.jumpBufferMs),
  }
}

export function applyJumpCut(velocityY: number, jumpHeld: boolean): number {
  if (!jumpHeld && velocityY < TUNING.jumpCutVelocity) return TUNING.jumpCutVelocity
  return velocityY
}

export function apexGravityOffset(velocityY: number, jumpHeld: boolean): number {
  if (!jumpHeld) return 0
  if (Math.abs(velocityY) < TUNING.apexWindow) return TUNING.apexGravity
  return 0
}

export function clampFall(velocityY: number): number {
  return Math.min(velocityY, TUNING.maxFallSpeed)
}

export function starsFor(shards: number, capsules: number, totalShards: number): number {
  if (shards >= totalShards && capsules >= 1) return 3
  if (shards >= Math.ceil(totalShards * 0.6)) return 2
  return 1
}
