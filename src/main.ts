import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH, VERSION } from './config'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { orientation } from './input/orientation'
import { audio } from './audio/AudioEngine'

declare global {
  interface Window {
    __GALACTIC_GADGETEER__?: Phaser.Game
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#071326',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1900 },
      debug: false,
      fps: 60,
    },
  },
  input: {
    activePointers: 5,
    gamepad: true,
  },
  fps: { target: 60, smoothStep: false },
  scene: [BootScene, MenuScene, GameScene],
})

window.__GALACTIC_GADGETEER__ = game

orientation.start((portrait) => {
  window.dispatchEvent(new CustomEvent('gg-orientation', { detail: { portrait } }))
})

document.addEventListener('pointerdown', () => audio.unlock(), { once: true, capture: true })
document.addEventListener('keydown', () => audio.unlock(), { once: true, capture: true })

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') audio.suspend()
  else audio.resume()
})

const touchMoveGuard = (event: TouchEvent): void => {
  if (event.touches.length > 1) return
  const target = event.target as HTMLElement | null
  if (target?.tagName === 'CANVAS') event.preventDefault()
}
document.addEventListener('touchmove', touchMoveGuard, { passive: false })

const refreshScale = (): void => {
  game.scale.refresh()
}
window.addEventListener('resize', refreshScale)
window.addEventListener('load', refreshScale)
// The coarse-pointer CSS stretches the canvas to the viewport after Phaser's
// initial FIT measurement; refresh so pointer coordinates follow the real rect.
window.setTimeout(refreshScale, 120)

// Keep the build version visible in devtools and useful for smoke tests.
document.documentElement.dataset.game = 'galactic-gadgeteer'
document.documentElement.dataset.version = VERSION
void GAME_HEIGHT
