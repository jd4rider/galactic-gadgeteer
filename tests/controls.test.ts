import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS } from '../src/input/actions'
import { sanitizeSave } from '../src/core/save'

describe('standard keyboard layout', () => {
  it('maps arrows to movement, Space to jump, J to fire and K to gadgets', () => {
    expect(DEFAULT_BINDINGS.left).toContain('ArrowLeft')
    expect(DEFAULT_BINDINGS.right).toContain('ArrowRight')
    expect(DEFAULT_BINDINGS.up).toContain('ArrowUp')
    expect(DEFAULT_BINDINGS.down).toContain('ArrowDown')

    expect(DEFAULT_BINDINGS.jump).toContain('Space')
    expect(DEFAULT_BINDINGS.jump).not.toContain('ControlLeft')

    expect(DEFAULT_BINDINGS.fire).toEqual(['KeyJ'])
    expect(DEFAULT_BINDINGS.gadget).toEqual(['KeyK'])
    expect(DEFAULT_BINDINGS.interact).toEqual(['KeyE', 'Enter'])
  })

  it('returns Keen default bindings to the standard layout without touching custom remaps', () => {
    const keen = sanitizeSave({
      settings: {
        bindings: {
          jump: ['ControlLeft', 'ControlRight', 'KeyW'],
          fire: ['Space', 'KeyJ'],
          gadget: ['AltLeft', 'AltRight', 'KeyK'],
          interact: ['KeyE', 'Enter', 'Space'],
        },
      },
    })
    expect(keen.settings.bindings.jump).toEqual(DEFAULT_BINDINGS.jump)
    expect(keen.settings.bindings.fire).toEqual(DEFAULT_BINDINGS.fire)
    expect(keen.settings.bindings.gadget).toEqual(DEFAULT_BINDINGS.gadget)
    expect(keen.settings.bindings.interact).toEqual(DEFAULT_BINDINGS.interact)

    const custom = sanitizeSave({
      settings: { bindings: { jump: ['KeyZ'], fire: ['KeyX'] } },
    })
    expect(custom.settings.bindings.jump).toEqual(['KeyZ'])
    expect(custom.settings.bindings.fire).toEqual(['KeyX'])
  })
})
