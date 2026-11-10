import type { Settings } from '../core/save'

type Mood = 'menu' | 'meadow' | 'boss'
type Sfx =
  | 'jump'
  | 'land'
  | 'shoot'
  | 'hit'
  | 'hurt'
  | 'collect'
  | 'shard'
  | 'dash'
  | 'checkpoint'
  | 'pickup'
  | 'gate'
  | 'victory'
  | 'click'
  | 'error'

const CHORDS: Record<Mood, number[]> = {
  menu: [220, 277.18, 329.63, 440],
  meadow: [196, 246.94, 293.66, 392],
  boss: [110, 138.59, 164.81, 220],
}

const PATTERNS: Record<Mood, number[]> = {
  menu: [0, 1, 2, 3, 2, 1, 2, 0],
  meadow: [0, 2, 3, 2, 1, 2, 3, 1],
  boss: [0, 0, 3, 1, 0, 3, 2, 1],
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private sfxBus: GainNode | null = null
  private pad: OscillatorNode[] = []
  private timer: number | null = null
  private mood: Mood = 'menu'
  private step = 0
  private settings: Settings | null = null
  private unlocked = false
  private noise: AudioBuffer | null = null

  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.musicBus = this.ctx.createGain()
      this.sfxBus = this.ctx.createGain()
      this.musicBus.connect(this.master)
      this.sfxBus.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.applyVolumes()
      this.makeNoise()
      this.unlocked = true
      this.buildPad()
      this.startSequencer()
    } catch {
      // A browser without Web Audio simply gets a silent game.
    }
  }

  setSettings(settings: Settings): void {
    this.settings = settings
    this.applyVolumes()
    if (!settings.muted) this.unlock()
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus || !this.settings) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.masterVolume, now, 0.03)
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.5, now, 0.05)
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume, now, 0.02)
  }

  setMood(mood: Mood): void {
    if (this.mood === mood) return
    this.mood = mood
    this.buildPad()
    this.step = 0
  }

  private buildPad(): void {
    if (!this.ctx || !this.musicBus) return
    const now = this.ctx.currentTime
    this.pad.forEach((osc) => {
      try {
        osc.stop(now + 0.4)
      } catch {
        // already stopped
      }
    })
    this.pad = []
    const padGain = this.ctx.createGain()
    padGain.gain.setValueAtTime(0.0001, now)
    padGain.gain.exponentialRampToValueAtTime(0.055, now + 1.4)
    padGain.connect(this.musicBus)
    CHORDS[this.mood].slice(0, 3).forEach((frequency, index) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = index === 0 ? 'sine' : 'triangle'
      osc.frequency.value = frequency / (index === 0 ? 2 : 1)
      osc.detune.value = index === 1 ? -6 : index === 2 ? 6 : 0
      gain.gain.value = index === 0 ? 0.9 : 0.35
      osc.connect(gain)
      gain.connect(padGain)
      osc.start(now)
      this.pad.push(osc)
    })
  }

  private startSequencer(): void {
    if (this.timer !== null) return
    const tick = (): void => {
      this.pluck()
      this.timer = window.setTimeout(tick, this.mood === 'boss' ? 290 : 410)
    }
    this.timer = window.setTimeout(tick, 600)
  }

  private pluck(): void {
    if (!this.ctx || !this.musicBus) return
    const chord = CHORDS[this.mood]
    const pattern = PATTERNS[this.mood]
    const frequency = chord[pattern[this.step % pattern.length]] * (this.step % 8 === 7 ? 2 : 1)
    this.step += 1
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency * 2
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    osc.connect(gain)
    gain.connect(this.musicBus)
    osc.start(now)
    osc.stop(now + 0.6)
  }

  private makeNoise(): void {
    if (!this.ctx) return
    const length = Math.floor(this.ctx.sampleRate * 0.4)
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < length; i += 1) channel[i] = Math.random() * 2 - 1
    this.noise = buffer
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideTo?: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.sfxBus) return
    const now = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, now)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    osc.connect(gain)
    gain.connect(this.sfxBus)
    osc.start(now)
    osc.stop(now + duration + 0.03)
  }

  private whoosh(volume: number, duration = 0.24, filterFrequency = 1200): void {
    if (!this.ctx || !this.sfxBus || !this.noise) return
    const now = this.ctx.currentTime
    const source = this.ctx.createBufferSource()
    source.buffer = this.noise
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(filterFrequency, now)
    filter.frequency.exponentialRampToValueAtTime(260, now + duration)
    filter.Q.value = 1.1
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus)
    source.start(now)
    source.stop(now + duration)
  }

  sfx(name: Sfx): void {
    if (!this.unlocked) return
    switch (name) {
      case 'jump':
        this.tone(330, 0.13, 'sine', 0.12, 620)
        break
      case 'land':
        this.tone(120, 0.08, 'sine', 0.09, 70)
        this.whoosh(0.05, 0.1, 500)
        break
      case 'shoot':
        this.tone(880, 0.09, 'square', 0.07, 260)
        this.tone(1400, 0.05, 'sine', 0.04, 700)
        break
      case 'hit':
        this.tone(220, 0.09, 'square', 0.06, 110)
        break
      case 'hurt':
        this.tone(180, 0.24, 'sawtooth', 0.1, 62)
        this.whoosh(0.08, 0.2, 300)
        break
      case 'collect':
        this.tone(880, 0.08, 'sine', 0.07, 1320)
        break
      case 'shard':
        this.tone(1046.5, 0.06, 'triangle', 0.055, 1568)
        break
      case 'dash':
        this.whoosh(0.14, 0.22, 1900)
        this.tone(280, 0.12, 'sine', 0.04, 900)
        break
      case 'checkpoint':
        ;[523.25, 659.25, 783.99].forEach((frequency, index) =>
          this.tone(frequency, 0.42, 'sine', 0.07, undefined, index * 0.09),
        )
        break
      case 'pickup':
        ;[392, 523.25, 659.25, 1046.5].forEach((frequency, index) =>
          this.tone(frequency, 0.24, 'triangle', 0.06, undefined, index * 0.07),
        )
        break
      case 'gate':
        this.tone(160, 0.35, 'sawtooth', 0.06, 70)
        this.whoosh(0.08, 0.35, 420)
        break
      case 'victory':
        ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) =>
          this.tone(frequency, 0.55, 'triangle', 0.075, undefined, index * 0.13),
        )
        break
      case 'click':
        this.tone(640, 0.045, 'sine', 0.045, 840)
        break
      case 'error':
        this.tone(220, 0.16, 'square', 0.05, 150)
        break
    }
  }

  suspend(): void {
    void this.ctx?.suspend().catch(() => undefined)
  }

  resume(): void {
    void this.ctx?.resume().catch(() => undefined)
  }

  destroy(): void {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = null
    this.pad.forEach((osc) => {
      try {
        osc.stop()
      } catch {
        // already stopped
      }
    })
    this.pad = []
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
  }
}

export const audio = new AudioEngine()
