import Phaser from 'phaser'
import { TUNING } from '../config'
import type { Aim, InputManager } from '../input/InputManager'
import { audio } from '../audio/AudioEngine'
import { applyJumpCut, apexGravityOffset, clampFall, evaluateJump } from './movement'
import { BoltView, PipView, type PipVisualState } from './PipView'

export type Gadget = 'blaster' | 'jetpack' | 'spring' | 'magnet' | 'phase'

export const GADGET_ORDER: Gadget[] = ['blaster', 'jetpack', 'spring', 'magnet', 'phase']
export const GADGET_NAMES: Record<Gadget, string> = {
  blaster: 'PLASMA BLASTER',
  jetpack: 'JETPACK',
  spring: 'SPRING BOOTS',
  magnet: 'MAGNET GLOVE',
  phase: 'PHASE DASH',
}

export interface PlayerCallbacks {
  onShoot: (aim: Aim, x: number, y: number) => void
  onDust: (x: number, y: number, count: number, kind?: 'dust' | 'leaf') => void
  onLand: (strength: number) => void
  onHurt: (sourceX: number) => void
  onDefeat: () => void
  onDash: (x: number, y: number) => void
  onJetpack: (x: number, y: number) => void
  onSpring: (x: number, y: number) => void
  onGadget: (gadget: Gadget) => void
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly view: PipView
  readonly bolt: BoltView
  readonly unlocked = new Set<Gadget>(['blaster'])
  activeGadget: Gadget = 'blaster'
  health = 3
  maxHealth = 3
  fuel = 100
  facing: -1 | 1 = 1
  dashing = false
  jetpacking = false
  magnetActive = false
  springCharging = false
  celebrating = false
  dead = false
  wallSliding = false
  jumps = 0
  shotsFired = 0
  dashes = 0

  private scene: Phaser.Scene
  private callbacks: PlayerCallbacks
  private coyoteMs = 0
  private jumpBufferMs = 0
  private wasGrounded = false
  private lastVy = 0
  private invulnerableUntil = 0
  private nextShotAt = 0
  private dashUntil = 0
  private nextDashAt = 0
  private lastTrailAt = 0
  private springChargeMs = 0
  private crouching = false
  private aimAngle = 0
  private destroyed = false

  constructor(scene: Phaser.Scene, x: number, y: number, callbacks: PlayerCallbacks) {
    this.scene = scene
    this.callbacks = callbacks
    this.sprite = scene.physics.add.sprite(x, y, 'hitbox').setVisible(false)
    this.sprite.setCollideWorldBounds(false)
    const body = this.body()
    body.setSize(32, 56)
    body.setOffset(4, 3)
    body.setMaxVelocity(TUNING.dashSpeed, TUNING.maxFallSpeed)
    body.setDragX(TUNING.groundDrag)
    body.setDragY(0)
    this.view = new PipView(scene, x, y)
    this.bolt = new BoltView(scene, x + 44, y - 54)
    this.sprite.setData('player', this)
  }

  body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body
  }

  get x(): number {
    return this.sprite.x
  }

  get y(): number {
    return this.sprite.y
  }

  get fuelRatio(): number {
    return this.fuel / 100
  }

  get invulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil
  }

  get springChargeRatio(): number {
    return Math.min(1, this.springChargeMs / TUNING.springChargeMs)
  }

  get grounded(): boolean {
    const body = this.body()
    return body.blocked.down || body.touching.down
  }

  unlockGadget(gadget: Gadget): void {
    if (this.unlocked.has(gadget)) return
    this.unlocked.add(gadget)
    this.activeGadget = gadget
    this.callbacks.onGadget(gadget)
    audio.sfx('pickup')
  }

  selectGadget(index: number): void {
    const gadget = GADGET_ORDER[index]
    if (gadget && this.unlocked.has(gadget)) this.activeGadget = gadget
  }

  cycleGadget(direction: 1 | -1): void {
    const available = GADGET_ORDER.filter((gadget) => this.unlocked.has(gadget))
    if (available.length === 0) return
    const current = Math.max(0, available.indexOf(this.activeGadget))
    this.activeGadget = available[(current + direction + available.length) % available.length]
  }

  update(deltaMs: number, input: InputManager, aim: Aim): void {
    if (this.dead || this.destroyed) return
    const dtMs = Math.min(deltaMs, 50)
    const dt = dtMs / 1000
    const now = this.scene.time.now
    const body = this.body()
    const grounded = this.grounded
    const axis = input.axisX()
    this.aimAngle = Math.atan2(aim.y, aim.x)

    if (grounded && !this.wasGrounded) {
      const impact = Math.min(1, Math.abs(this.lastVy) / 900)
      this.view.land()
      this.callbacks.onLand(impact)
      audio.sfx('land')
      if (impact > 0.3) this.callbacks.onDust(this.x, this.y + 28, Math.round(4 + impact * 8))
    }
    if (grounded) {
      this.coyoteMs = TUNING.coyoteMs
      this.fuel = Math.min(100, this.fuel + TUNING.jetpackRefill * dt)
    } else {
      this.coyoteMs = Math.max(0, this.coyoteMs - dtMs)
    }

    if (input.justPressed('jump')) this.jumpBufferMs = TUNING.jumpBufferMs
    else this.jumpBufferMs = Math.max(0, this.jumpBufferMs - dtMs)

    if (this.springCharging) {
      this.springChargeMs += dtMs
      if (!input.isDown('gadget') || !grounded) {
        if (this.springChargeMs > 90 && grounded) {
          const charge = Math.min(1, this.springChargeMs / TUNING.springChargeMs)
          body.setVelocityY(TUNING.springJump - charge * 70)
          this.view.land()
          this.callbacks.onSpring(this.x, this.y + 26)
          this.callbacks.onDust(this.x, this.y + 28, 18)
          audio.sfx('jump')
          this.coyoteMs = 0
        }
        this.springCharging = false
        this.springChargeMs = 0
      }
    }

    if (this.dashing) {
      if (now >= this.dashUntil) this.stopDash()
      else {
        body.setVelocityX(this.facing * TUNING.dashSpeed)
        if (now - this.lastTrailAt > 40) {
          this.lastTrailAt = now
          this.callbacks.onDash(this.x, this.y)
        }
      }
    }

    if (!this.dashing) {
      const acceleration = grounded ? TUNING.runAcceleration : TUNING.airAcceleration
      if (axis !== 0) {
        body.setAccelerationX(axis * acceleration)
        body.setDragX(0)
        this.facing = axis < 0 ? -1 : 1
        if (Math.abs(axis) > 0.25) this.facing = axis < 0 ? -1 : 1
      } else {
        body.setAccelerationX(0)
        body.setDragX(grounded ? TUNING.groundDrag : TUNING.airDrag)
      }
      if (Math.abs(body.velocity.x) > TUNING.runSpeed && grounded) {
        body.setVelocityX(Math.sign(body.velocity.x) * TUNING.runSpeed)
      }
    }

    const wallDir = body.blocked.left ? -1 : body.blocked.right ? 1 : 0
    this.wallSliding =
      !grounded && body.velocity.y > 0 && wallDir !== 0 && axis !== 0 && Math.sign(axis) === wallDir
    if (this.wallSliding) body.setVelocityY(Math.min(body.velocity.y, TUNING.wallSlideSpeed))

    const jump = evaluateJump({
      grounded,
      coyoteTimerMs: this.coyoteMs,
      jumpBufferMs: this.jumpBufferMs,
      jumpHeld: input.isDown('jump'),
      velocityY: body.velocity.y,
      wallDir: this.wallSliding ? (wallDir as -1 | 1) : 0,
    })
    if (jump.kind !== 'none') {
      body.setVelocityY(jump.velocityY)
      if (jump.kind === 'wall') {
        body.setVelocityX(jump.velocityX)
        this.facing = jump.velocityX < 0 ? -1 : 1
      }
      this.jumpBufferMs = 0
      this.coyoteMs = 0
      this.jumps += 1
      this.view.land()
      this.callbacks.onDust(this.x, this.y + 24, 6)
      audio.sfx('jump')
    }

    if (this.jetpacking) this.jetpacking = false
    const wantJetpack =
      this.activeGadget === 'jetpack' &&
      this.unlocked.has('jetpack') &&
      input.isDown('gadget') &&
      !grounded &&
      this.fuel > 0.5
    if (wantJetpack && !this.springCharging) {
      body.setAccelerationY(0)
      // Arcade applies world gravity after this update, so the impulse has to
      // overcome gravity as well as provide lift.
      body.setVelocityY(Math.max(-TUNING.jetpackMaxRise, body.velocity.y - 3250 * dt))
      this.fuel = Math.max(0, this.fuel - TUNING.jetpackDrain * dt)
      this.jetpacking = true
      if (Math.random() < 0.55) this.callbacks.onJetpack(this.x - this.facing * 13, this.y + 16)
    } else {
      body.setAccelerationY(apexGravityOffset(body.velocity.y, input.isDown('jump')))
    }
    if (body.velocity.y > TUNING.maxFallSpeed) body.setVelocityY(clampFall(body.velocity.y))

    const wantSpring =
      this.activeGadget === 'spring' &&
      this.unlocked.has('spring') &&
      grounded &&
      input.isDown('gadget') &&
      !this.dashing
    if (wantSpring) {
      this.springCharging = true
      if (this.springChargeMs === 0) this.springChargeMs = 1
    }

    this.magnetActive =
      this.activeGadget === 'magnet' && this.unlocked.has('magnet') && input.isDown('gadget')

    const phaseDash =
      this.unlocked.has('phase') &&
      (input.justPressed('dash') || (this.activeGadget === 'phase' && input.justPressed('gadget')))
    if (phaseDash && now >= this.nextDashAt && !this.dashing && !this.springCharging) {
      this.startDash(now, axis)
    }

    this.crouching = grounded && input.isDown('down') && !this.dashing

    // A quick mobile tap can begin and end between two update frames, so a
    // justPressed pulse counts as well as a held fire button.
    if (
      !this.springCharging &&
      (input.isDown('fire') || input.justPressed('fire')) &&
      now >= this.nextShotAt &&
      !this.dashing
    ) {
      this.nextShotAt = now + TUNING.fireCooldownMs
      const muzzleX = this.x + aim.x * 25
      const muzzleY = this.y - 7 + aim.y * 20
      this.view.shoot()
      this.shotsFired += 1
      this.callbacks.onShoot(aim, muzzleX, muzzleY)
      this.callbacks.onDust(muzzleX, muzzleY, 2)
      audio.sfx('shoot')
      body.setVelocityX(body.velocity.x - aim.x * 14)
    }

    if (!grounded) body.setVelocityY(applyJumpCut(body.velocity.y, input.isDown('jump')))
    if (!this.dashing) body.setMaxVelocity(TUNING.runSpeed * 1.25, TUNING.maxFallSpeed)

    this.crouching = grounded && input.isDown('down') && !this.dashing
    this.wasGrounded = grounded
    this.lastVy = body.velocity.y
    this.updateVisual(dt)
  }

  private startDash(now: number, axis: number): void {
    this.dashing = true
    this.dashes += 1
    this.dashUntil = now + TUNING.dashMs
    this.nextDashAt = now + TUNING.dashCooldownMs
    if (axis !== 0) this.facing = axis < 0 ? -1 : 1
    this.body().setAllowGravity(false)
    this.body().setVelocity(this.facing * TUNING.dashSpeed, 0)
    this.body().setMaxVelocity(TUNING.dashSpeed, 200)
    this.view.dash()
    this.callbacks.onDash(this.x, this.y)
    audio.sfx('dash')
  }

  private stopDash(): void {
    this.dashing = false
    this.body().setAllowGravity(true)
    this.body().setMaxVelocity(TUNING.runSpeed * 1.25, TUNING.maxFallSpeed)
    this.body().setVelocityX(this.facing * TUNING.runSpeed)
  }

  private updateVisual(dt: number): void {
    const body = this.body()
    this.view.setPosition(this.x, this.y)
    const state: PipVisualState = {
      vx: body.velocity.x,
      vy: body.velocity.y,
      grounded: this.grounded,
      facing: this.facing,
      jetpack: this.jetpacking,
      jetpackUnlocked: this.unlocked.has('jetpack'),
      dashing: this.dashing,
      shooting: false,
      hurt: this.invulnerable,
      invulnerable: this.invulnerable,
      springCharging: this.springCharging,
      crouching: this.crouching,
      celebrating: this.celebrating,
      aimAngle: this.aimAngle,
    }
    this.view.update(dt, state)
    this.bolt.update(dt, this.x, this.y, this.facing)
  }

  damage(amount: number, sourceX: number): boolean {
    if (this.dead || this.dashing || this.invulnerable) return false
    this.health = Math.max(0, this.health - amount)
    this.invulnerableUntil = this.scene.time.now + TUNING.invulnerableMs
    this.view.hurt()
    this.callbacks.onHurt(sourceX)
    audio.sfx('hurt')
    const direction = sourceX < this.x ? 1 : -1
    this.body().setVelocity(direction * 340, -330)
    if (this.health <= 0) {
      this.dead = true
      this.celebrating = false
      this.callbacks.onDefeat()
    }
    return true
  }

  respawn(x: number, y: number): void {
    this.dead = false
    this.health = this.maxHealth
    this.fuel = 100
    this.dashing = false
    this.jetpacking = false
    this.springCharging = false
    this.springChargeMs = 0
    this.celebrating = false
    this.body().setAllowGravity(true)
    this.body().setVelocity(0, 0)
    this.sprite.setPosition(x, y)
    this.invulnerableUntil = this.scene.time.now + 1600
    this.wasGrounded = false
    this.view.setPosition(x, y)
    this.bolt.setPosition(x + 44, y - 54)
    this.view.setVisible(true)
  }

  setCelebrating(value: boolean): void {
    this.celebrating = value
    this.body().setVelocityX(0)
    if (value) {
      this.body().setAccelerationX(0)
      this.body().setDragX(TUNING.groundDrag)
    }
  }

  freeze(): void {
    this.body().setAcceleration(0, 0)
    this.body().setVelocity(0, 0)
  }

  destroy(): void {
    this.destroyed = true
    this.view.destroy()
    this.bolt.destroy()
    this.sprite.destroy()
  }
}
