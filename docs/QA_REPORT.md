# Galactic Gadgeteer — QA Report

**Date:** 2026-11-10  
**Build:** Phaser 3.90 · strict TypeScript · Vite 6  
**Scope tested:** World 1 vertical slice — *Starlight Meadows: The Fallen Beacon*

## Current product scope

This build contains **one complete expedition**, not the full 150-level game. It includes the Starlight Meadows level, all five gadgets, three enemy types, 36 Star Shards, two data capsules, two checkpoints, a moving platform, a breakable secret wall, a magnet crate/gate puzzle, a phase barrier, and the fragment completion sequence.

Not implemented yet: Worlds 2–10, the 15-level World 1 set, ten bosses, the animated world map, time trials, upgrades, monetisation, leaderboards, and the final production art/audio pass.

## Automated checks

| Check | Command | Result |
|---|---|---|
| Strict typecheck | `npm run typecheck` | **Pass** |
| Unit tests | `npm test -- --run` | **15/15 pass** |
| Production build | `npm run build` | **Pass** |
| Browser smoke | `node tools/smoke.mjs http://127.0.0.1:4318/` | **Pass, 0 errors** |

Production bundle: `1,612.13 kB` JavaScript, `376.59 kB` gzip.

## Browser smoke results

The smoke run uses the production bundle in headless Chrome at 1280 × 720, then repeats the mobile flow with a 844 × 390 touch context.

- Menu boots and contains the live Phaser game.
- Game scene starts at full health (3) with no spawn damage.
- Level clock begins at **0:00** and advances only during play (800 ms after start, 3.5 s at completion in the test run).
- Jump action fires (`jumps` 0 → 1) from a clean spawn.
- Fire action fires (`shotsFired` 0 → 1).
- Horizontal movement works; 500 ms input moved Pip approximately 143 px in the verified run.
- Escape opens the pause menu; Enter resumes it.
- All five gadgets unlock: blaster, jetpack, magnet, spring, phase.
- Reaching the fragment completes the level and reaches the results screen.
- Touch controls are visible in landscape on a touch device.
- Rotating to portrait (`390 × 844`) applies the full-screen rotate overlay and pauses gameplay.
- Returning to landscape removes the overlay and resumes gameplay.

## Gameplay regressions fixed during this pass

- **Jump verification:** the original probe sampled after the jump had already landed because the headless clock advances in large steps. Verification now uses gameplay counters, and the jump itself fires correctly.
- **Enemy collision:** enemy sprites added to a physics group were not reliably colliding with static platforms and could produce a phantom hit at spawn. Enemies are now scripted actors with stable floor positions, explicit contact checks, and projectile hit checks.
- **Spawn damage:** removed the phantom enemy overlap; Pip starts at full health.
- **Level clock:** replaced scene-clock subtraction with accumulated capped frame time so the HUD starts at 0:00 instead of inheriting menu load time.
- **Pause diagnostics:** pause/resume now publishes debug state immediately, including while the paused update loop is stopped.
- **Menu copy:** replaced the leftover “round doorway of the meadow” description with Starlight Meadows platforming copy.

## Visual review captures

Saved in `/tmp/gg-shots/`:

- `menu.png` — animated title, Pip/BOLT, planet, parallax meadow, menu list
- `start.png` — level opening, HUD, banner, enemies, shards
- `run.png` — movement and blaster frame
- `pause.png` — pause panel and menu focus
- `results.png` — fragment recovery results
- `touch.png` — landscape multitouch layout
- `portrait.png` — mandatory rotate overlay

The frames confirm a coherent illustrated presentation, readable HUD, original character art, layered parallax, and a working landscape-only mobile layout.

## Limitations / not yet proven

- **No full natural playthrough in automation.** The smoke test uses teleport-based gadget collection and goal entry to verify progression systems quickly; a human 4–7 minute traversal remains the next playtest task.
- **No physical controller test.** Standard-mapped controller code paths are implemented, but Xbox/PlayStation/Switch hardware, disconnection, remapping, and haptics were not tested on physical devices.
- **No iOS/Android device test.** Touch, multitouch, and orientation were verified with Chromium emulation only. Safari/iOS fullscreen and orientation-lock refusal paths still need device testing.
- **No Firefox/Safari/Edge matrix.** The tested production build ran in Chrome only.
- **No performance profile on target hardware.** Headless Chrome is software-rendered and not representative of 60 FPS behavior; the scene is small but should be profiled on mid-range mobile hardware.
- **No deployment.** The Pages workflow and arcade manifest exist, but no repository, push, or deployment was performed.
- **Procedural art, not a final commissioned asset pass.** The current visuals are original and cohesive, but the directive’s “premium hand-illustrated” bar still calls for a dedicated art pass.
- **Little Joy cloud sync is local/drop-in only.** Achievements are stored in the save payload because the inspected arcade client exposes no achievement endpoint.

## Next production steps

1. Human-play the expedition end to end and tune level length, checkpoint spacing, and difficulty.
2. Test controller support and mobile Safari/Chrome on physical hardware.
3. Build the remaining World 1 levels and the first boss encounter.
4. Add the world map and world/level selection.
5. Expand to Worlds 2–10 only after movement, combat, and the first boss pass release-quality review.
