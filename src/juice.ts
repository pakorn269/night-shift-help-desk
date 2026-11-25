/**
 * Proportional game feel ("juice") controller for Night Shift Help Desk.
 * Implements smooth trauma-decay micro-shake (sampled sine, never frame-random buzz),
 * subtle phosphor dip transitions, and clock flip highlights.
 * Strictly honors reduced-motion preferences (zero shake/flashes when enabled).
 */

export type FeedbackTier = 'small' | 'medium' | 'large'

export class JuiceController {
  private reducedMotion: boolean
  private trauma = 0
  private phase = 0
  private rafId: number | null = null
  private lastTime = 0
  private targetEl: HTMLElement | null = null

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion
  }

  public setTarget(el: HTMLElement | null): void {
    this.targetEl = el
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled
    if (enabled) {
      this.trauma = 0
      this.clearTransform()
    }
  }

  public trigger(tier: FeedbackTier, pulseTarget?: HTMLElement | null): void {
    if (this.reducedMotion) return

    if (tier === 'small') {
      this.addClassPulse(pulseTarget, 'juice-pop', 220)
      return
    }

    if (tier === 'medium') {
      this.addTrauma(0.38)
      this.addClassPulse(pulseTarget, 'juice-pop', 260)
      this.triggerVeilDip(160)
      return
    }

    // Large: reality jump / case climax (still restrained — no harsh flashing)
    this.addTrauma(0.68)
    this.addClassPulse(pulseTarget, 'juice-clock-jump', 420)
    this.triggerVeilDip(260)
  }

  private addClassPulse(el: HTMLElement | null | undefined, cls: string, durationMs: number): void {
    if (!el || typeof window === 'undefined') return
    el.classList.remove(cls)
    // Force reflow so repeat triggers re-play smoothly
    void el.offsetWidth
    el.classList.add(cls)
    window.setTimeout(() => el.classList.remove(cls), durationMs)
  }

  private triggerVeilDip(durationMs: number): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    const veil = document.getElementById('phosphor-veil')
    if (!veil) return
    veil.classList.remove('active')
    void veil.offsetWidth
    veil.classList.add('active')
    window.setTimeout(() => veil.classList.remove('active'), durationMs)
  }

  private addTrauma(amount: number): void {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return
    this.trauma = Math.min(1, this.trauma + amount)
    if (this.rafId === null) {
      this.lastTime = performance.now()
      this.rafId = window.requestAnimationFrame(this.tick)
    }
  }

  private tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000)
    this.lastTime = now

    this.trauma = Math.max(0, this.trauma - dt * 2.4)
    if (this.trauma <= 0.005 || this.reducedMotion) {
      this.trauma = 0
      this.clearTransform()
      this.rafId = null
      return
    }

    const shake = this.trauma * this.trauma // Quadratic decay: crisp peak, calm settle
    this.phase += dt * 36
    const offsetX = (Math.sin(this.phase * 1.7) * 4.5 * shake).toFixed(2)
    const offsetY = (Math.sin(this.phase * 2.3) * 3.0 * shake).toFixed(2)

    if (this.targetEl) {
      this.targetEl.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`
    }
    this.rafId = window.requestAnimationFrame(this.tick)
  }

  private clearTransform(): void {
    if (this.targetEl) {
      this.targetEl.style.transform = ''
    }
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
