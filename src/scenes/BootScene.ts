import Phaser from 'phaser'
import { CSS, DISPLAY_FONT, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config'
import { createBaseTextures } from '../art/Textures'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    createBaseTextures(this)
    this.cameras.main.setBackgroundColor('#071326')

    const halo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'glow').setScale(4).setTint(0x2ec4b6).setAlpha(0.2)
    const mark = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'fragment').setScale(1.1)
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 34, 'GALACTIC GADGETEER', {
        fontFamily: DISPLAY_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: CSS.cream,
        letterSpacing: 5,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const sub = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 76, 'CALIBRATING GADGETS', {
        fontFamily: FONT,
        fontSize: '11px',
        color: CSS.tealLight,
        letterSpacing: 3,
      })
      .setOrigin(0.5)
      .setResolution(2)

    this.tweens.add({
      targets: [mark, halo],
      scale: '+=0.06',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    this.tweens.add({
      targets: sub,
      alpha: 0.32,
      duration: 700,
      yoyo: true,
      repeat: -1,
    })
    this.tweens.add({ targets: title, alpha: 0.82, duration: 800, yoyo: true, repeat: -1 })

    this.time.delayedCall(520, () => {
      this.cameras.main.fadeOut(260, 7, 19, 38)
      this.time.delayedCall(280, () => this.scene.start('Menu'))
    })
  }
}
