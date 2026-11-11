import Phaser from 'phaser'
import type { Action, Bindings } from './actions'
import { keyLabel } from './actions'
import { isTouchDevice } from './orientation'

export type InputDevice = 'keyboard' | 'mouse' | 'gamepad' | 'touch'

export interface Aim {
  x: number
  y: number
}

const MOUSE_CODES = new Set(['MouseLeft', 'MouseRight'])
const GAMEPAD_BUTTONS: Partial<Record<Action, number[]>> = {
  jump: [0],
  dash: [1],
  fire: [2],
  gadget: [3],
  prev: [4],
  next: [5],
  pause: [9],
  map: [8],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  interact: [3],
}

const DEVICE_LABELS: Record<Action, string> = {
  left: '←',
  right: '→',
  up: '↑',
  down: '↓',
  jump: 'A',
  fire: 'X',
  gadget: 'Y',
  dash: 'B',
  interact: 'Y',
  next: 'RB',
  prev: 'LB',
  pause: 'START',
  map: 'VIEW',
}

const TOUCH_LABELS: Record<Action, string> = {
  left: 'LEFT',
  right: 'RIGHT',
  up: 'UP',
  down: 'DOWN',
  jump: 'JUMP',
  fire: 'FIRE',
  gadget: 'GADGET',
  dash: 'DASH',
  interact: 'TAP',
  next: 'NEXT',
  prev: 'PREV',
  pause: 'PAUSE',
  map: 'MAP',
}

export class InputManager {
  readonly events = new Phaser.Events.EventEmitter()
  readonly touchDevice = isTouchDevice()

  private scene: Phaser.Scene
  private bindings: Bindings
  private keyboardCodes = new Set<string>()
  private touchDown = new Set<Action>()
  private gamepadDown = new Set<Action>()
  private gamepadPrevious = new Set<Action>()
  private mouseDown = false
  private pressed = new Set<Action>()
  private released = new Set<Action>()
  private rebind: ((code: string | null) => void) | null = null
  private pointerX = 0
  private pointerY = 0
  private pointerMoved = false
  private gamepadId: string | null = null
  private gamepadAxisX = 0
  private gamepadAxisY = 0
  private gamepadAimX = 0
  private gamepadAimY = 0
  private navHold = 0
  private navY = 0
  private navAt = 0
  private touchAxis = 0
  private touchAxisY = 0
  private currentDevice: InputDevice = 'keyboard'
  private destroyed = false

  constructor(scene: Phaser.Scene, bindings: Bindings) {
    this.scene = scene
    this.bindings = bindings
    this.attach()
    if (this.touchDevice) this.currentDevice = 'touch'
  }

  private attach(): void {
    const keyboard = this.scene.input.keyboard
    keyboard?.on('keydown', this.onKeyDown)
    keyboard?.on('keyup', this.onKeyUp)
    const capture = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Space',
      'Tab',
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyJ',
      'KeyK',
      'KeyL',
      'KeyQ',
      'KeyE',
      'KeyM',
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
    ]
    keyboard?.addCapture(capture)

    this.scene.input.on('pointerdown', this.onPointerDown)
    this.scene.input.on('pointerup', this.onPointerUp)
    this.scene.input.on('pointermove', this.onPointerMove)
    this.scene.game.canvas.addEventListener('contextmenu', this.onContextMenu)
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this)
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this)
  }

  private onContextMenu = (event: Event): void => {
    event.preventDefault()
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.rebind) {
      const callback = this.rebind
      this.rebind = null
      event.preventDefault()
      event.stopPropagation()
      callback(event.code === 'Escape' ? null : event.code)
      return
    }
    if (event.repeat) return
    const mapped = this.actionsForCode(event.code)
    if (mapped.length === 0) return
    if (
      event.code === 'Tab' ||
      event.code === 'Space' ||
      event.code.startsWith('Arrow') ||
      event.code.startsWith('Control') ||
      event.code.startsWith('Alt')
    ) {
      event.preventDefault()
    }
    const wasDown = new Set<Action>()
    for (const action of mapped) {
      if (this.isDown(action)) wasDown.add(action)
      this.keyboardCodes.add(event.code)
      if (!wasDown.has(action)) this.addPressed(action)
    }
    this.markDevice('keyboard')
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.keyboardCodes.has(event.code)) return
    this.keyboardCodes.delete(event.code)
    for (const action of this.actionsForCode(event.code)) {
      if (!this.isDown(action)) this.addReleased(action)
    }
  }

  private actionsForCode(code: string): Action[] {
    const found: Action[] = []
    for (const [action, codes] of Object.entries(this.bindings) as [Action, string[]][]) {
      if (codes.includes(code)) found.push(action)
    }
    return found
  }

  private onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.pointerX = pointer.x
    this.pointerY = pointer.y
    this.pointerMoved = true
    if (this.touchDevice) {
      this.markDevice('touch')
      return
    }
    if (pointer.leftButtonDown()) {
      this.mouseDown = true
      this.addPressed('fire')
      this.markDevice('mouse')
    }
    if (pointer.rightButtonDown()) {
      this.addPressed('gadget')
      this.markDevice('mouse')
    }
  }

  private onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.touchDevice) return
    if (!pointer.leftButtonDown()) {
      this.mouseDown = false
      this.addReleased('fire')
    }
  }

  private onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    this.pointerX = pointer.x
    this.pointerY = pointer.y
    this.pointerMoved = true
    if (!this.touchDevice && pointer.isDown) this.markDevice('mouse')
  }

  update(): void {
    if (this.destroyed) return
    this.pollGamepad()
  }

  postUpdate(): void {
    this.pressed.clear()
    this.released.clear()
    this.navHold = Math.max(0, this.navHold - this.scene.game.loop.delta)
  }

  private pollGamepad(): void {
    const plugin = this.scene.input.gamepad
    const pads = plugin?.gamepads
    const pad = pads?.find((candidate) => candidate.connected) ?? plugin?.getPad(0)
    if (!pad || !pad.connected) {
      if (this.gamepadId !== null) {
        const oldId = this.gamepadId
        this.gamepadId = null
        this.gamepadDown.clear()
        this.gamepadPrevious.clear()
        this.gamepadAxisX = 0
        this.gamepadAxisY = 0
        this.gamepadAimX = 0
        this.gamepadAimY = 0
        this.events.emit('gamepad-disconnected', oldId)
      }
      return
    }

    const id = pad.id || `Controller ${pad.index + 1}`
    if (this.gamepadId !== id) {
      this.gamepadId = id
      this.events.emit('gamepad-connected', id)
    }

    const deadzone = 0.18
    const axisX = pad.axes[0]?.getValue() ?? 0
    const axisY = pad.axes[1]?.getValue() ?? 0
    this.gamepadAxisX = Math.abs(axisX) > deadzone ? axisX : 0
    this.gamepadAxisY = Math.abs(axisY) > deadzone ? axisY : 0
    const aimX = pad.axes[2]?.getValue() ?? 0
    const aimY = pad.axes[3]?.getValue() ?? 0
    const aimLength = Math.hypot(aimX, aimY)
    this.gamepadAimX = aimLength > 0.28 ? aimX : 0
    this.gamepadAimY = aimLength > 0.28 ? aimY : 0

    const next = new Set<Action>()
    for (const [action, buttons] of Object.entries(GAMEPAD_BUTTONS) as [Action, number[]][]) {
      if (buttons.some((index) => pad.buttons[index]?.pressed)) next.add(action)
    }
    const rightTrigger = pad.buttons[7]?.value ?? 0
    if (rightTrigger > 0.42) next.add('fire')

    for (const action of next) {
      if (!this.gamepadPrevious.has(action)) {
        this.addPressed(action)
        this.markDevice('gamepad')
      }
    }
    for (const action of this.gamepadPrevious) {
      if (!next.has(action)) this.addReleased(action)
    }
    this.gamepadDown = next
    this.gamepadPrevious = new Set(next)

    // Analog stick menu navigation: one step on entry, then a slow repeat.
    const dpadY = pad.buttons[13]?.pressed ? 1 : pad.buttons[12]?.pressed ? -1 : 0
    const stickY = Math.abs(axisY) > 0.55 ? Math.sign(axisY) : 0
    const y = dpadY || stickY
    const now = this.scene.time.now
    if (y !== 0) {
      if (y !== this.navY || now - this.navAt > (this.navHold > 240 ? 145 : 300)) {
        this.addPressed(y > 0 ? 'down' : 'up')
        this.navAt = now
        this.navY = y
        this.markDevice('gamepad')
      }
      this.navHold += this.scene.game.loop.delta
    } else {
      this.navY = 0
      this.navHold = 0
    }

    if (next.size > 0 || Math.abs(this.gamepadAxisX) > 0 || Math.abs(this.gamepadAxisY) > 0) {
      this.markDevice('gamepad')
    }
  }

  private markDevice(device: InputDevice): void {
    if (device === 'touch' && !this.touchDevice) return
    if (this.currentDevice === device) return
    this.currentDevice = device
    this.events.emit('device-changed', device)
  }

  get lastDevice(): InputDevice {
    return this.currentDevice
  }

  get hasGamepad(): boolean {
    return this.gamepadId !== null
  }

  get gamepadName(): string {
    return this.gamepadId ?? ''
  }

  setTouchAxis(x: number, y = 0): void {
    this.touchAxis = Math.max(-1, Math.min(1, x))
    this.touchAxisY = Math.max(-1, Math.min(1, y))
    if (Math.abs(x) > 0.08 || Math.abs(y) > 0.08) this.markDevice('touch')
  }

  setTouchButton(action: Action, down: boolean): void {
    if (down) {
      if (!this.touchDown.has(action)) {
        this.touchDown.add(action)
        this.addPressed(action)
        this.markDevice('touch')
      }
    } else {
      if (this.touchDown.has(action)) {
        this.touchDown.delete(action)
        this.addReleased(action)
      }
    }
  }

  clearTouch(): void {
    for (const action of [...this.touchDown]) {
      this.touchDown.delete(action)
      this.addReleased(action)
    }
    this.touchAxis = 0
    this.touchAxisY = 0
  }

  axisX(): number {
    const left = this.isDown('left')
    const right = this.isDown('right')
    const keyboard = right ? 1 : left ? -1 : 0
    if (keyboard !== 0) return keyboard
    if (Math.abs(this.touchAxis) > 0.06) return this.touchAxis
    if (Math.abs(this.gamepadAxisX) > 0.04) {
      return Math.sign(this.gamepadAxisX) * Math.min(1, Math.abs(this.gamepadAxisX) * 1.06)
    }
    return 0
  }

  axisY(): number {
    if (Math.abs(this.touchAxisY) > 0.06) return this.touchAxisY
    if (Math.abs(this.gamepadAxisY) > 0.04) return this.gamepadAxisY
    return 0
  }

  isDown(action: Action): boolean {
    if (this.touchDown.has(action) || this.gamepadDown.has(action)) return true
    if (action === 'fire' && this.mouseDown) return true
    const codes = this.bindings[action]
    return codes?.some((code) => this.keyboardCodes.has(code)) ?? false
  }

  justPressed(action: Action): boolean {
    return this.pressed.has(action)
  }

  justReleased(action: Action): boolean {
    return this.released.has(action)
  }

  private addPressed(action: Action): void {
    this.pressed.add(action)
  }

  private addReleased(action: Action): void {
    this.released.add(action)
  }

  /** Convert the active pointer or right stick into a world-space aim vector. */
  aim(playerX: number, playerY: number, facing: -1 | 1): Aim {
    if (
      this.currentDevice === 'gamepad' &&
      (Math.abs(this.gamepadAimX) > 0 || Math.abs(this.gamepadAimY) > 0)
    ) {
      const length = Math.hypot(this.gamepadAimX, this.gamepadAimY) || 1
      return { x: this.gamepadAimX / length, y: this.gamepadAimY / length }
    }
    // Keyboard fire follows Pip's facing. Mouse aiming is only active after
    // the player has actually used the mouse, so a menu click cannot leave a
    // stale cursor direction controlling keyboard fire for the whole level.
    if (this.currentDevice === 'mouse' && this.pointerMoved) {
      const camera = this.scene.cameras.main
      const world = camera.getWorldPoint(this.pointerX, this.pointerY)
      const dx = world.x - playerX
      const dy = world.y - playerY
      const length = Math.hypot(dx, dy)
      if (length > 8) return { x: dx / length, y: dy / length }
    }
    const vertical = this.isDown('up') ? -1 : this.isDown('down') ? 1 : 0
    if (vertical !== 0 && !this.isDown('left') && !this.isDown('right')) {
      return { x: 0, y: vertical }
    }
    const length = Math.hypot(facing, vertical)
    return { x: facing / length, y: vertical / length }
  }

  prompt(action: Action): string {
    if (this.currentDevice === 'gamepad') return DEVICE_LABELS[action]
    if (this.currentDevice === 'touch') return TOUCH_LABELS[action]
    return keyLabel(this.bindings[action][0] ?? '')
  }

  beginRebind(action: Action, callback: (code: string | null) => void): void {
    void action
    this.rebind = callback
  }

  cancelRebind(): void {
    this.rebind = null
  }

  updateBindings(bindings: Bindings): void {
    this.bindings = bindings
  }

  destroy = (): void => {
    if (this.destroyed) return
    this.destroyed = true
    const keyboard = this.scene.input.keyboard
    keyboard?.off('keydown', this.onKeyDown)
    keyboard?.off('keyup', this.onKeyUp)
    this.scene.input.off('pointerdown', this.onPointerDown)
    this.scene.input.off('pointerup', this.onPointerUp)
    this.scene.input.off('pointermove', this.onPointerMove)
    this.scene.game.canvas.removeEventListener('contextmenu', this.onContextMenu)
    this.events.removeAllListeners()
    this.clearTouch()
    this.keyboardCodes.clear()
    this.mouseDown = false
  }
}

export { MOUSE_CODES }
