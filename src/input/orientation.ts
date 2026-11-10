export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(pointer: coarse)').matches === true ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  )
}

export class OrientationManager {
  private media: MediaQueryList | null = null
  private onChange?: (portrait: boolean) => void
  private portrait = false
  private started = false

  start(onChange?: (portrait: boolean) => void): void {
    if (this.started) return
    this.started = true
    this.onChange = onChange
    if (typeof window === 'undefined') return
    this.media = window.matchMedia('(orientation: portrait)')
    this.media.addEventListener?.('change', this.refresh)
    window.addEventListener('resize', this.refresh)
    window.addEventListener('orientationchange', this.refresh)
    this.refresh()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    this.media?.removeEventListener?.('change', this.refresh)
    window.removeEventListener('resize', this.refresh)
    window.removeEventListener('orientationchange', this.refresh)
    document.body.classList.remove('gg-portrait')
  }

  private refresh = (): void => {
    const portrait = this.shouldBlock()
    if (portrait === this.portrait && document.body.classList.contains('gg-portrait') === portrait) {
      return
    }
    this.portrait = portrait
    document.body.classList.toggle('gg-portrait', portrait)
    this.onChange?.(portrait)
  }

  shouldBlock(): boolean {
    if (typeof window === 'undefined') return false
    if (!isTouchDevice()) return false
    return window.innerHeight > window.innerWidth
  }

  get isPortrait(): boolean {
    return this.portrait
  }

  /**
   * Must be called from an explicit user gesture. In a cross-origin arcade frame
   * both fullscreen and orientation lock can be refused; the CSS overlay is the
   * fallback and the only requirement we enforce ourselves.
   */
  async requestLandscape(element?: HTMLElement): Promise<boolean> {
    if (!isTouchDevice() || typeof document === 'undefined') return false
    try {
      const target = element ?? document.documentElement
      if (!document.fullscreenElement && target.requestFullscreen) {
        await target.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      // Fullscreen refusal is routine inside an iframe.
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>
      }
      if (orientation?.lock) {
        await orientation.lock('landscape')
        return true
      }
    } catch {
      // The portrait overlay still enforces landscape presentation.
    }
    return false
  }
}

export const orientation = new OrientationManager()
