import Phaser from 'phaser'
import { CSS, DISPLAY_FONT, FONT, GAME_HEIGHT, GAME_WIDTH, VERSION } from '../config'
import { GADGET_NAMES, GADGET_ORDER, type Gadget, type Player } from '../player/Player'

const ICONS: Record<Gadget, string> = {
  blaster: 'icon-blaster',
  jetpack: 'icon-jetpack',
  spring: 'icon-spring',
  magnet: 'icon-magnet',
  phase: 'icon-phase',
}

export class Hud {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private healthGraphics: Phaser.GameObjects.Graphics
  private shardText: Phaser.GameObjects.Text
  private timerText: Phaser.GameObjects.Text
  private objectiveText: Phaser.GameObjects.Text
  private statusText: Phaser.GameObjects.Text
  private fuelGraphics: Phaser.GameObjects.Graphics
  private fuelLabel: Phaser.GameObjects.Text
  private gadgetSlotGraphics: Phaser.GameObjects.Graphics
  private gadgetIcons: Phaser.GameObjects.Image[] = []
  private gadgetKeys: Phaser.GameObjects.Text[] = []
  private gadgetName: Phaser.GameObjects.Text
  private toast: Phaser.GameObjects.Container
  private toastBackground: Phaser.GameObjects.Graphics
  private toastText: Phaser.GameObjects.Text
  private toastEvent: Phaser.Time.TimerEvent | null = null
  private banner: Phaser.GameObjects.Container
  private bannerTitle: Phaser.GameObjects.Text
  private bannerSub: Phaser.GameObjects.Text
  private controls: Phaser.GameObjects.Text
  private pauseButton: Phaser.GameObjects.Container
  private onPause: () => void
  private onGadgetSelect: (index: number) => void
  private lastHealth = -1
  private lastGadget = ''
  private lastUnlocked = ''
  private totalShards: number

  constructor(
    scene: Phaser.Scene,
    totalShards: number,
    onPause: () => void,
    onGadgetSelect: (index: number) => void = () => {},
  ) {
    this.scene = scene
    this.totalShards = totalShards
    this.onPause = onPause
    this.onGadgetSelect = onGadgetSelect
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000)

    this.healthGraphics = scene.add.graphics()
    this.container.add(this.healthGraphics)

    const shardIcon = scene.add.image(39, 89, 'shard').setScale(0.48)
    this.shardText = scene.add
      .text(60, 82, `0 / ${totalShards}`, {
        fontFamily: DISPLAY_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: CSS.cream,
      })
      .setResolution(2)
    this.container.add([shardIcon, this.shardText])

    this.objectiveText = scene.add
      .text(GAME_WIDTH / 2, 25, 'RECOVER THE STARLIGHT FRAGMENT', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS.gold,
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
    this.statusText = scene.add
      .text(GAME_WIDTH / 2, 44, 'The Fallen Beacon', {
        fontFamily: FONT,
        fontSize: '12px',
        color: CSS.muted,
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
    this.container.add([this.objectiveText, this.statusText])

    this.timerText = scene.add
      .text(GAME_WIDTH - 74, 30, '0:00', {
        fontFamily: DISPLAY_FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: CSS.cream,
      })
      .setOrigin(1, 0)
      .setResolution(2)
    this.container.add(this.timerText)

    this.fuelGraphics = scene.add.graphics()
    this.fuelLabel = scene.add
      .text(29, 218, 'JETPACK FUEL', {
        fontFamily: FONT,
        fontSize: '9px',
        fontStyle: 'bold',
        color: CSS.muted,
        letterSpacing: 1.2,
      })
      .setResolution(2)
    this.container.add([this.fuelGraphics, this.fuelLabel])

    this.gadgetSlotGraphics = scene.add.graphics()
    this.container.add(this.gadgetSlotGraphics)
    GADGET_ORDER.forEach((gadget, index) => {
      const icon = scene.add.image(42 + index * 52, 150, ICONS[gadget]).setScale(0.55)
      const key = scene.add
        .text(29 + index * 52, 170, String(index + 1), {
          fontFamily: FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: CSS.muted,
        })
        .setResolution(2)
      const hit = scene.add
        .circle(42 + index * 52, 158, 28, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
      hit.on('pointerdown', () => this.onGadgetSelect(index))
      this.gadgetIcons.push(icon)
      this.gadgetKeys.push(key)
      this.container.add([icon, key, hit])
    })
    this.gadgetName = scene.add
      .text(29, 241, 'PLASMA BLASTER', {
        fontFamily: FONT,
        fontSize: '11px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 1.2,
      })
      .setResolution(2)
    this.container.add(this.gadgetName)

    this.toast = scene.add.container(GAME_WIDTH / 2, 604).setScrollFactor(0).setDepth(1100).setVisible(false)
    this.toastBackground = scene.add.graphics()
    this.toastText = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: CSS.cream,
        align: 'center',
        wordWrap: { width: 690 },
        lineSpacing: 3,
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.toast.add([this.toastBackground, this.toastText])

    this.banner = scene.add.container(GAME_WIDTH / 2, 268).setScrollFactor(0).setDepth(1150).setAlpha(0)
    this.bannerTitle = scene.add
      .text(0, 0, '', {
        fontFamily: DISPLAY_FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: CSS.cream,
        stroke: '#071326',
        strokeThickness: 8,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.bannerSub = scene.add
      .text(0, 42, '', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setResolution(2)
    this.banner.add([this.bannerTitle, this.bannerSub])

    this.controls = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: CSS.muted,
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setAlpha(0.9)
    this.container.add(this.controls)

    this.pauseButton = scene.add.container(GAME_WIDTH - 30, 31).setScrollFactor(0).setDepth(1050)
    const pauseBg = scene.add.graphics()
    pauseBg.fillStyle(0x071326, 0.65)
    pauseBg.fillCircle(0, 0, 19)
    pauseBg.lineStyle(1.5, 0x7ef5e5, 0.5)
    pauseBg.strokeCircle(0, 0, 19)
    pauseBg.fillStyle(0xfff3d1, 1)
    pauseBg.fillRoundedRect(-5, -7, 3.5, 14, 1)
    pauseBg.fillRoundedRect(2, -7, 3.5, 14, 1)
    const hit = scene.add.circle(0, 0, 26, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => this.onPause())
    this.pauseButton.add([pauseBg, hit])
    this.container.add(this.pauseButton)

    const version = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 38, `EXPEDITION ${VERSION}`, {
        fontFamily: FONT,
        fontSize: '8px',
        color: CSS.muted,
        letterSpacing: 1.4,
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setAlpha(0.42)
    this.container.add(version)
  }

  update(player: Player, shards: number, elapsedMs: number, checkpoint: string): void {
    if (this.lastHealth !== player.health) {
      this.lastHealth = player.health
      this.drawHealth(player.health, player.maxHealth)
    }
    const unlockedKey = [...player.unlocked].join(',') + player.activeGadget
    if (this.lastGadget !== player.activeGadget || this.lastUnlocked !== unlockedKey) {
      this.lastGadget = player.activeGadget
      this.lastUnlocked = unlockedKey
      this.drawGadgets(player)
      this.gadgetName.setText(GADGET_NAMES[player.activeGadget])
    }
    this.shardText.setText(`${shards} / ${this.totalShards}`)
    const seconds = Math.floor(elapsedMs / 1000)
    this.timerText.setText(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`)
    this.statusText.setText(
      checkpoint === 'meadow-gate'
        ? 'Checkpoint · Meadow Gate'
        : checkpoint === 'high-garden'
          ? 'Checkpoint · High Garden'
          : 'The Fallen Beacon',
    )
    if (player.unlocked.has('jetpack')) {
      this.drawFuel(player.fuelRatio)
    } else {
      this.fuelGraphics.clear()
      this.fuelLabel.setVisible(false)
    }
    this.controls.setText(
      player.unlocked.has('phase')
        ? 'ARROWS / A-D MOVE  ·  SPACE JUMP  ·  J FIRE  ·  K GADGET  ·  SHIFT DASH  ·  ESC PAUSE'
        : 'ARROWS / A-D MOVE  ·  SPACE JUMP  ·  J FIRE  ·  K GADGET  ·  ESC PAUSE',
    )
  }

  private drawHealth(health: number, max: number): void {
    const g = this.healthGraphics
    g.clear()
    for (let i = 0; i < max; i += 1) {
      const x = 32 + i * 29
      const y = 34
      const active = i < health
      g.fillStyle(active ? 0xff5db1 : 0x24384f, active ? 0.9 : 0.7)
      g.beginPath()
      g.moveTo(x, y - 11)
      g.lineTo(x + 10, y - 4)
      g.lineTo(x + 7, y + 8)
      g.lineTo(x, y + 13)
      g.lineTo(x - 7, y + 8)
      g.lineTo(x - 10, y - 4)
      g.closePath()
      g.fillPath()
      g.lineStyle(1.4, active ? 0xffd2e7 : 0x54718a, active ? 0.9 : 0.4)
      g.strokePath()
      if (active) {
        g.fillStyle(0xffffff, 0.45)
        g.fillCircle(x - 2, y - 2, 2)
      }
    }
  }

  private drawGadgets(player: Player): void {
    const g = this.gadgetSlotGraphics
    g.clear()
    GADGET_ORDER.forEach((gadget, index) => {
      const x = 28 + index * 52
      const unlocked = player.unlocked.has(gadget)
      const active = player.activeGadget === gadget
      g.fillStyle(0x071326, 0.72)
      g.fillRoundedRect(x, 126, 42, 42, 9)
      if (active) {
        g.lineStyle(2, 0x7ef5e5, 1)
      } else {
        g.lineStyle(1, unlocked ? 0x6f89a2 : 0x35475b, unlocked ? 0.8 : 0.3)
      }
      g.strokeRoundedRect(x, 126, 42, 42, 9)
      if (active) {
        g.fillStyle(0x2ec4b6, 0.11)
        g.fillRoundedRect(x + 2, 128, 38, 38, 7)
      }
      this.gadgetIcons[index].setAlpha(unlocked ? 1 : 0.18)
      this.gadgetKeys[index].setColor(active ? CSS.tealLight : unlocked ? CSS.cream : '#43586c')
    })
  }

  private drawFuel(ratio: number): void {
    this.fuelLabel.setVisible(true)
    const g = this.fuelGraphics
    g.clear()
    const x = 28
    const y = 201
    g.fillStyle(0x071326, 0.6)
    g.fillRoundedRect(x, y, 196, 12, 6)
    g.lineStyle(1, 0x6f89a2, 0.4)
    g.strokeRoundedRect(x, y, 196, 12, 6)
    const width = Math.max(0, 190 * ratio)
    if (width > 2) {
      g.fillStyle(ratio > 0.28 ? 0xff9f1c : 0xff4f6d, 0.9)
      g.fillRoundedRect(x + 3, y + 3, width, 6, 3)
      g.fillStyle(0xffe59a, 0.4)
      g.fillRoundedRect(x + 3, y + 3, width, 3, 1.5)
    }
  }

  showToast(text: string, duration = 4400): void {
    this.toastText.setText(text)
    const width = Math.min(820, Math.max(360, this.toastText.width + 58))
    const height = this.toastText.height + 28
    this.toastBackground.clear()
    this.toastBackground.fillStyle(0x071326, 0.88)
    this.toastBackground.fillRoundedRect(-width / 2, -height / 2, width, height, 14)
    this.toastBackground.lineStyle(1.2, 0x7ef5e5, 0.4)
    this.toastBackground.strokeRoundedRect(-width / 2, -height / 2, width, height, 14)
    this.toast.setVisible(true).setAlpha(1)
    this.toast.y = 604
    this.toastEvent?.remove()
    this.toastEvent = this.scene.time.delayedCall(duration, () => {
      this.scene.tweens.add({
        targets: this.toast,
        alpha: 0,
        y: 590,
        duration: 340,
        onComplete: () => this.toast.setVisible(false),
      })
    })
  }

  showBanner(title: string, subtitle: string): void {
    this.bannerTitle.setText(title)
    this.bannerSub.setText(subtitle)
    this.banner.setAlpha(0).setScale(0.96)
    this.scene.tweens.add({
      targets: this.banner,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(2100, () => {
          this.scene.tweens.add({ targets: this.banner, alpha: 0, duration: 550 })
        })
      },
    })
  }

  setPauseVisible(visible: boolean): void {
    this.pauseButton.setVisible(visible)
  }

  setTouchMode(touch: boolean): void {
    this.pauseButton.setVisible(true)
    this.controls.setVisible(!touch)
  }

  hideToast(): void {
    this.toastEvent?.remove()
    this.toast.setVisible(false)
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible)
    this.toast.setVisible(visible && this.toast.visible)
    this.banner.setVisible(visible)
  }

  destroy(): void {
    this.toastEvent?.remove()
    this.container.destroy(true)
    this.toast.destroy(true)
    this.banner.destroy(true)
  }
}
