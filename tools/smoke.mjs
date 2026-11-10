import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const url = process.argv[2] ?? 'http://127.0.0.1:4318/'
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const out = '/tmp/gg-shots'
await mkdir(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl'],
})

const errors = []
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`)
})

const snapshot = () =>
  page.evaluate(() => {
    const d = window.__GG_DEBUG__
    const s = d?.scene
    return {
      paused: Boolean(d?.paused),
      complete: Boolean(d?.complete),
      health: d?.player?.health,
      x: d?.player?.x,
      y: d?.player?.y,
      jumps: d?.jumps,
      shots: d?.shotsFired,
      elapsedMs: d?.elapsedMs,
      gadgets: d?.player ? [...d.player.unlocked] : [],
      stars: d?.savedStars,
      shards: d?.shards,
      capsules: d?.capsules,
      lastDamageSource: d?.lastDamageSource,
      touchVisible: Boolean(s?.touch?.isVisible),
      projectiles: s?.projectiles?.getLength?.() ?? 0,
    }
  })

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForFunction(
  () => window.__GALACTIC_GADGETEER__?.scene.getScenes(true).some((scene) => scene.scene.key === 'Menu'),
  null,
  { timeout: 30000 },
)
await page.waitForTimeout(500)
await page.screenshot({ path: `${out}/menu.png` })
console.log('boot', await page.evaluate(() => ({
  hasGame: Boolean(window.__GALACTIC_GADGETEER__),
  scenes: window.__GALACTIC_GADGETEER__?.scene.getScenes(true).map((scene) => scene.scene.key) ?? [],
})))

await page.mouse.click(965, 348)
await page.waitForFunction(() => Boolean(window.__GG_DEBUG__?.player), null, { timeout: 60000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${out}/start.png` })
const started = await snapshot()
console.log('started', started)
if (started.health !== 3) errors.push(`expected full health at spawn, got ${started.health}`)
if ((started.elapsedMs ?? 0) > 5000) errors.push(`level clock started late at ${started.elapsedMs}ms`)

// Test the jump from the clean spawn, before horizontal movement can leave a ledge.
const beforeJump = started.jumps ?? 0
await page.keyboard.down('Space')
await page.waitForTimeout(90)
await page.keyboard.up('Space')
await page.waitForTimeout(260)
const jumped = await snapshot()
console.log('jump', { before: beforeJump, after: jumped.jumps, y: jumped.y, health: jumped.health })
if ((jumped.jumps ?? 0) <= beforeJump) errors.push('jump action did not fire')

await page.evaluate(() => {
  const scene = window.__GG_DEBUG__.scene
  scene.player.body().reset(150, 690)
  scene.player.body().setVelocity(0, 0)
})
await page.waitForTimeout(350)
const beforeMove = await snapshot()
await page.keyboard.down('KeyD')
await page.waitForTimeout(500)
await page.keyboard.up('KeyD')
const moved = await snapshot()
console.log('movement', { startX: beforeMove.x, movedX: moved.x, delta: Math.round(moved.x - beforeMove.x) })
if (moved.x - beforeMove.x < 60) errors.push('player did not move right')

const beforeShots = moved.shots ?? 0
await page.keyboard.down('KeyJ')
await page.waitForTimeout(120)
await page.keyboard.up('KeyJ')
await page.waitForTimeout(220)
const fired = await snapshot()
console.log('fire', { before: beforeShots, after: fired.shots, projectiles: fired.projectiles })
if ((fired.shots ?? 0) <= beforeShots) errors.push('fire action did not fire')
await page.screenshot({ path: `${out}/run.png` })

await page.keyboard.press('Escape')
await page.waitForTimeout(350)
const paused = await snapshot()
console.log('pause', { paused: paused.paused })
await page.screenshot({ path: `${out}/pause.png` })
if (!paused.paused) errors.push('pause menu did not open')
await page.keyboard.press('Enter')
await page.waitForTimeout(500)
const resumed = await snapshot()
console.log('resume', { paused: resumed.paused })
if (resumed.paused) errors.push('pause menu did not resume')

const pickups = await page.evaluate(() => {
  const scene = window.__GG_DEBUG__.scene
  const result = []
  for (const pickup of scene.pickups) {
    scene.player.sprite.setPosition(pickup.x, pickup.y)
    scene.player.body().reset(pickup.x, pickup.y)
    scene.updatePickups()
    result.push({ gadget: pickup.gadget, collected: pickup.collected })
  }
  return { result, unlocked: [...scene.player.unlocked] }
})
console.log('pickups', pickups)
if (pickups.unlocked.length !== 5) errors.push(`expected 5 gadgets, got ${pickups.unlocked.join(',')}`)

await page.evaluate(() => {
  const scene = window.__GG_DEBUG__.scene
  scene.player.sprite.setPosition(6160, 650)
  scene.player.respawn(6160, 650)
})
await page.waitForFunction(() => Boolean(window.__GG_DEBUG__.complete), null, { timeout: 12000 })
await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/results.png` })
const result = await snapshot()
console.log('result', result)
if ((result.elapsedMs ?? 0) <= 0) errors.push('level clock never advanced')

// Mobile landscape: tap START, verify the touch layout, then rotate to portrait.
const mobile = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
})
const touchPage = await mobile.newPage()
touchPage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`))
await touchPage.goto(url, { waitUntil: 'networkidle' })
await touchPage.waitForFunction(
  () => window.__GALACTIC_GADGETEER__?.scene.getScenes(true).some((scene) => scene.scene.key === 'Menu'),
  null,
  { timeout: 30000 },
)
await touchPage.waitForTimeout(600)
const box = await touchPage.locator('canvas').boundingBox()
if (!box) throw new Error('canvas missing on mobile')
await touchPage.touchscreen.tap(box.x + (965 / 1280) * box.width, box.y + (352 / 720) * box.height)
await touchPage.waitForFunction(() => Boolean(window.__GG_DEBUG__?.player), null, { timeout: 60000 })
await touchPage.waitForTimeout(900)
const touchState = await touchPage.evaluate(() => ({
  game: Boolean(window.__GG_DEBUG__?.player),
  touchVisible: Boolean(window.__GG_DEBUG__?.scene?.touch?.isVisible),
  width: window.innerWidth,
  height: window.innerHeight,
}))
await touchPage.screenshot({ path: `${out}/touch.png` })
console.log('touch', touchState)
if (!touchState.touchVisible) errors.push('touch controls were not visible on a touch device')

await touchPage.setViewportSize({ width: 390, height: 844 })
await touchPage.waitForTimeout(800)
const portrait = await touchPage.evaluate(() => {
  const overlay = document.getElementById('rotate-overlay')
  return {
    bodyClass: document.body.classList.contains('gg-portrait'),
    overlay: overlay ? getComputedStyle(overlay).display : 'missing',
    paused: Boolean(window.__GG_DEBUG__?.paused),
  }
})
await touchPage.screenshot({ path: `${out}/portrait.png` })
console.log('portrait', portrait)
if (!portrait.bodyClass || portrait.overlay === 'none' || portrait.overlay === 'missing') {
  errors.push('portrait overlay did not cover the game')
}
if (!portrait.paused) errors.push('portrait orientation did not pause gameplay')

await touchPage.setViewportSize({ width: 844, height: 390 })
await touchPage.waitForTimeout(700)
const landscape = await touchPage.evaluate(() => ({
  bodyClass: document.body.classList.contains('gg-portrait'),
  paused: Boolean(window.__GG_DEBUG__?.paused),
}))
console.log('landscape', landscape)
if (landscape.bodyClass) errors.push('portrait overlay remained after rotating to landscape')
await mobile.close()

console.log('errors', errors)
await browser.close()
if (errors.length > 0) process.exit(1)
