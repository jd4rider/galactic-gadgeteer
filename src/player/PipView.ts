import Phaser from 'phaser'
import { TUNING } from '../config'

export interface PipVisualState {
  vx: number
  vy: number
  grounded: boolean
  facing: -1 | 1
  jetpack: boolean
  jetpackUnlocked: boolean
  dashing: boolean
  shooting: boolean
  hurt: boolean
  invulnerable: boolean
  springCharging: boolean
  crouching: boolean
  celebrating: boolean
  aimAngle: number
}

const COLORS = {
  outline: 0x102338,
  suit: 0x2ec4b6,
  suitDark: 0x1e8f92,
  cream: 0xfff3d1,
  gold: 0xffc857,
  orange: 0xff9f1c,
  skin: 0xffcf9f,
  hair: 0xa84f2d,
  visor: 0x7ef5e5,
  tealLight: 0x7ef5e5,
  navy: 0x16344a,
  boot: 0xffd166,
  bootDark: 0xc77d18,
} as const

function limb(
  scene: Phaser.Scene,
  sleeve: number,
  glove: number,
): { container: Phaser.GameObjects.Container; graphics: Phaser.GameObjects.Graphics } {
  const container = scene.add.container(0, 0)
  const graphics = scene.add.graphics()
  graphics.fillStyle(sleeve, 1)
  graphics.fillRoundedRect(-5, -2, 10, 22, 5)
  graphics.lineStyle(2.4, COLORS.outline, 1)
  graphics.strokeRoundedRect(-5, -2, 10, 22, 5)
  graphics.fillStyle(glove, 1)
  graphics.fillRoundedRect(-6, 17, 12, 10, 5)
  graphics.lineStyle(2.2, COLORS.outline, 1)
  graphics.strokeRoundedRect(-6, 17, 12, 10, 5)
  container.add(graphics)
  return { container, graphics }
}

function leg(
  scene: Phaser.Scene,
  pants: number,
  boot: number,
): { container: Phaser.GameObjects.Container; graphics: Phaser.GameObjects.Graphics } {
  const container = scene.add.container(0, 0)
  const graphics = scene.add.graphics()
  graphics.fillStyle(pants, 1)
  graphics.fillRoundedRect(-6, -2, 12, 22, 5)
  graphics.lineStyle(2.4, COLORS.outline, 1)
  graphics.strokeRoundedRect(-6, -2, 12, 22, 5)
  graphics.fillStyle(boot, 1)
  graphics.fillRoundedRect(-8, 17, 18, 13, 6)
  graphics.lineStyle(2.4, COLORS.outline, 1)
  graphics.strokeRoundedRect(-8, 17, 18, 13, 6)
  graphics.fillStyle(COLORS.bootDark, 1)
  graphics.fillRoundedRect(-8, 26, 18, 5, 2.5)
  graphics.lineStyle(1.2, COLORS.outline, 0.7)
  graphics.beginPath()
  graphics.moveTo(-2, 19)
  graphics.lineTo(-1, 26)
  graphics.strokePath()
  container.add(graphics)
  return { container, graphics }
}

export class PipView {
  readonly root: Phaser.GameObjects.Container
  private rig: Phaser.GameObjects.Container
  private shadow: Phaser.GameObjects.Ellipse
  private legBack: Phaser.GameObjects.Container
  private legFront: Phaser.GameObjects.Container
  private armBack: Phaser.GameObjects.Container
  private armFront: Phaser.GameObjects.Container
  private head: Phaser.GameObjects.Container
  private eyeLeft: Phaser.GameObjects.Ellipse
  private eyeRight: Phaser.GameObjects.Ellipse
  private scarf: Phaser.GameObjects.Graphics
  private jetpack: Phaser.GameObjects.Container
  private flame: Phaser.GameObjects.Graphics
  private antialiasGlow: Phaser.GameObjects.Ellipse
  private legPhase = 0
  private breath = 0
  private blinkIn = 3.4
  private blink = 0
  private shootTimer = 0
  private landTimer = 0
  private dashTimer = 0
  private hurtTimer = 0
  private destroyed = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.root = scene.add.container(x, y).setDepth(24)
    this.shadow = scene.add.ellipse(0, 34, 48, 10, 0x04111f, 0.26)
    this.root.add(this.shadow)

    this.rig = scene.add.container(0, 0)
    this.root.add(this.rig)

    this.armBack = limb(scene, COLORS.suitDark, 0xd8b879).container
    this.armBack.setPosition(-12, -13)
    this.rig.add(this.armBack)

    this.jetpack = scene.add.container(-13, -8)
    const pack = scene.add.graphics()
    pack.fillStyle(0x536f88, 1)
    pack.fillRoundedRect(-8, -9, 15, 30, 6)
    pack.lineStyle(2, COLORS.outline, 1)
    pack.strokeRoundedRect(-8, -9, 15, 30, 6)
    pack.fillStyle(COLORS.orange, 1)
    pack.fillRoundedRect(-6, -6, 5, 22, 2.5)
    pack.fillStyle(COLORS.gold, 1)
    pack.fillCircle(-3.5, -7, 2)
    this.jetpack.add(pack)
    this.flame = scene.add.graphics()
    this.flame.fillStyle(0xff9f1c, 0.9)
    this.flame.fillTriangle(-7, 21, 3, 21, -2, 39)
    this.flame.fillStyle(0xffe59a, 0.95)
    this.flame.fillTriangle(-5, 21, 1, 21, -2, 30)
    this.flame.setVisible(false)
    this.jetpack.add(this.flame)
    this.jetpack.setVisible(false)
    this.rig.add(this.jetpack)

    this.legBack = leg(scene, COLORS.suitDark, 0xd7a844).container
    this.legBack.setPosition(-6, 8)
    this.rig.add(this.legBack)

    const torso = scene.add.graphics()
    torso.fillStyle(COLORS.suit, 1)
    torso.fillRoundedRect(-14, -25, 28, 36, 9)
    torso.lineStyle(2.8, COLORS.outline, 1)
    torso.strokeRoundedRect(-14, -25, 28, 36, 9)
    torso.fillStyle(COLORS.cream, 1)
    torso.fillRoundedRect(-8, -18, 16, 18, 7)
    torso.lineStyle(1.6, 0x9d7b53, 0.6)
    torso.strokeRoundedRect(-8, -18, 16, 18, 7)
    torso.fillStyle(COLORS.navy, 1)
    torso.fillRoundedRect(-14, 4, 28, 7, 3.5)
    torso.fillStyle(COLORS.gold, 1)
    torso.fillCircle(0, 7.5, 3.2)
    torso.fillStyle(COLORS.tealLight, 0.65)
    torso.fillRoundedRect(-11, -22, 5, 12, 2.5)
    this.rig.add(torso)

    this.legFront = leg(scene, COLORS.suit, COLORS.boot).container
    this.legFront.setPosition(6, 8)
    this.rig.add(this.legFront)

    this.armFront = limb(scene, COLORS.suit, 0xf0c985).container
    this.armFront.setPosition(13, -13)
    this.rig.add(this.armFront)

    const blaster = scene.add.graphics()
    blaster.fillStyle(0x42637d, 1)
    blaster.fillRoundedRect(-3, 20, 18, 8, 3)
    blaster.lineStyle(1.8, COLORS.outline, 1)
    blaster.strokeRoundedRect(-3, 20, 18, 8, 3)
    blaster.fillStyle(COLORS.tealLight, 1)
    blaster.fillRoundedRect(8, 22, 10, 4, 2)
    this.armFront.add(blaster)

    this.head = scene.add.container(0, -33)
    const headBack = scene.add.graphics()
    headBack.fillStyle(COLORS.hair, 1)
    headBack.fillCircle(-12, -2, 7)
    headBack.fillCircle(11, -4, 6)
    headBack.fillCircle(-7, -11, 7)
    headBack.fillCircle(4, -13, 8)
    headBack.fillStyle(COLORS.suit, 1)
    headBack.fillCircle(0, 0, 15)
    headBack.lineStyle(2.6, COLORS.outline, 1)
    headBack.strokeCircle(0, 0, 15)
    headBack.fillStyle(COLORS.cream, 1)
    headBack.fillEllipse(0, 4, 22, 17)
    headBack.lineStyle(1.4, 0xb68e68, 0.5)
    headBack.strokeEllipse(0, 4, 22, 17)
    headBack.fillStyle(COLORS.visor, 0.92)
    headBack.fillRoundedRect(-12, -9, 24, 10, 5)
    headBack.lineStyle(1.7, COLORS.outline, 0.8)
    headBack.strokeRoundedRect(-12, -9, 24, 10, 5)
    headBack.fillStyle(0xffffff, 0.72)
    headBack.fillRoundedRect(-9, -7, 7, 2.5, 1.2)
    headBack.fillStyle(COLORS.orange, 1)
    headBack.fillTriangle(-14, -10, -9, -16, -5, -10)
    headBack.lineStyle(1.5, COLORS.outline, 0.7)
    headBack.beginPath()
    headBack.moveTo(11, -13)
    headBack.lineTo(16, -22)
    headBack.strokePath()
    headBack.fillStyle(COLORS.gold, 1)
    headBack.fillCircle(16, -23, 3)
    this.head.add(headBack)

    this.eyeLeft = scene.add.ellipse(-5, 3, 3.2, 5, COLORS.outline, 1)
    this.eyeRight = scene.add.ellipse(5, 3, 3.2, 5, COLORS.outline, 1)
    this.head.add([this.eyeLeft, this.eyeRight])
    const cheeks = scene.add.graphics()
    cheeks.fillStyle(0xff9f9f, 0.32)
    cheeks.fillCircle(-8, 8, 3)
    cheeks.fillCircle(8, 8, 3)
    cheeks.lineStyle(1.4, 0x6b3c2a, 0.7)
    cheeks.beginPath()
    cheeks.arc(0, 8, 3.3, 0.15, Math.PI - 0.15)
    cheeks.strokePath()
    this.head.add(cheeks)
    this.rig.add(this.head)

    this.scarf = scene.add.graphics()
    this.scarf.fillStyle(COLORS.orange, 1)
    this.scarf.fillRoundedRect(-12, -22, 24, 6, 3)
    this.scarf.fillTriangle(9, -21, 25, -16, 12, -11)
    this.scarf.lineStyle(1.4, 0xb85817, 0.75)
    this.scarf.strokeTriangle(9, -21, 25, -16, 12, -11)
    this.rig.add(this.scarf)

    this.antialiasGlow = scene.add.ellipse(0, 2, 54, 66, 0x7ef5e5, 0)
    this.root.addAt(this.antialiasGlow, 1)

    this.setPosition(x, y)
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y)
  }

  setVisible(visible: boolean): void {
    this.root.setVisible(visible)
  }

  setDepth(depth: number): void {
    this.root.setDepth(depth)
  }

  shoot(): void {
    this.shootTimer = 0.18
  }

  dash(): void {
    this.dashTimer = 0.2
  }

  land(): void {
    this.landTimer = 0.16
  }

  hurt(): void {
    this.hurtTimer = 0.3
  }

  update(dt: number, state: PipVisualState): void {
    if (this.destroyed) return
    const delta = Math.min(dt, 0.05)
    this.breath += delta
    this.shootTimer = Math.max(0, this.shootTimer - delta)
    this.landTimer = Math.max(0, this.landTimer - delta)
    this.dashTimer = Math.max(0, this.dashTimer - delta)
    this.hurtTimer = Math.max(0, this.hurtTimer - delta)
    this.blinkIn -= delta
    if (this.blinkIn <= 0) {
      this.blink = 0.13
      this.blinkIn = 2.6 + Math.random() * 3.2
    }
    this.blink = Math.max(0, this.blink - delta)

    this.root.setScale(state.facing, 1)
    this.root.alpha = state.invulnerable ? (Math.sin(this.breath * 28) > 0 ? 0.38 : 1) : 1

    const speed = Math.abs(state.vx)
    const run = Math.min(1, speed / TUNING.runSpeed)
    if (state.grounded && speed > 8) {
      this.legPhase += delta * (7 + run * 9)
    } else {
      this.legPhase += delta * 2.2
    }

    const walk = Math.sin(this.legPhase)
    const opposite = Math.sin(this.legPhase + Math.PI)
    const bob = state.grounded && speed > 8 ? Math.abs(Math.sin(this.legPhase * 2)) * 2.2 * run : 0

    let lean = 0
    let legBackRot = walk * 0.48 * run
    let legFrontRot = opposite * 0.48 * run
    let armBackRot = opposite * 0.38 * run
    let armFrontRot = walk * 0.38 * run
    let squashY = 1
    let squashX = 1

    if (!state.grounded) {
      const rising = state.vy < 0
      legBackRot = rising ? -0.5 : 0.32
      legFrontRot = rising ? 0.62 : -0.18
      armBackRot = rising ? -1.8 : -0.45
      armFrontRot = rising ? -1.2 : 0.22
      lean = Math.max(-0.1, Math.min(0.1, state.vx / 4000))
    }
    if (state.springCharging) {
      squashY = 0.8
      squashX = 1.12
      legBackRot = -0.15
      legFrontRot = 0.15
    }
    if (state.crouching && state.grounded) {
      squashY = 0.78
      squashX = 1.12
      legBackRot = -0.2
      legFrontRot = 0.2
    }
    if (state.jetpack) {
      legBackRot = 0.48
      legFrontRot = 0.34
      armBackRot = -0.35
      armFrontRot = -0.4
      lean = 0.06
    }
    if (state.dashing || this.dashTimer > 0) {
      lean = 0.22
      legBackRot = 0.95
      legFrontRot = 0.55
      armBackRot = 0.7
      armFrontRot = 0.85
      squashX = 1.08
      squashY = 0.94
    }
    if (this.shootTimer > 0) armFrontRot = -1.35 + Math.min(0.3, (0.18 - this.shootTimer) * 1.8)
    if (state.celebrating) {
      armBackRot = -2.65
      armFrontRot = -2.4
      legBackRot = -0.28
      legFrontRot = 0.28
      this.root.y -= Math.sin(this.breath * 6) * 0.8
    }
    if (this.landTimer > 0) {
      const t = this.landTimer / 0.16
      squashY = 1 - t * 0.22
      squashX = 1 + t * 0.14
      legBackRot = 0.15
      legFrontRot = -0.15
    }
    if (this.hurtTimer > 0) {
      lean = -0.18
      armBackRot = -1.5
      armFrontRot = 1.1
    }

    this.legBack.rotation = legBackRot
    this.legFront.rotation = legFrontRot
    this.armBack.rotation = armBackRot
    this.armFront.rotation = armFrontRot

    const idleBreath = state.grounded ? Math.sin(this.breath * 2.6) * 0.012 : 0
    this.rig.y = -bob + (state.celebrating ? 0 : 0)
    this.rig.rotation = lean
    this.rig.scaleX = squashX
    this.rig.scaleY = squashY + idleBreath
    this.head.rotation = -lean * 0.25
    this.head.y = -33 + (state.grounded && speed > 8 ? Math.sin(this.legPhase * 2) * 0.8 : Math.sin(this.breath * 2.6) * 0.5)

    this.scarf.rotation = 0.06 + Math.sin(this.breath * 4.2) * 0.05 + (speed / TUNING.runSpeed) * 0.18
    this.scarf.scaleX = 1 + (speed / TUNING.runSpeed) * 0.18 + (state.jetpack ? 0.2 : 0)

    this.eyeLeft.scaleY = this.blink > 0 ? 0.12 : 1
    this.eyeRight.scaleY = this.blink > 0 ? 0.12 : 1

    this.jetpack.setVisible(state.jetpackUnlocked)
    this.flame.setVisible(state.jetpack && Math.random() > 0.08)
    if (this.flame.visible) {
      this.flame.scaleY = 0.7 + Math.random() * 0.5
      this.flame.alpha = 0.65 + Math.random() * 0.35
    }
    this.shadow.setScale(1 - Math.max(0, Math.min(0.35, Math.abs(state.vy) / 1400)), 1)
    this.shadow.alpha = 0.22
    this.antialiasGlow.setAlpha(0)
  }

  destroy(): void {
    this.destroyed = true
    this.root.destroy(true)
  }
}

export class BoltView {
  readonly root: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Container
  private eyeLeft: Phaser.GameObjects.Ellipse
  private eyeRight: Phaser.GameObjects.Ellipse
  private antenna: Phaser.GameObjects.Graphics
  private thruster: Phaser.GameObjects.Ellipse
  private pulse: number
  private destroyed = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.root = scene.add.container(x, y).setDepth(26)
    this.pulse = Math.random() * Math.PI * 2
    this.thruster = scene.add.ellipse(0, 17, 12, 18, 0x7ef5e5, 0.18)
    this.root.add(this.thruster)
    this.body = scene.add.container(0, 0)
    this.root.add(this.body)

    const shell = scene.add.graphics()
    shell.fillStyle(0xfff3d1, 1)
    shell.fillRoundedRect(-13, -11, 26, 22, 9)
    shell.lineStyle(2.3, 0x102338, 1)
    shell.strokeRoundedRect(-13, -11, 26, 22, 9)
    shell.fillStyle(0x2ec4b6, 1)
    shell.fillRoundedRect(-10, -8, 20, 10, 5)
    shell.fillStyle(0x102338, 1)
    shell.fillRoundedRect(-8, -7, 16, 8, 4)
    shell.fillStyle(0xffc857, 1)
    shell.fillRoundedRect(-10, 7, 5, 4, 2)
    shell.fillStyle(0x7b61ff, 1)
    shell.fillRoundedRect(5, 7, 5, 4, 2)
    this.body.add(shell)

    this.eyeLeft = scene.add.ellipse(-3.6, -3, 3.2, 4.2, 0x7ef5e5, 1)
    this.eyeRight = scene.add.ellipse(3.6, -3, 3.2, 4.2, 0x7ef5e5, 1)
    this.body.add([this.eyeLeft, this.eyeRight])

    this.antenna = scene.add.graphics()
    this.antenna.lineStyle(1.8, 0x102338, 1)
    this.antenna.beginPath()
    this.antenna.moveTo(0, -11)
    this.antenna.lineTo(2, -20)
    this.antenna.strokePath()
    this.antenna.fillStyle(0xff9f1c, 1)
    this.antenna.fillCircle(2, -21, 2.6)
    this.body.add(this.antenna)

    const fins = scene.add.graphics()
    fins.fillStyle(0x2ec4b6, 0.85)
    fins.fillTriangle(-13, -3, -21, 3, -13, 6)
    fins.fillTriangle(13, -3, 21, 3, 13, 6)
    this.body.add(fins)
  }

  update(dt: number, targetX: number, targetY: number, facing: -1 | 1): void {
    if (this.destroyed) return
    const delta = Math.min(dt, 0.05)
    this.pulse += delta
    const desiredX = targetX - facing * 48
    const desiredY = targetY - 52 + Math.sin(this.pulse * 2.1) * 7
    this.root.x += (desiredX - this.root.x) * Math.min(1, delta * 4.6)
    this.root.y += (desiredY - this.root.y) * Math.min(1, delta * 4.2)
    this.root.scaleX = facing
    this.body.rotation = Math.sin(this.pulse * 1.6) * 0.08
    this.antenna.rotation = Math.sin(this.pulse * 2.4) * 0.14
    this.eyeLeft.x = -3.6 + facing * 0.8
    this.eyeRight.x = 3.6 + facing * 0.8
    this.thruster.scaleY = 0.65 + Math.sin(this.pulse * 9) * 0.22
    this.thruster.alpha = 0.12 + Math.sin(this.pulse * 8) * 0.05
  }

  setPosition(x: number, y: number): void {
    this.root.setPosition(x, y)
  }

  destroy(): void {
    this.destroyed = true
    this.root.destroy(true)
  }
}
