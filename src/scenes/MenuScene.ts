import Phaser from 'phaser'
import { CSS, DISPLAY_FONT, FONT, GAME_HEIGHT, GAME_WIDTH, VERSION } from '../config'
import { audio } from '../audio/AudioEngine'
import { ACHIEVEMENTS } from '../core/achievements'
import {
  completedLevels,
  defaultSave,
  loadSave,
  totalStars,
  updateSettings,
  writeSave,
  type SaveData,
} from '../core/save'
import { ACTIONS, LABELS, primaryLabel, type Action } from '../input/actions'
import { InputManager } from '../input/InputManager'
import { orientation } from '../input/orientation'
import { Parallax } from '../world/Parallax'
import { platformTexture } from '../art/Textures'
import { PipView, BoltView } from '../player/PipView'
import { MenuList, type MenuItem } from '../ui/MenuList'

type Mode = 'main' | 'help' | 'settings' | 'controls' | 'log'

const REBIND_ACTIONS: Action[] = ['left', 'right', 'jump', 'fire', 'gadget', 'dash', 'pause', 'map']

export class MenuScene extends Phaser.Scene {
  private inputManager!: InputManager
  private save: SaveData = defaultSave()
  private parallax!: Parallax
  private pip!: PipView
  private bolt!: BoltView
  private list: MenuList | null = null
  private mode: Mode = 'main'
  private titleText!: Phaser.GameObjects.Text
  private subtitleText!: Phaser.GameObjects.Text
  private infoText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private backButton!: Phaser.GameObjects.Container
  private noticeText!: Phaser.GameObjects.Text
  private timeAlive = 0
  private transitioned = false
  private rebinding = false

  constructor() {
    super('Menu')
  }

  create(): void {
    this.save = loadSave()
    this.mode = 'main'
    this.transitioned = false
    this.rebinding = false
    this.inputManager = new InputManager(this, this.save.settings.bindings)
    audio.setSettings(this.save.settings)
    audio.setMood('menu')

    this.parallax = new Parallax(this, {
      autoSpeed: 0.22,
      quality: this.save.settings.quality,
      reducedMotion: !this.save.settings.screenShake,
    })

    const stage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 62, platformTexture(this, 1520, 128, 'grass')).setDepth(2)
    stage.setDisplaySize(1520, 128)
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT - 164, 'glow')
      .setScale(7, 2.2)
      .setTint(0xffc857)
      .setAlpha(0.11)
      .setDepth(1)

    this.pip = new PipView(this, 258, GAME_HEIGHT - 160)
    this.bolt = new BoltView(this, 344, GAME_HEIGHT - 240)
    this.add
      .image(235, GAME_HEIGHT - 150, 'spark')
      .setScale(0.7)
      .setTint(0x7ef5e5)
      .setAlpha(0.35)

    this.buildLogo()
    this.buildFooter()
    this.buildBackButton()
    this.setMode('main')

    this.inputManager.events.on('gamepad-connected', (name: string) => {
      this.showNotice(`CONTROLLER CONNECTED — ${name}`)
    })
    this.inputManager.events.on('gamepad-disconnected', () => {
      this.showNotice('CONTROLLER DISCONNECTED — KEYBOARD READY')
    })
    this.inputManager.events.on('device-changed', () => this.refreshHints())
    this.refreshHints()

    this.cameras.main.fadeIn(420, 7, 19, 38)
    window.addEventListener('gg-orientation', this.onOrientation as EventListener)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('gg-orientation', this.onOrientation as EventListener)
      this.inputManager.destroy()
      this.list?.destroy()
      this.parallax.destroy()
      this.pip.destroy()
      this.bolt.destroy()
    })
  }

  private buildLogo(): void {
    const x = 70
    const y = 86
    const emblem = this.add
      .image(x + 23, y + 5, 'fragment')
      .setScale(0.58)
      .setOrigin(0.5)
    this.tweens.add({ targets: emblem, y: y + 1, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.inOut' })

    this.add
      .text(x + 58, y - 18, 'GALACTIC', {
        fontFamily: DISPLAY_FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 8,
      })
      .setResolution(2)
    this.add
      .text(x, y + 8, 'GADGETEER', {
        fontFamily: DISPLAY_FONT,
        fontSize: '68px',
        fontStyle: 'bold',
        color: CSS.cream,
        stroke: '#071326',
        strokeThickness: 10,
        letterSpacing: 1,
        shadow: { color: '#000000', blur: 18, fill: true, offsetX: 0, offsetY: 8 },
      })
      .setResolution(2)
    this.add
      .text(x + 4, y + 88, 'THE LOST WORLDS ADVENTURE', {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: CSS.gold,
        letterSpacing: 4,
      })
      .setResolution(2)
    this.add
      .text(x + 4, y + 116, 'Explore strange worlds. Discover incredible gadgets. Save the galaxy.', {
        fontFamily: FONT,
        fontSize: '13px',
        color: CSS.muted,
      })
      .setResolution(2)

    this.titleText = this.add
      .text(742, 300, '', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS.tealLight,
        letterSpacing: 2,
      })
      .setResolution(2)
    this.subtitleText = this.add
      .text(742, 320, '', {
        fontFamily: FONT,
        fontSize: '13px',
        color: CSS.muted,
        wordWrap: { width: 440 },
        lineSpacing: 4,
      })
      .setResolution(2)

    this.infoText = this.add
      .text(742, 352, '', {
        fontFamily: FONT,
        fontSize: '14px',
        color: CSS.cream,
        wordWrap: { width: 448 },
        lineSpacing: 7,
      })
      .setResolution(2)
      .setVisible(false)
  }

  private buildFooter(): void {
    this.add
      .text(70, GAME_HEIGHT - 42, `A LITTLE JOY ARCADE EXPEDITION   ·   v${VERSION}`, {
        fontFamily: FONT,
        fontSize: '10px',
        color: CSS.muted,
        letterSpacing: 1.5,
      })
      .setResolution(2)
    this.hintText = this.add
      .text(GAME_WIDTH - 58, GAME_HEIGHT - 42, '', {
        fontFamily: FONT,
        fontSize: '11px',
        color: CSS.muted,
      })
      .setOrigin(1, 0)
      .setResolution(2)
    this.noticeText = this.add
      .text(GAME_WIDTH / 2, 38, '', {
        fontFamily: FONT,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS.cream,
        backgroundColor: 'rgba(7,19,38,0.8)',
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setResolution(2)
      .setAlpha(0)
      .setDepth(1500)
  }

  private buildBackButton(): void {
    this.backButton = this.add.container(GAME_WIDTH - 74, GAME_HEIGHT - 72).setDepth(1300).setVisible(false)
    const bg = this.add.graphics()
    bg.fillStyle(0x071326, 0.76)
    bg.fillRoundedRect(-54, -18, 116, 36, 18)
    bg.lineStyle(1, 0x7ef5e5, 0.4)
    bg.strokeRoundedRect(-54, -18, 116, 36, 18)
    const text = this.add
      .text(4, 0, 'BACK  ESC', {
        fontFamily: FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color: CSS.cream,
        letterSpacing: 1.2,
      })
      .setOrigin(0.5)
      .setResolution(2)
    const hit = this.add.circle(4, 0, 56, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
    hit.on('pointerdown', () => this.setMode('main'))
    this.backButton.add([bg, text, hit])
  }

  private setMode(mode: Mode): void {
    this.mode = mode
    this.list?.destroy()
    this.list = null
    this.titleText.setVisible(mode !== 'main')
    this.subtitleText.setVisible(mode !== 'main')
    this.infoText.setVisible(mode === 'help' || mode === 'log')
    this.backButton.setVisible(mode !== 'main')
    this.subtitleText.setText('')

    if (mode === 'main') {
      this.titleText.setVisible(false)
      this.list = new MenuList(this, this.inputManager, 742, 324, 446, this.mainItems(), {
        rowHeight: 52,
        gap: 8,
      })
      return
    }

    if (mode === 'help') {
      this.titleText.setText('HOW TO PLAY')
      this.subtitleText.setText('A quick field briefing from BOLT.')
      this.infoText.setText(this.helpCopy())
      this.list = new MenuList(this, this.inputManager, 742, 532, 446, [
        {
          label: 'START THE EXPEDITION',
          accent: CSS.gold,
          onSelect: () => this.startGame(),
        },
      ], { rowHeight: 46 })
      return
    }

    if (mode === 'settings') {
      this.titleText.setText('SETTINGS')
      this.subtitleText.setText('Audio, visual effects and touch controls.')
      this.list = new MenuList(this, this.inputManager, 742, 338, 446, this.settingsItems(), {
        rowHeight: 38,
        gap: 3,
      })
      return
    }

    if (mode === 'controls') {
      this.titleText.setText('CONTROLS')
      this.subtitleText.setText('Choose an action, then press a new key. Standard-mapped controllers use the fixed layout below.')
      this.infoText.setVisible(false)
      this.list = new MenuList(this, this.inputManager, 742, 356, 446, this.controlItems(), {
        rowHeight: 31,
        gap: 2,
      })
      const gamepad = this.add
        .text(742, GAME_HEIGHT - 96, 'GAMEPAD  ·  STICK MOVE  ·  A JUMP  ·  X FIRE  ·  Y GADGET  ·  B DASH  ·  START PAUSE', {
          fontFamily: FONT,
          fontSize: '10px',
          color: CSS.muted,
          wordWrap: { width: 446 },
        })
        .setResolution(2)
      this.list.addGameObject(gamepad)
      return
    }

    this.titleText.setText('EXPEDITION LOG')
    this.subtitleText.setText('Everything the meadow remembers.')
    this.infoText.setText(this.logCopy())
    this.list = new MenuList(this, this.inputManager, 742, 548, 446, [
      {
        label: 'BACK TO MENU',
        onSelect: () => this.setMode('main'),
      },
    ], { rowHeight: 42 })
  }

  private mainItems(): MenuItem[] {
    const hasProgress = completedLevels(this.save) > 0
    return [
      {
        label: hasProgress ? 'CONTINUE EXPEDITION' : 'START EXPEDITION',
        detail: 'World 1 · Starlight Meadows · The Fallen Beacon',
        accent: CSS.gold,
        onSelect: () => this.startGame(),
      },
      {
        label: 'HOW TO PLAY',
        detail: 'Movement, gadgets and the secrets of Starlight Meadows',
        onSelect: () => this.setMode('help'),
      },
      {
        label: 'SETTINGS',
        detail: 'Audio, effects, quality and touch controls',
        onSelect: () => this.setMode('settings'),
      },
      {
        label: 'CONTROLS',
        detail: 'Keyboard remapping and controller layout',
        onSelect: () => this.setMode('controls'),
      },
      {
        label: 'EXPEDITION LOG',
        detail: `${totalStars(this.save)} ★   ·   ${this.save.shards} shards   ·   ${this.save.achievements.length}/${ACHIEVEMENTS.length} achievements`,
        onSelect: () => this.setMode('log'),
      },
    ]
  }

  private settingsItems(): MenuItem[] {
    const read = (): SaveData['settings'] => this.save.settings
    const apply = (patch: Parameters<typeof updateSettings>[1]): void => {
      this.save = updateSettings(this.save, patch)
      audio.setSettings(this.save.settings)
      this.inputManager.updateBindings(this.save.settings.bindings)
      this.list?.refresh()
    }
    return [
      {
        label: 'MASTER VOLUME',
        value: () => `${Math.round(read().masterVolume * 100)}%`,
        onAdjust: (dir) => apply({ masterVolume: Math.round((read().masterVolume + dir * 0.1) * 10) / 10 }),
      },
      {
        label: 'MUSIC VOLUME',
        value: () => `${Math.round(read().musicVolume * 100)}%`,
        onAdjust: (dir) => apply({ musicVolume: Math.round((read().musicVolume + dir * 0.1) * 10) / 10 }),
      },
      {
        label: 'EFFECTS VOLUME',
        value: () => `${Math.round(read().sfxVolume * 100)}%`,
        onAdjust: (dir) => apply({ sfxVolume: Math.round((read().sfxVolume + dir * 0.1) * 10) / 10 }),
      },
      {
        label: 'SCREEN SHAKE',
        value: () => (read().screenShake ? 'ON' : 'OFF'),
        onSelect: () => apply({ screenShake: !read().screenShake }),
        onAdjust: () => apply({ screenShake: !read().screenShake }),
      },
      {
        label: 'VISUAL QUALITY',
        value: () => read().quality.toUpperCase(),
        onSelect: () =>
          apply({
            quality: read().quality === 'high' ? 'medium' : read().quality === 'medium' ? 'low' : 'high',
          }),
        onAdjust: (dir) =>
          apply({
            quality:
              dir > 0
                ? read().quality === 'low'
                  ? 'medium'
                  : 'high'
                : read().quality === 'high'
                  ? 'medium'
                  : 'low',
          }),
      },
      {
        label: 'TOUCH CONTROLS',
        value: () => (read().touchControls ? 'ON' : 'OFF'),
        onSelect: () => apply({ touchControls: !read().touchControls }),
        onAdjust: () => apply({ touchControls: !read().touchControls }),
      },
      {
        label: 'TOUCH SIZE',
        value: () => `${Math.round(read().touchScale * 100)}%`,
        onAdjust: (dir) =>
          apply({ touchScale: Math.round((read().touchScale + dir * 0.1) * 10) / 10 }),
      },
      {
        label: 'LEFT-HANDED TOUCH',
        value: () => (read().leftHanded ? 'ON' : 'OFF'),
        onSelect: () => apply({ leftHanded: !read().leftHanded }),
        onAdjust: () => apply({ leftHanded: !read().leftHanded }),
      },
      {
        label: 'BACK TO MENU',
        onSelect: () => this.setMode('main'),
      },
    ]
  }

  private controlItems(): MenuItem[] {
    const items: MenuItem[] = REBIND_ACTIONS.map((action) => ({
      label: LABELS[action].toUpperCase(),
      value: () => primaryLabel(this.save.settings.bindings, action),
      onSelect: () => this.beginRebind(action),
    }))
    items.push({
      label: 'RESET KEYBOARD BINDINGS',
      accent: CSS.coral,
      onSelect: () => {
        this.save = updateSettings(this.save, {
          bindings: structuredClone(defaultSave().settings.bindings),
        })
        this.inputManager.updateBindings(this.save.settings.bindings)
        this.setMode('controls')
        this.showNotice('KEYBOARD BINDINGS RESET')
      },
    })
    items.push({ label: 'BACK TO MENU', onSelect: () => this.setMode('main') })
    return items
  }

  private beginRebind(action: Action): void {
    if (this.rebinding) return
    this.rebinding = true
    this.list?.setEnabled(false)
    this.showNotice(`PRESS A NEW KEY FOR ${LABELS[action].toUpperCase()} — ESC TO CANCEL`, 5000)
    this.inputManager.beginRebind(action, (code) => {
      this.rebinding = false
      this.list?.setEnabled(true)
      if (code) {
        for (const candidate of ACTIONS) {
          if (candidate === action) continue
          const existing = this.save.settings.bindings[candidate]
          if (existing.length === 1 && existing[0] === code) {
            this.save.settings.bindings[candidate] = [this.save.settings.bindings[candidate][0] ?? 'Unbound']
          }
        }
        this.save.settings.bindings[action] = [code]
        writeSave(this.save)
        this.inputManager.updateBindings(this.save.settings.bindings)
        audio.sfx('click')
        this.showNotice(`${LABELS[action].toUpperCase()} — ${code.replace('Key', '').replace('Digit', '')}`)
      }
      this.setMode('controls')
    })
  }

  private helpCopy(): string {
    return [
      'MOVE  ·  A / D or the arrow keys. On a phone, the left thumb pad drives Pip.',
      'JUMP  ·  SPACE. Hold it for height, or press it just after leaving a ledge.',
      'BLASTER  ·  J or left mouse. Aim with the mouse, the right stick, or your facing.',
      'GADGETS  ·  1–5 select, K uses. Jetpack 2: hold K in the air. Spring 3: hold K on the ground and release. Magnet 4: hold K near the crate. Phase 5: Shift dashes through pink barriers.',
      'EXPLORE  ·  Star Shards reward curiosity. Data capsules hide behind breakable walls. Checkpoints save your fall.',
      'PAUSE  ·  ESC or START. The whole pause menu works with a controller.',
    ].join('\n\n')
  }

  private logCopy(): string {
    const level = this.save.levels['w1-1']
    const stars = level?.stars ?? 0
    const completed = level?.completed
    const achievements = ACHIEVEMENTS.map((achievement) =>
      this.save.achievements.includes(achievement.id) ? `★ ${achievement.name}` : `◇ ${achievement.name}`,
    ).join('\n')
    return [
      `STARLIGHT MEADOWS  ·  THE FALLEN BEACON`,
      completed
        ? `Completed  ·  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ·  best ${Math.floor((level?.bestMs ?? 0) / 60000)}:${String(Math.floor(((level?.bestMs ?? 0) % 60000) / 1000)).padStart(2, '0')}`
        : 'Not yet completed',
      `Star Shards  ·  ${this.save.shards}  ·  Data capsules  ·  ${this.save.capsules.length}/2`,
      '',
      achievements,
    ].join('\n')
  }

  private startGame(): void {
    if (this.transitioned) return
    this.transitioned = true
    audio.unlock()
    audio.sfx('click')
    void orientation.requestLandscape(this.game.canvas)
    this.cameras.main.fadeOut(320, 7, 19, 38)
    this.time.delayedCall(340, () => this.scene.start('Game'))
  }

  private showNotice(text: string, duration = 2600): void {
    this.noticeText.setText(text)
    this.noticeText.setAlpha(1)
    this.tweens.killTweensOf(this.noticeText)
    this.time.delayedCall(duration, () => {
      this.tweens.add({ targets: this.noticeText, alpha: 0, duration: 400 })
    })
  }

  private refreshHints(): void {
    const prompt = this.inputManager.lastDevice === 'gamepad' ? 'A' : 'SPACE / ENTER'
    this.hintText.setText(`${prompt} SELECT   ·   ↑↓ NAVIGATE   ·   ESC BACK`)
  }

  private onOrientation = (event: Event): void => {
    const detail = (event as CustomEvent<{ portrait: boolean }>).detail
    if (detail?.portrait) {
      this.showNotice('ROTATE TO LANDSCAPE TO CONTINUE', 6000)
    }
  }

  override update(_time: number, delta: number): void {
    this.inputManager.update()
    this.list?.update()
    this.parallax.update(this.time.now, 0)
    const idle = {
      vx: 0,
      vy: 0,
      grounded: true,
      facing: 1 as const,
      jetpack: false,
      jetpackUnlocked: false,
      dashing: false,
      shooting: false,
      hurt: false,
      invulnerable: false,
      springCharging: false,
      crouching: false,
      celebrating: false,
      aimAngle: 0,
    }
    this.pip.update(Math.min(delta, 50) / 1000, idle)
    this.bolt.update(Math.min(delta, 50) / 1000, 258, GAME_HEIGHT - 160, 1)
    this.timeAlive += delta
    if (this.timeAlive > 2000) this.hintText.setAlpha(0.65 + Math.sin(this.time.now * 0.002) * 0.15)

    if (this.mode !== 'main' && !this.rebinding) {
      if (this.inputManager.justPressed('pause') || this.inputManager.justPressed('dash')) {
        audio.sfx('click')
        this.setMode('main')
      }
    }
    this.inputManager.postUpdate()
  }
}
