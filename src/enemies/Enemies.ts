import Phaser from 'phaser'
import type { Player } from '../player/Player'
import type { EnemyDef } from '../data/levelOne'

export interface EnemyEvents {
  onFire: (x: number, y: number, vx: number, vy: number) => void
  onDefeated: (enemy: Enemy) => void
}

type EnemyKind = EnemyDef['type']

/**
 * Enemies are deliberately scripted rather than free rigid bodies. Their
 * silhouettes, telegraphs and positions are the gameplay truth, so a platform
 * contact or a player hit cannot be lost to an Arcade body sleeping or falling
 * through a scaled static collider.
 */
export class Enemy {
  readonly kind: EnemyKind
  readonly sprite: Phaser.Physics.Arcade.Sprite
  hp: number
  maxHp: number
  alive = true
  private scene: Phaser.Scene
  private view: Phaser.GameObjects.Container
  private bodyGraphics: Phaser.GameObjects.Graphics
  private eye: Phaser.GameObjects.Ellipse
  private glow: Phaser.GameObjects.Image
  private rotors: Phaser.GameObjects.Graphics[] = []
  private cannon: Phaser.GameObjects.Container | null = null
  private homeX: number
  private homeY: number
  private patrol: number
  private baseY: number
  private direction: 1 | -1 = -1
  private flashTimer = 0
  private state: 'idle' | 'alert' | 'dive' | 'recover' = 'idle'
  private stateTimer = 0
  private fireTimer = 0
  private charge = 0
  private phase = Math.random() * Math.PI * 2
  private events: EnemyEvents
  private hitFlash: Phaser.GameObjects.Ellipse
  private defeated = false

  constructor(scene: Phaser.Scene, def: EnemyDef, events: EnemyEvents) {
    this.scene = scene
    this.events = events
    this.kind = def.type
    this.homeX = def.x
    this.homeY = def.y
    this.patrol = def.patrol ?? 120
    this.maxHp = this.kind === 'turret' ? 3 : 2
    this.hp = this.maxHp
    // The invisible sprite is a stable transform anchor for the rig, not a
    // physics participant. Ground enemies sit on the 760px meadow surface.
    this.baseY = this.kind === 'mite' ? def.y + 23 : this.kind === 'turret' ? def.y + 22 : def.y
    this.sprite = scene.physics.add.sprite(def.x, this.baseY, 'hitbox').setVisible(false)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.enable = false
    body.allowGravity = false
    this.sprite.setData('enemy', this)

    this.view = scene.add.container(def.x, this.baseY).setDepth(18)
    this.glow = scene.add
      .image(0, 3, 'glow')
      .setScale(0.34)
      .setTint(0xffc857)
      .setAlpha(0.14)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.view.add(this.glow)
    this.bodyGraphics = scene.add.graphics()
    this.view.add(this.bodyGraphics)
    this.eye = scene.add.ellipse(0, 0, 4, 4, 0x7ef5e5, 1)
    this.view.add(this.eye)
    this.hitFlash = scene.add.ellipse(0, 0, 42, 32, 0xffffff, 0)
    this.view.add(this.hitFlash)
    this.buildArt()
  }

  private buildArt(): void {
    const g = this.bodyGraphics
    g.clear()
    if (this.kind === 'mite') {
      g.fillStyle(0x4b2b45, 0.3)
      g.fillEllipse(0, 13, 34, 6)
      for (const side of [-1, 1]) {
        const leg = this.scene.add.graphics()
        leg.lineStyle(2.5, 0x1a2a2e, 1)
        leg.beginPath()
        leg.moveTo(side * 7, 3)
        leg.lineTo(side * 15, 10)
        leg.lineTo(side * 19, 12)
        leg.strokePath()
        this.view.addAt(leg, 1)
      }
      g.fillStyle(0x2c5b42, 1)
      g.fillEllipse(-1, -1, 28, 19)
      g.lineStyle(2.2, 0x102338, 1)
      g.strokeEllipse(-1, -1, 28, 19)
      g.fillStyle(0x71c76a, 0.8)
      g.fillEllipse(-4, -5, 15, 6)
      g.fillStyle(0xceb4e8, 0.9)
      g.fillTriangle(-10, -7, -6, -15, -3, -5)
      g.fillTriangle(10, -6, 14, -13, 15, -3)
      g.fillStyle(0x35533f, 1)
      g.fillCircle(12, 1, 8)
      g.lineStyle(2, 0x102338, 1)
      g.strokeCircle(12, 1, 8)
      g.fillStyle(0xfff3d1, 1)
      g.fillCircle(15, 0, 3)
      g.fillStyle(0x102338, 1)
      g.fillCircle(16, 0, 1.5)
      g.lineStyle(1.5, 0x102338, 1)
      g.beginPath()
      g.moveTo(12, -7)
      g.lineTo(9, -14)
      g.moveTo(17, -5)
      g.lineTo(21, -11)
      g.strokePath()
      g.fillStyle(0x74d680, 1)
      g.fillCircle(21, -12, 2)
      this.eye.setPosition(16, 0)
    } else if (this.kind === 'drone') {
      g.fillStyle(0x263b62, 0.36)
      g.fillEllipse(0, 22, 34, 6)
      g.lineStyle(2, 0x2b4d63, 1)
      g.beginPath()
      g.moveTo(-24, -12)
      g.lineTo(24, -12)
      g.strokePath()
      for (const side of [-1, 1]) {
        const rotor = this.scene.add.graphics()
        rotor.fillStyle(0x7ef5e5, 0.32)
        rotor.fillEllipse(0, 0, 28, 4)
        rotor.x = side * 22
        rotor.y = -12
        this.view.addAt(rotor, 1)
        this.rotors.push(rotor)
      }
      g.fillStyle(0x7b61ff, 1)
      g.fillEllipse(0, -1, 34, 18)
      g.lineStyle(2.4, 0x102338, 1)
      g.strokeEllipse(0, -1, 34, 18)
      g.fillStyle(0x2ec4b6, 1)
      g.fillEllipse(0, -5, 22, 8)
      g.fillStyle(0x102338, 1)
      g.fillEllipse(0, 4, 20, 9)
      g.fillStyle(0x7ef5e5, 1)
      g.fillCircle(0, 3, 5)
      g.fillStyle(0xffffff, 0.9)
      g.fillCircle(-2, 1, 2)
      g.fillStyle(0xff9f1c, 1)
      g.fillTriangle(-16, -2, -24, 2, -16, 5)
      g.fillTriangle(16, -2, 24, 2, 16, 5)
      this.eye.setPosition(0, 3)
    } else {
      g.fillStyle(0x142c3e, 0.3)
      g.fillEllipse(0, 26, 42, 8)
      g.fillStyle(0x3b526a, 1)
      g.fillRoundedRect(-21, 8, 42, 18, 6)
      g.lineStyle(2.2, 0x102338, 1)
      g.strokeRoundedRect(-21, 8, 42, 18, 6)
      g.fillStyle(0x7d97ad, 1)
      g.fillRoundedRect(-14, -8, 28, 22, 8)
      g.lineStyle(2.4, 0x102338, 1)
      g.strokeRoundedRect(-14, -8, 28, 22, 8)
      g.fillStyle(0x2ec4b6, 0.7)
      g.fillRoundedRect(-10, -4, 20, 4, 2)
      g.fillStyle(0xffc857, 1)
      g.fillCircle(-12, 16, 2.5)
      g.fillCircle(12, 16, 2.5)
      this.cannon = this.scene.add.container(0, -4)
      const cannonBody = this.scene.add.graphics()
      cannonBody.fillStyle(0x42637d, 1)
      cannonBody.fillRoundedRect(0, -5, 27, 10, 4)
      cannonBody.lineStyle(2, 0x102338, 1)
      cannonBody.strokeRoundedRect(0, -5, 27, 10, 4)
      cannonBody.fillStyle(0xff5db1, 1)
      cannonBody.fillCircle(24, 0, 3)
      this.cannon.add(cannonBody)
      this.view.add(this.cannon)
      this.eye.setPosition(0, 1)
      this.eye.setFillStyle(0xff5db1, 1)
    }
  }

  update(deltaMs: number, player: Player): void {
    if (!this.alive || this.defeated) return
    const dt = Math.min(deltaMs, 50) / 1000
    const time = this.scene.time.now
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y)
    this.flashTimer = Math.max(0, this.flashTimer - deltaMs)
    this.hitFlash.alpha = this.flashTimer > 0 ? this.flashTimer / 120 : 0

    if (this.kind === 'mite') {
      this.sprite.x += this.direction * (distance < 150 ? 82 : 52) * dt
      if (this.sprite.x < this.homeX - this.patrol) this.direction = 1
      if (this.sprite.x > this.homeX + this.patrol) this.direction = -1
      this.sprite.y = this.baseY
      this.view.scaleX = this.direction
      this.view.y = this.sprite.y
      this.view.x = this.sprite.x
      this.view.rotation = Math.sin(time * 0.009 + this.phase) * 0.04
      this.glow.setTint(0x74d680)
      this.glow.alpha = 0.12
    } else if (this.kind === 'drone') {
      this.stateTimer -= deltaMs
      this.phase += dt * 2
      if (this.state === 'idle') {
        this.sprite.x = this.homeX + Math.sin(this.phase * 0.8) * this.patrol
        this.sprite.y = this.homeY + Math.sin(this.phase * 1.5) * 16
        this.glow.setTint(0x7ef5e5)
        this.glow.alpha = 0.16
        if (distance < 290) {
          this.state = 'alert'
          this.stateTimer = 480
          this.charge = 0
        }
      } else if (this.state === 'alert') {
        this.charge += dt
        this.glow.setTint(0xff4f6d)
        this.glow.alpha = 0.24 + Math.sin(this.charge * 24) * 0.12
        if (this.stateTimer <= 0) {
          this.state = 'dive'
          this.stateTimer = 1000
          const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, player.x, player.y)
          this.sprite.setData('diveVx', Math.cos(angle) * 245)
          this.sprite.setData('diveVy', Math.sin(angle) * 245)
        }
      } else if (this.state === 'dive') {
        this.glow.setTint(0xff4f6d)
        this.glow.alpha = 0.3
        this.sprite.x += Number(this.sprite.getData('diveVx') ?? 0) * dt
        this.sprite.y += Number(this.sprite.getData('diveVy') ?? 0) * dt
        if (this.stateTimer <= 0) {
          this.state = 'recover'
          this.stateTimer = 900
        }
      } else {
        const homeAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.homeX, this.homeY)
        const homeDistance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.homeX, this.homeY)
        if (homeDistance > 10) {
          this.sprite.x += Math.cos(homeAngle) * 110 * dt
          this.sprite.y += Math.sin(homeAngle) * 110 * dt
        }
        this.glow.setTint(0x7ef5e5)
        this.glow.alpha = 0.12
        if (this.stateTimer <= 0) this.state = 'idle'
      }
      this.view.setPosition(this.sprite.x, this.sprite.y)
      this.view.scaleX = player.x < this.sprite.x ? -1 : 1
      this.rotors.forEach((rotor, index) => {
        rotor.rotation = time * (index === 0 ? 0.03 : -0.03)
      })
      this.view.y += Math.sin(this.phase * 2.2) * 1.5
    } else {
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y - 8, player.x, player.y)
      if (this.cannon) {
        const target = Phaser.Math.Clamp(angle, -Math.PI * 0.85, Math.PI * 0.15)
        this.cannon.rotation = Phaser.Math.Angle.RotateTo(this.cannon.rotation, target, dt * 2.2)
      }
      this.view.scaleX = player.x < this.sprite.x ? -1 : 1
      this.glow.setTint(0xff5db1)
      this.glow.alpha = 0.1 + (distance < 500 ? 0.12 : 0)
      this.charge = Math.max(0, this.charge - dt)
      if (distance < 500) {
        this.fireTimer -= deltaMs
        if (this.fireTimer < 360 && this.fireTimer > 0) {
          this.glow.alpha = 0.36 + Math.sin(time * 0.05) * 0.16
          this.eye.setFillStyle(0xfff3d1, 1)
        }
        if (this.fireTimer <= 0) {
          this.fireTimer = 2100
          this.charge = 0.4
          this.eye.setFillStyle(0xff5db1, 1)
          const muzzleX = this.sprite.x + Math.cos(angle) * 32 * (this.view.scaleX < 0 ? -1 : 1)
          const muzzleY = this.sprite.y - 8 + Math.sin(angle) * 32
          this.events.onFire(muzzleX, muzzleY, Math.cos(angle) * 235, Math.sin(angle) * 235)
        }
      } else {
        this.fireTimer = Math.max(this.fireTimer, 900)
      }
      this.view.setPosition(this.sprite.x, this.sprite.y)
    }
  }

  hit(damage = 1, _knockbackX = 0): boolean {
    if (!this.alive) return false
    this.hp -= damage
    this.flashTimer = 120
    this.scene.tweens.add({
      targets: this.view,
      scaleX: this.view.scaleX > 0 ? 1.15 : -1.15,
      duration: 60,
      yoyo: true,
    })
    if (this.hp <= 0) {
      this.defeat()
      return true
    }
    return false
  }

  private defeat(): void {
    if (this.defeated) return
    this.defeated = true
    this.alive = false
    this.events.onDefeated(this)
    this.scene.tweens.add({
      targets: this.view,
      alpha: 0,
      scaleX: this.view.scaleX * 1.3,
      scaleY: 0.4,
      y: this.view.y + 16,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.view.destroy(),
    })
    this.sprite.destroy()
  }

  get position(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  destroy(): void {
    if (this.alive) this.view.destroy()
    this.sprite.destroy()
  }
}

export function createEnemies(
  scene: Phaser.Scene,
  definitions: EnemyDef[],
  events: EnemyEvents,
): Enemy[] {
  return definitions.map((definition) => new Enemy(scene, definition, events))
}
