import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from '../config'

interface Drifter {
  sprite: Phaser.GameObjects.Image
  speed: number
  baseY: number
  amplitude: number
  phase: number
}

export class Parallax {
  private sky: Phaser.GameObjects.Image
  private stars: Phaser.GameObjects.TileSprite
  private planet: Phaser.GameObjects.Image
  private clouds: Phaser.GameObjects.TileSprite
  private mountainsFar: Phaser.GameObjects.TileSprite
  private mountainsMid: Phaser.GameObjects.TileSprite
  private islands: Phaser.GameObjects.TileSprite
  private canopy: Phaser.GameObjects.TileSprite
  private vines: Phaser.GameObjects.TileSprite
  private fireflies: Drifter[] = []
  private motes: Drifter[] = []
  private virtualScroll = 0
  private lastCameraX = 0
  private autoSpeed: number
  private reduced: boolean

  constructor(scene: Phaser.Scene, options: { autoSpeed?: number; quality?: 'low' | 'medium' | 'high'; reducedMotion?: boolean } = {}) {
    this.autoSpeed = options.autoSpeed ?? 0
    this.reduced = options.reducedMotion ?? false
    const quality = options.quality ?? 'high'

    this.sky = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'sky').setScrollFactor(0).setDepth(-120)
    this.stars = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'stars')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-110)
      .setAlpha(0.9)
    this.planet = scene.add
      .image(GAME_WIDTH - 210, 188, 'planet')
      .setScrollFactor(0.035)
      .setDepth(-105)
      .setScale(0.9)
      .setAlpha(0.9)
    this.clouds = scene.add
      .tileSprite(0, 80, GAME_WIDTH, 340, 'clouds')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-100)
      .setAlpha(0.7)
    this.mountainsFar = scene.add
      .tileSprite(0, 220, GAME_WIDTH, 500, 'mountains-far')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-90)
      .setAlpha(0.75)
    this.mountainsMid = scene.add
      .tileSprite(0, 275, GAME_WIDTH, 480, 'mountains-mid')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-80)
      .setAlpha(0.92)
    this.islands = scene.add
      .tileSprite(0, 120, GAME_WIDTH, 720, 'islands')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-70)
      .setAlpha(0.8)
    this.canopy = scene.add
      .tileSprite(0, 155, GAME_WIDTH, 560, 'canopy')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-60)
      .setAlpha(0.95)
    this.vines = scene.add
      .tileSprite(0, 0, GAME_WIDTH, 260, 'vines')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(90)
      .setAlpha(0.34)

    if (quality !== 'low') {
      const count = quality === 'high' ? 18 : 10
      for (let i = 0; i < count; i += 1) {
        const firefly = scene.add
          .image(Math.random() * GAME_WIDTH, 150 + Math.random() * 430, 'spark')
          .setScrollFactor(0)
          .setDepth(-45)
          .setScale(0.6 + Math.random() * 1.3)
          .setAlpha(0.2 + Math.random() * 0.55)
          .setTint(Math.random() > 0.5 ? 0xffe59a : 0x7ef5e5)
        this.fireflies.push({
          sprite: firefly,
          speed: 6 + Math.random() * 13,
          baseY: firefly.y,
          amplitude: 8 + Math.random() * 22,
          phase: Math.random() * Math.PI * 2,
        })
      }
      for (let i = 0; i < Math.floor(count / 2); i += 1) {
        const mote = scene.add
          .image(Math.random() * GAME_WIDTH, 90 + Math.random() * 300, 'dust')
          .setScrollFactor(0)
          .setDepth(-50)
          .setScale(0.5 + Math.random() * 1.4)
          .setAlpha(0.08 + Math.random() * 0.18)
        this.motes.push({
          sprite: mote,
          speed: 4 + Math.random() * 8,
          baseY: mote.y,
          amplitude: 10 + Math.random() * 24,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }
  }

  update(time: number, cameraX = 0): void {
    const dx = cameraX - this.lastCameraX
    this.lastCameraX = cameraX
    this.virtualScroll += this.autoSpeed * 0.016 + dx
    const offset = this.virtualScroll
    this.stars.tilePositionX = offset * 0.018
    this.planet.x = GAME_WIDTH - 210 - offset * 0.028
    this.clouds.tilePositionX = offset * 0.07 + time * 0.004
    this.mountainsFar.tilePositionX = offset * 0.11
    this.mountainsMid.tilePositionX = offset * 0.2
    this.islands.tilePositionX = offset * 0.3
    this.canopy.tilePositionX = offset * 0.43
    this.vines.tilePositionX = offset * 1.03

    if (!this.reduced) {
      for (const firefly of this.fireflies) {
        firefly.sprite.x -= firefly.speed * 0.016
        firefly.sprite.y = firefly.baseY + Math.sin(time * 0.001 + firefly.phase) * firefly.amplitude
        firefly.sprite.alpha = 0.24 + (Math.sin(time * 0.003 + firefly.phase) + 1) * 0.22
        if (firefly.sprite.x < -12) firefly.sprite.x = GAME_WIDTH + 12
      }
      for (const mote of this.motes) {
        mote.sprite.x -= mote.speed * 0.016
        mote.sprite.y = mote.baseY + Math.cos(time * 0.0007 + mote.phase) * mote.amplitude
        if (mote.sprite.x < -10) mote.sprite.x = GAME_WIDTH + 10
      }
    }
  }

  setCameraScroll(cameraX: number): void {
    this.update(0, cameraX)
  }

  destroy(): void {
    this.sky.destroy()
    this.stars.destroy()
    this.planet.destroy()
    this.clouds.destroy()
    this.mountainsFar.destroy()
    this.mountainsMid.destroy()
    this.islands.destroy()
    this.canopy.destroy()
    this.vines.destroy()
    this.fireflies.forEach((firefly) => firefly.sprite.destroy())
    this.motes.forEach((mote) => mote.sprite.destroy())
  }
}
