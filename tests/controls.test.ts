import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS } from '../src/input/actions'
import { sanitizeSave } from '../src/core/save'

describe('classic Commander Keen keyboard layout', () => {
  it('maps arrows to movement, Ctrl to jump, Alt to gadgets and Space to fire', () => {
    expect(DEFAULT_BINDINGS.left).toContain('ArrowLeft')
    expect(DEFAULT_BINDINGS.right).toContain('ArrowRight')
    expect(DEFAULT_BINDINGS.up).toContain('ArrowUp')
    expect(DEFAULT_BINDINGS.down).toContain('ArrowDown')

    expect(DEFAULT_BINDINGS.jump).toContain('ControlLeft')
    expect(DEFAULT_BINDINGS.jump).toContain('ControlRight')
    expect(DEFAULT_BINDINGS.jump).not.toContain('Space')

    expect(DEFAULT_BINDINGS.gadget).toContain('AltLeft')
    expect(DEFAULT_BINDINGS.gadget).toContain('AltRight')

    expect(DEFAULT_BINDINGS.fire).toContain('Space')
    expect(DEFAULT_BINDINGS.interact).toContain('Space')
  })

  it('upgrades the old default bindings without touching custom remaps', () => {
    const legacy = sanitizeSave({
      settings: {
        bindings: {
          jump: ['Space', 'KeyW', 'ArrowUp'],
          fire: ['KeyJ'],
          gadget: ['KeyK'],
          interact: ['KeyE', 'Enter'],
        },
      },
    })
    expect(legacy.settings.bindings.jump).toEqual(DEFAULT_BINDINGS.jump)
    expect(legacy.settings.bindings.fire).toEqual(DEFAULT_BINDINGS.fire)
    expect(legacy.settings.bindings.gadget).toEqual(DEFAULT_BINDINGS.gadget)
    expect(legacy.settings.bindings.interact).toEqual(DEFAULT_BINDINGS.interact)

    const custom = sanitizeSave({
      settings: { bindings: { jump: ['KeyZ'], fire: ['KeyX'] } },
    })
    expect(custom.settings.bindings.jump).toEqual(['KeyZ'])
    expect(custom.settings.bindings.fire).toEqual(['KeyX'])
  })
})
