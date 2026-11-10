export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'fire',
  'gadget',
  'dash',
  'interact',
  'next',
  'prev',
  'pause',
  'map',
] as const

export type Action = (typeof ACTIONS)[number]

export type Bindings = Record<Action, string[]>

export const DEFAULT_BINDINGS: Bindings = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  fire: ['KeyJ'],
  gadget: ['KeyK'],
  dash: ['ShiftLeft', 'KeyL'],
  interact: ['KeyE', 'Enter'],
  next: ['KeyQ'],
  prev: ['KeyQ'],
  pause: ['Escape', 'KeyP'],
  map: ['Tab', 'KeyM'],
}

export const LABELS: Record<Action, string> = {
  left: 'Move left',
  right: 'Move right',
  up: 'Look up',
  down: 'Crouch / drop',
  jump: 'Jump / fly',
  fire: 'Blaster',
  gadget: 'Use gadget',
  dash: 'Dash',
  interact: 'Interact',
  next: 'Next gadget',
  prev: 'Previous gadget',
  pause: 'Pause',
  map: 'Objectives',
}

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Space: 'SPACE',
  ShiftLeft: 'SHIFT',
  ShiftRight: 'SHIFT',
  ControlLeft: 'CTRL',
  ControlRight: 'CTRL',
  AltLeft: 'ALT',
  AltRight: 'ALT',
  Escape: 'ESC',
  Enter: 'ENTER',
  Tab: 'TAB',
  Backspace: 'BACK',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  MouseLeft: 'LMB',
  MouseRight: 'RMB',
}

export function keyLabel(code: string): string {
  if (KEY_LABELS[code]) return KEY_LABELS[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Numpad')) return `NUM ${code.slice(6)}`
  return code.replace(/(Left|Right)$/, '').toUpperCase()
}

export function primaryLabel(bindings: Bindings, action: Action): string {
  return keyLabel(bindings[action][0] ?? '')
}
