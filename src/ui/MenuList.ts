import Phaser from 'phaser'
import { CSS, FONT } from '../config'
import type { InputManager } from '../input/InputManager'

export interface MenuItem {
  label: string
  detail?: string
  value?: () => string
  accent?: string
  disabled?: boolean
  onSelect?: () => void
  onAdjust?: (direction: -1 | 1) => void
}

export class MenuList {
  private scene: Phaser.Scene
  private input: InputManager
  private container: Phaser.GameObjects.Container
  private items: MenuItem[]
  private rows: Array<{
    container: Phaser.GameObjects.Container
    background: Phaser.GameObjects.Graphics
    label: Phaser.GameObjects.Text
    detail: Phaser.GameObjects.Text
    value: Phaser.GameObjects.Text
    zone: Phaser.GameObjects.Zone
    item: MenuItem
  }> = []
  private selected = 0
  private width: number
  private rowHeight: number
  private gap: number
  private visible = true
  private enabled = true

  constructor(
    scene: Phaser.Scene,
    input: InputManager,
    x: number,
    y: number,
    width: number,
    items: MenuItem[],
    options: { rowHeight?: number; gap?: number; selected?: number } = {},
  ) {
    this.scene = scene
    this.input = input
    this.width = width
    this.rowHeight = options.rowHeight ?? 56
    this.gap = options.gap ?? 9
    this.items = items
    this.selected = options.selected ?? 0
    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(1200)
    this.build()
  }

  private build(): void {
    this.container.removeAll(true)
    this.rows = []
    this.items.forEach((item, index) => {
      const row = this.scene.add.container(0, index * (this.rowHeight + this.gap))
      const background = this.scene.add.graphics()
      const label = this.scene.add
        .text(24, item.detail ? 12 : this.rowHeight / 2, item.label, {
          fontFamily: FONT,
          fontSize: '17px',
          fontStyle: 'bold',
          color: CSS.cream,
        })
        .setOrigin(0, item.detail ? 0 : 0.5)
        .setResolution(2)
      const detail = this.scene.add
        .text(24, 31, item.detail ?? '', {
          fontFamily: FONT,
          fontSize: '11px',
          color: CSS.muted,
        })
        .setOrigin(0, 0)
        .setResolution(2)
      const value = this.scene.add
        .text(this.width - 22, this.rowHeight / 2, item.value?.() ?? '', {
          fontFamily: FONT,
          fontSize: '13px',
          fontStyle: 'bold',
          color: item.accent ?? CSS.gold,
        })
        .setOrigin(1, 0.5)
        .setResolution(2)
      const zone = this.scene.add
        .zone(this.width / 2, this.rowHeight / 2, this.width, this.rowHeight)
        .setInteractive({ useHandCursor: true })
      zone.on('pointerover', () => {
        if (!this.enabled) return
        this.selected = index
        this.paint()
      })
      zone.on('pointerdown', () => {
        if (!this.enabled || item.disabled) return
        this.selected = index
        this.paint()
        item.onSelect?.()
      })
      row.add([background, label, detail, value, zone])
      this.container.add(row)
      this.rows.push({ container: row, background, label, detail, value, zone, item })
    })
    this.paint()
  }

  private paint(): void {
    this.rows.forEach((row, index) => {
      const active = index === this.selected
      const g = row.background
      g.clear()
      g.fillStyle(0x071326, active ? 0.9 : 0.62)
      g.fillRoundedRect(0, 0, this.width, this.rowHeight, 14)
      g.lineStyle(active ? 2 : 1, active ? 0x7ef5e5 : 0x6f89a2, active ? 0.85 : 0.22)
      g.strokeRoundedRect(0, 0, this.width, this.rowHeight, 14)
      if (active) {
        g.fillStyle(0x2ec4b6, 1)
        g.fillRoundedRect(0, 13, 5, this.rowHeight - 26, 2.5)
        g.fillStyle(0x2ec4b6, 0.07)
        g.fillRoundedRect(6, 2, this.width - 8, this.rowHeight - 4, 12)
      }
      row.label.setColor(row.item.disabled ? '#5e7286' : active ? CSS.white : CSS.cream)
      row.label.setAlpha(row.item.disabled ? 0.55 : 1)
      row.detail.setAlpha(row.item.disabled ? 0.35 : active ? 0.95 : 0.6)
      row.value.setAlpha(row.item.disabled ? 0.3 : 1)
      row.container.setScale(active ? 1.006 : 1)
    })
  }

  refresh(): void {
    this.rows.forEach((row) => {
      row.value.setText(row.item.value?.() ?? '')
    })
  }

  update(): void {
    if (!this.visible || !this.enabled) return
    if (this.input.justPressed('down')) this.move(1)
    if (this.input.justPressed('up')) this.move(-1)
    const current = this.rows[this.selected]
    if (current && (this.input.justPressed('jump') || this.input.justPressed('interact'))) {
      if (!current.item.disabled) {
        current.item.onSelect?.()
        this.scene.time.delayedCall(0, () => this.paint())
      }
    }
    if (current?.item.onAdjust) {
      if (this.input.justPressed('right')) {
        current.item.onAdjust(1)
        this.refresh()
        this.paint()
      } else if (this.input.justPressed('left')) {
        current.item.onAdjust(-1)
        this.refresh()
        this.paint()
      }
    }
  }

  private move(direction: number): void {
    let next = this.selected
    for (let i = 0; i < this.rows.length; i += 1) {
      next = (next + direction + this.rows.length) % this.rows.length
      if (!this.rows[next].item.disabled) break
    }
    if (next !== this.selected) {
      this.selected = next
      this.paint()
    }
  }

  setItems(items: MenuItem[], selected = 0): void {
    this.items = items
    this.selected = selected
    this.build()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.container.setVisible(visible)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  get index(): number {
    return this.selected
  }

  setSelected(index: number): void {
    if (index < 0 || index >= this.rows.length) return
    this.selected = index
    this.paint()
  }

  addGameObject(object: Phaser.GameObjects.GameObject): void {
    this.container.add(object)
  }

  setDepth(depth: number): void {
    this.container.setDepth(depth)
  }

  destroy(): void {
    this.container.destroy(true)
  }
}
