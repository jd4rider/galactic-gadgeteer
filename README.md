# Galactic Gadgeteer: The Lost Worlds

An original 2D sci-fi platforming adventure built with **Phaser 3.90**, **strict TypeScript** and **Vite**. Pip and BOLT are trying to recover the Starlight Engine before the gateways between the lost worlds fail completely.

This repository currently contains the first playable expedition: **World 1 · Starlight Meadows · The Fallen Beacon**. It is a complete 4–7 minute level with all five gadgets, three enemy types, two checkpoints, hidden collectibles and a finish sequence. It is not the finished 150-level game; the remaining worlds and bosses are the next production milestone.

## Play locally

```bash
npm install
npm run dev
```

Open the printed local URL. A production build is:

```bash
npm run build
npm run preview
```

The Pages workflow deploys the build at `/`, with a duplicate playable copy at `/play/` for the arcade.

## Controls

Classic Commander Keen layout: arrows move, **Ctrl jumps**, **Alt uses the gadget action**, and **Space fires**. WASD, J and K remain as alternates.

| Action | Keyboard / mouse | Controller | Touch |
|---|---|---|---|
| Move | Arrow keys or A / D | Left stick or D-pad | Left thumb pad |
| Jump / fly | Ctrl or W | A / Cross | Jump |
| Fire | Space, J or left mouse | X / Square or right trigger | Fire |
| Use gadget | Alt, K or right mouse | Y / Triangle | Gadget |
| Dash | Shift or L | B / Circle | Dash |
| Select gadget | 1–5 or Q | LB / RB cycle | Gadget button + labels |
| Pause | Escape or P | Start / Options | Pause icon |

All four input paths feed one logical action layer in `src/input/InputManager.ts`. Gameplay never reads a raw key or gamepad button. Mouse aiming is camera-correct; keyboard and controller aiming fall back to an eight-direction facing model. Existing saves created with the old Space-to-jump defaults are upgraded automatically; custom remaps are preserved.

Touch controls support real simultaneous presses: move, hold jump, fire and use a gadget at once. They hide automatically when an actual controller input is received and can be restored from Settings.

## Implemented

- Responsive 1280 × 720 presentation with letterboxing and a mandatory landscape rotate overlay on touch devices.
- Arcade Physics movement with acceleration, coyote time (100 ms), jump buffering (120 ms), variable jump height, apex gravity, wall slide and wall jumps, and fixed-step simulation.
- Pip's procedural animation rig: idle breathing, blinking, look-around pupils, walk/run, rising/falling, landing squash, jetpack flight, wall lean, dash lean, shooting recoil, hurt blink, celebrating and respawn.
- BOLT follows with spring smoothing, digital eyes, antenna motion and thruster pulse.
- Five gadgets: plasma blaster, jetpack with fuel, charged spring boots, magnetic crate pulling and phase dash through a dedicated barrier collision rule.
- Any enemy pops on contact with Pip, without requiring a stomp or a perfectly timed jump.
- Starlight Meadows: six distinct traversal beats, three enemy behaviours, destructible wall, data capsules, 36 Star Shards, two checkpoints, moving platform, spike hazards and a results sequence.
- Animated menu, settings, keyboard remapping, controls guide, expedition log and achievements.
- Original art generated into canvas textures at boot: layered parallax sky, ringed planet, clouds, mountains, floating islands, alien canopy, foreground vines, illustrated platforms, characters and effects.
- Synthesized Web Audio music and effects with separate master/music/effects gains and autoplay-safe unlocking.
- Local save data with arcade cloud mirroring through `public/arcade-client.js`. No account is required.
- Pause on focus loss, visibility loss, orientation change and controller disconnection; the pause menu is keyboard, mouse, touch and controller navigable.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The Vitest suite covers the movement timing rules, star scoring and save sanitisation/merging. A produced browser smoke test is documented in `docs/QA_REPORT.md`.

## Known scope and limitations

- Only one of the planned 150 levels is implemented. Worlds 2–10, the ten bosses and the full world map are not built yet.
- Controller support is coded against the standard mapping and browser Gamepad API but has not been tested on physical controller hardware in this environment.
- Touch and orientation behaviour are verified with desktop browser emulation, not on a physical iOS or Android device.
- The game uses generated 2D art rather than commissioned sprite atlases. It is cohesive and original, but the full production art pass is still ahead.
- Monetisation, leaderboards and platform achievement reporting are intentionally absent. The drop-in arcade client has no achievement endpoint, so achievements live in the save payload.
- The level's final fragment is the current end of the slice; there is no world boss encounter yet.

## Project layout

```text
src/
  art/          Procedural canvas textures and effects
  audio/        Web Audio music and SFX
  core/         Save data, achievements
  data/         Level definitions
  enemies/      Mite, drone and turret behaviour
  input/        Logical actions, keyboard/mouse/gamepad/touch, orientation
  player/       Pip controller, movement rules, animation rig, BOLT
  scenes/       Boot, menu and expedition
  ui/           HUD, menu list and multitouch controls
  world/        Parallax layers
```

All characters, scenery, sounds and code are original. No Commander Keen artwork, levels, characters or music is used.
