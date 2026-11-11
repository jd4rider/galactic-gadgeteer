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

const projectileState = () =>
  page.evaluate(() => {
    const scene = window.__GG_DEBUG__.scene
    return {
      shots: scene.projectiles.getChildren().filter((shot) => shot.active).map((shot) => ({
        x: Math.round(shot.x),
        y: Math.round(shot.y),
        vx: Math.round(shot.body?.velocity?.x ?? 0),
        vy: Math.round(shot.body?.velocity?.y ?? 0),
      })),
      flashes: scene.children.list.filter((child) => child.texture?.key === 'muzzle' && child.active).length,
    }
  })

// Fire before moving. Physics is paused for this observation so the slow
// headless clock cannot advance a bolt all the way to the distant wall in one
// frame; the velocity assertion still exercises the real spawn path.
const beforeShots = started.shots ?? 0
await page.evaluate(() => {
  const scene = window.__GG_DEBUG__.scene
  scene.physics.pause()
  scene.player.nextShotAt = 0
  scene.player.facing = 1
})
await page.keyboard.down('Space')
await page.waitForTimeout(90)
await page.keyboard.up('Space')
await page.waitForTimeout(100)
const rightShot = await projectileState()
console.log('fire right', { before: beforeShots, shots: rightShot.shots })
if (rightShot.shots.length === 0 || rightShot.shots[0].vx <= 0) {
  errors.push('right-facing shot did not travel right')
}

// Turn Pip directly so this checks projectile direction without depending on
// a synthetic movement key landing inside a paused physics step.
await page.evaluate(() => {
  const scene = window.__GG_DEBUG__.scene
  scene.player.nextShotAt = 0
  scene.player.facing = -1
})
await page.keyboard.down('Space')
await page.waitForTimeout(120)
await page.keyboard.up('Space')
await page.waitForTimeout(100)
const leftShot = await projectileState()
console.log('fire left', { shots: leftShot.shots })
if (!leftShot.shots.some((shot) => shot.vx < 0)) {
  errors.push('left-facing shot did not travel left')
}

// Alt is the Keen-style gadget key. Verify the browser captures it while held.
await page.keyboard.down('Alt')
await page.waitForTimeout(80)
const altHeld = await page.evaluate(() => window.__GG_DEBUG__.scene.inputManager.isDown('gadget'))
await page.keyboard.up('Alt')
if (!altHeld) errors.push('Alt did not activate the gadget action')

await page.waitForTimeout(600)
const cleaned = await projectileState()
console.log('muzzle cleanup', { flashes: cleaned.flashes })
if (cleaned.flashes !== 0) errors.push('muzzle flash did not clean up')
await page.evaluate(() => window.__GG_DEBUG__.scene.physics.resume())
const fired = await snapshot()
if ((fired.shots ?? 0) < beforeShots + 2) errors.push('fire action did not fire twice')
if ((fired.jumps ?? 0) !== (started.jumps ?? 0)) errors.push('Space fired but also jumped')

// Test the jump from the clean spawn, before horizontal movement can leave a ledge.
const beforeJump = fired.jumps ?? 0
await page.keyboard.press('Control')
await page.waitForTimeout(300)
const jumped = await snapshot()
console.log('jump', { before: beforeJump, after: jumped.jumps, y: jumped.y, health: jumped.health })
if ((jumped.jumps ?? 0) <= beforeJump) errors.push('Ctrl jump action did not fire')

const beforeMove = await snapshot()
await page.keyboard.down('ArrowRight')
await page.waitForTimeout(500)
await page.keyboard.up('ArrowRight')
const moved = await snapshot()
console.log('movement', { startX: beforeMove.x, movedX: moved.x, delta: Math.round(moved.x - beforeMove.x) })
if (moved.x - beforeMove.x < 60) errors.push('player did not move right')
await page.screenshot({ path: `${out}/run.png` })

await page.bringToFront()
await page.mouse.click(1250, 31)
await page.waitForTimeout(400)
const paused = await snapshot()
console.log('pause', { paused: paused.paused })
await page.screenshot({ path: `${out}/pause.png` })
if (!paused.paused) errors.push('pause button did not open the pause menu')
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
// Close the desktop tab first so the mobile page owns the browser input focus.
await page.close()
const mobile = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
})
const touchPage = await mobile.newPage()
touchPage.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`))
await touchPage.bringToFront()
await touchPage.goto(url, { waitUntil: 'domcontentloaded' })
await touchPage.waitForFunction(
  () => window.__GALACTIC_GADGETEER__?.scene.getScenes(true).some((scene) => scene.scene.key === 'Menu'),
  null,
  { timeout: 30000 },
)
await touchPage.waitForTimeout(600)
// Start with the focused menu action; this fixture is about the in-game touch
// controls, while desktop coverage already exercises pointer selection.
await touchPage.keyboard.press('Enter')
await touchPage.waitForFunction(() => Boolean(window.__GG_DEBUG__?.player), null, { timeout: 60000 })
await touchPage.waitForTimeout(900)
const box = await touchPage.locator('canvas').boundingBox()
if (!box) throw new Error('canvas missing on mobile')
const touchState = await touchPage.evaluate(() => ({
  game: Boolean(window.__GG_DEBUG__?.player),
  touchVisible: Boolean(window.__GG_DEBUG__?.scene?.touch?.isVisible),
  width: window.innerWidth,
  height: window.innerHeight,
}))
await touchPage.screenshot({ path: `${out}/touch.png` })
console.log('touch', touchState)
if (!touchState.touchVisible) errors.push('touch controls were not visible on a touch device')

// The right-hand action buttons must work with a real touch, not only render.
const touchShotsBefore = await touchPage.evaluate(() => window.__GG_DEBUG__.shotsFired)
await touchPage.touchscreen.tap(box.x + (1006 / 1280) * box.width, box.y + (542 / 720) * box.height)
await touchPage.waitForTimeout(350)
const touchShotsAfter = await touchPage.evaluate(() => window.__GG_DEBUG__.shotsFired)
console.log('touch fire', { before: touchShotsBefore, after: touchShotsAfter })
if ((touchShotsAfter ?? 0) <= (touchShotsBefore ?? 0)) errors.push('touch FIRE button did not fire')

// Gadget slots are selectable by touch; the GADGET button then uses the choice.
await touchPage.evaluate(() => window.__GG_DEBUG__.scene.player.unlockGadget('jetpack'))
await touchPage.touchscreen.tap(box.x + (94 / 1280) * box.width, box.y + (158 / 720) * box.height)
await touchPage.waitForTimeout(150)
const selectedGadget = await touchPage.evaluate(() => window.__GG_DEBUG__.player.activeGadget)
console.log('touch gadget select', selectedGadget)
if (selectedGadget !== 'jetpack') errors.push(`touch gadget slot selected ${selectedGadget}`)

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
