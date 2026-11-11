import Phaser from 'phaser'
import { CSS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config'
import type { InputManager } from '../input/InputManager'
import type { Settings } from '../core/save'
import type { Action } from '../input/actions'

interface TouchButton {
  action: Action
  x: number
  y: number
  radius: number
  label: string
  glyph: string
  color: number
  pointerId: number | null
  graphics: Phaser.GameObjects.Graphics
  text: Phaser.GameObjects.Text
  glyphText: Phaser.GameObjects.Text
  hit: Phaser.GameObjects.Arc
}

export class TouchControls {
  private scene: Phaser.Scene
  private input: InputManager
  private settings: Settings
  private container: Phaser.GameObjects.Container
  private base: Phaser.GameObjects.Graphics
  private knob: Phaser.GameObjects.Graphics
  private buttons: TouchButton[] = []
  private visible = false
  private enabled = true
  private joyPointer: number | null = null
  private joyBaseX = 154
  private joyBaseY = 556
  private joyRadius = 72
  private lastTouchAt = 0

  constructor(scene: Phaser.Scene, input: InputManager, settings: Settings) {
    this.scene = scene
    this.input = input
    this.settings = settings
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(900).setVisible(false)
    this.base = scene.add.graphics()
    this.knob = scene.add.graphics()
    this.container.add([this.base, this.knob])
    this.buildButtons()
    this.layout()
    // Use DOM pointer events for the virtual pad. They use the canvas rect
    // directly, avoiding the horizontal offset Phaser can apply to touch input
    // when an auto-centred canvas sits inside an iframe.
    const canvas = scene.game.canvas
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
  }

  private buildButtons(): void {
    const definitions: Array<{
      action: Action
      glyph: string
      label: string
      color: number
    }> = [
      { action: 'jump', glyph: '↑', label: 'JUMP', color: 0x2ec4b6 },
      { action: 'fire', glyph: '✦', label: 'FIRE', color: 0xff9f1c },
      { action: 'gadget', glyph: '◆', label: 'GADGET', color: 0x7b61ff },
      { action: 'dash', glyph: '»', label: 'DASH', color: 0xff5db1 },
    ]
    definitions.forEach((definition) => {
      const graphics = this.scene.add.graphics()
      const text = this.scene.add
        .text(0, 0, definition.label, {
          fontFamily: FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: CSS.cream,
        })
        .setOrigin(0.5)
      const glyphText = this.scene.add
        .text(0, 0, definition.glyph, {
          fontFamily: FONT,
          fontSize: '26px',
          fontStyle: 'bold',
          color: CSS.white,
        })
        .setOrigin(0.5)
      const hit = this.scene.add.circle(0, 0, 46, 0xffffff, 0.001)
      this.container.add([graphics, glyphText, text, hit])
      const button: TouchButton = {
        ...definition,
        x: 0,
        y: 0,
        radius: 46,
        pointerId: null,
        graphics,
        text,
        glyphText,
        hit,
      }
      this.buttons.push(button)
    })
  }

  private layout(): void {
    const scale = this.settings.touchScale
    const leftHanded = this.settings.leftHanded
    const joystickX = leftHanded ? GAME_WIDTH - 152 : 152
    this.joyBaseX = joystickX
    this.joyBaseY = 556
    this.joyRadius = 68 * scale
    const buttonBaseX = leftHanded ? 172 : GAME_WIDTH - 172
    const buttonBaseY = 548
    const positions: Array<[number, number, number]> = [
      [buttonBaseX, buttonBaseY + 18, 48 * scale],
      [buttonBaseX - 102 * scale, buttonBaseY - 6, 40 * scale],
      [buttonBaseX + 20 * scale, buttonBaseY - 94 * scale, 38 * scale],
      [buttonBaseX - 86 * scale, buttonBaseY - 104 * scale, 36 * scale],
    ]
    this.buttons.forEach((button, index) => {
      const [x, y, radius] = positions[index]
      button.x = x
      button.y = y
      button.radius = radius
      button.hit.setPosition(x, y).setRadius(radius)
      button.glyphText.setPosition(x, y - 5)
      button.text.setPosition(x, y + radius * 0.62)
      this.paintButton(button, false)
    })
    this.paintJoystick(0, 0)
  }

  private paintButton(button: TouchButton, pressed: boolean): void {
    const g = button.graphics
    const scale = this.settings.touchScale
    const r = button.radius
    g.clear()
    g.fillStyle(0x071326, this.settings.touchOpacity * 0.6)
    g.fillCircle(button.x, button.y, r + 4)
    g.fillStyle(button.color, pressed ? 0.65 : this.settings.touchOpacity * 0.36)
    g.fillCircle(button.x, button.y, r)
    g.lineStyle(pressed ? 3 : 2, button.color, pressed ? 1 : 0.7)
    g.strokeCircle(button.x, button.y, r)
    g.lineStyle(1, 0xffffff, 0.16)
    g.strokeCircle(button.x, button.y, r - 7)
    button.hit.setRadius(r)
    button.hit.setFillStyle(0xffffff, 0.001)
    button.glyphText.setScale(scale)
    button.text.setScale(scale)
    button.text.setAlpha(pressed ? 1 : 0.85)
  }

  private paintJoystick(dx: number, dy: number): void {
    const g = this.base
    const knob = this.knob
    const scale = this.settings.touchScale
    const x = this.joyBaseX
    const y = this.joyBaseY
    const r = this.joyRadius
    g.clear()
    g.fillStyle(0x071326, this.settings.touchOpacity * 0.42)
    g.fillCircle(x, y, r + 10)
    g.lineStyle(2, 0x7ef5e5, 0.3 * this.settings.touchOpacity + 0.1)
    g.strokeCircle(x, y, r + 4)
    g.lineStyle(1, 0xffffff, 0.12)
    g.strokeCircle(x, y, r * 0.55)
    knob.clear()
    knob.fillStyle(0x2ec4b6, this.settings.touchOpacity * 0.58)
    knob.fillCircle(x + dx, y + dy, 29 * scale)
    knob.lineStyle(2, 0x7ef5e5, 0.72)
    knob.strokeCircle(x + dx, y + dy, 29 * scale)
    knob.fillStyle(0xffffff, 0.28)
    knob.fillCircle(x + dx - 7, y + dy - 8, 6 * scale)
  }

  private buttonAt(x: number, y: number): TouchButton | null {
    for (const button of this.buttons) {
      if (Phaser.Math.Distance.Between(x, y, button.x, button.y) <= button.radius + 10) return button
    }
    return null
  }

  private pointerAt(event: PointerEvent): { x: number; y: number } {
    const rect = this.scene.game.canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * GAME_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * GAME_HEIGHT,
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (!this.visible || !this.enabled) return
    this.lastTouchAt = this.scene.time.now
    const pointer = this.pointerAt(event)
    const button = this.buttonAt(pointer.x, pointer.y)
    if (button) {
      button.pointerId = event.pointerId
      this.input.setTouchButton(button.action, true)
      this.paintButton(button, true)
      return
    }
    if (pointer.x < GAME_WIDTH * 0.46 && pointer.y > GAME_HEIGHT * 0.45 && this.joyPointer === null) {
      this.joyPointer = event.pointerId
      this.joyBaseX = pointer.x
      this.joyBaseY = pointer.y
      this.paintJoystick(0, 0)
      this.input.setTouchAxis(0, 0)
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.visible || this.joyPointer !== event.pointerId) return
    const pointer = this.pointerAt(event)
    const dx = Phaser.Math.Clamp(pointer.x - this.joyBaseX, -this.joyRadius, this.joyRadius)
    const dy = Phaser.Math.Clamp(pointer.y - this.joyBaseY, -this.joyRadius, this.joyRadius)
    this.paintJoystick(dx, dy)
    this.input.setTouchAxis(dx / this.joyRadius, dy / this.joyRadius)
  }

  private onPointerUp = (event: PointerEvent): void => {
    if (this.joyPointer === event.pointerId) {
      this.joyPointer = null
      this.joyBaseX = this.settings.leftHanded ? GAME_WIDTH - 152 : 152
      this.joyBaseY = 556
      this.paintJoystick(0, 0)
      this.input.setTouchAxis(0, 0)
    }
    for (const button of this.buttons) {
      if (button.pointerId === event.pointerId) {
        button.pointerId = null
        this.input.setTouchButton(button.action, false)
        this.paintButton(button, false)
      }
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible && this.enabled
    this.container.setVisible(this.visible)
    if (!this.visible) {
      this.joyPointer = null
      this.input.clearTouch()
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.setVisible(false)
  }

  get isVisible(): boolean {
    return this.visible
  }

  get lastInteraction(): number {
    return this.lastTouchAt
  }

  setSettings(settings: Settings): void {
    this.settings = settings
    this.layout()
  }

  destroy(): void {
    const canvas = this.scene.game.canvas
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    this.container.destroy(true)
  }
}
