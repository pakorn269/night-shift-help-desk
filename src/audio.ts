/**
 * Procedural Web Audio Mixer for Night Shift Help Desk.
 * Implements bus architecture (Master <- {Ambience, SFX, UI}), squared slider-to-gain
 * curve, soft master limiting, adaptive vertical dread layering, and pitch-randomized SFX.
 * Zero external files; completely optional (no audio-only clues).
 */
import type { DreadLevel, EndingId } from './types'

export class NightShiftAudio {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private ambienceBus: GainNode | null = null
  private sfxBus: GainNode | null = null
  private uiBus: GainNode | null = null

  // Adaptive ambience layers
  private dreadGain: GainNode | null = null
  private roomToneStarted = false

  private muted: boolean
  private volume: number // 0..1 slider value
  private currentDread: DreadLevel = 0
  private ringInterval: number | null = null

  constructor(muted = false, volume = 0.65) {
    this.muted = muted
    this.volume = Math.min(1, Math.max(0, volume))
  }

  /**
   * Initializes AudioContext lazily on first user gesture to satisfy browser autoplay rules.
   */
  public unlock(): void {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!this.ctx) {
      this.ctx = new AudioCtx()
      const limiter = this.ctx.createDynamicsCompressor()
      limiter.threshold.value = -3
      limiter.knee.value = 6
      limiter.ratio.value = 12
      limiter.attack.value = 0.003
      limiter.release.value = 0.15

      this.masterGain = this.ctx.createGain()
      this.ambienceBus = this.ctx.createGain()
      this.sfxBus = this.ctx.createGain()
      this.uiBus = this.ctx.createGain()

      // Balanced bus headroom
      this.ambienceBus.gain.value = 0.38
      this.sfxBus.gain.value = 0.8
      this.uiBus.gain.value = 0.55

      this.ambienceBus.connect(this.masterGain)
      this.sfxBus.connect(this.masterGain)
      this.uiBus.connect(this.masterGain)
      this.masterGain.connect(limiter)
      limiter.connect(this.ctx.destination)

      this.applyMasterGain()
      this.startAdaptiveAmbience()
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
  }

  /**
   * Squared slider-to-gain curve so perceived loudness moves evenly across 0..1.
   */
  private applyMasterGain(): void {
    if (!this.ctx || !this.masterGain) return
    const linear = this.muted ? 0 : this.volume * this.volume
    this.masterGain.gain.setTargetAtTime(linear, this.ctx.currentTime, 0.04)
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.stopPhoneRing()
    this.applyMasterGain()
  }

  public setVolume(slider01: number): void {
    this.volume = Math.min(1, Math.max(0, slider01))
    this.applyMasterGain()
  }

  public setDreadLevel(level: DreadLevel): void {
    this.currentDread = level
    if (!this.ctx || !this.dreadGain) return
    // Vertical layering: subtle detuned sub-harmonic swells gently with dread (0 -> 3)
    const targets = [0.0, 0.09, 0.19, 0.31] as const
    this.dreadGain.gain.setTargetAtTime(targets[level], this.ctx.currentTime, 0.8)
  }

  private startAdaptiveAmbience(): void {
    if (!this.ctx || !this.ambienceBus || this.roomToneStarted) return
    this.roomToneStarted = true
    const now = this.ctx.currentTime

    // Layer 1: Quiet office 60Hz fluorescent ballast hum + soft harmonic
    const hum = this.ctx.createOscillator()
    hum.type = 'sine'
    hum.frequency.value = 60
    const humGain = this.ctx.createGain()
    humGain.gain.value = 0.075
    hum.connect(humGain)
    humGain.connect(this.ambienceBus)
    hum.start(now)

    const humHarmonic = this.ctx.createOscillator()
    humHarmonic.type = 'triangle'
    humHarmonic.frequency.value = 120.4
    const harmonicGain = this.ctx.createGain()
    harmonicGain.gain.value = 0.02
    humHarmonic.connect(harmonicGain)
    harmonicGain.connect(this.ambienceBus)
    humHarmonic.start(now)

    // Layer 2: Filtered HVAC / server room airflow noise
    const bufLen = this.ctx.sampleRate * 2
    const noiseBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + 0.04 * white) / 1.04
      lastOut = data[i]
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = noiseBuf
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 260
    filter.Q.value = 0.9
    const noiseGain = this.ctx.createGain()
    noiseGain.gain.value = 0.14
    noise.connect(filter)
    filter.connect(noiseGain)
    noiseGain.connect(this.ambienceBus)
    noise.start(now)

    // Layer 3: Adaptive eerie sub-harmonic dread drone (faded vertically by dread level)
    this.dreadGain = this.ctx.createGain()
    this.dreadGain.gain.value = 0
    const droneA = this.ctx.createOscillator()
    const droneB = this.ctx.createOscillator()
    droneA.type = 'sine'
    droneB.type = 'triangle'
    droneA.frequency.value = 46.25 // F#1
    droneB.frequency.value = 47.1 // Slow unsettling 0.85 Hz beat frequency!
    const droneFilter = this.ctx.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 180
    droneA.connect(droneFilter)
    droneB.connect(droneFilter)
    droneFilter.connect(this.dreadGain)
    this.dreadGain.connect(this.ambienceBus)
    droneA.start(now)
    droneB.start(now)

    this.setDreadLevel(this.currentDread)
  }

  /**
   * Subtle pitch-randomized mechanical key click for tabs/buttons.
   */
  public playClick(): void {
    this.unlock()
    if (!this.ctx || !this.uiBus || this.muted) return
    const now = this.ctx.currentTime
    const jitter = 0.94 + Math.random() * 0.12
    const volJitter = 0.85 + Math.random() * 0.25

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(760 * jitter, now)
    osc.frequency.exponentialRampToValueAtTime(190 * jitter, now + 0.032)

    gain.gain.setValueAtTime(0.14 * volJitter, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.036)

    osc.connect(gain)
    gain.connect(this.uiBus)
    osc.start(now)
    osc.stop(now + 0.04)
  }

  /**
   * Forensic audit trail reveal — quiet cold terminal tone + subtle low thump.
   */
  public playAuditReveal(): void {
    this.unlock()
    if (!this.ctx || !this.sfxBus || this.muted) return
    const now = this.ctx.currentTime

    const freqs = [330, 311.13] // Subtle minor second tension!
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxBus) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, now + idx * 0.07)
      gain.gain.setValueAtTime(0.001, now + idx * 0.07)
      gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.07 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.34)
      osc.connect(gain)
      gain.connect(this.sfxBus)
      osc.start(now + idx * 0.07)
      osc.stop(now + idx * 0.07 + 0.36)
    })
  }

  /**
   * Supernatural clock jump / rewrite pulse (03:00 -> 03:07).
   */
  public playClockJump(): void {
    this.unlock()
    if (!this.ctx || !this.sfxBus || this.muted) return
    const now = this.ctx.currentTime

    // Soft electrical relay snap + detuned descending sine
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(620, now)
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.45)

    osc.frequency.setValueAtTime(148, now)
    osc.frequency.exponentialRampToValueAtTime(73.4, now + 0.45)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus)
    osc.start(now)
    osc.stop(now + 0.52)
  }

  /**
   * Authentic muffled corporate VoIP double-ring burst (440Hz + 480Hz modulated at 20Hz).
   */
  public playPhoneRingOnce(): void {
    this.unlock()
    if (!this.ctx || !this.sfxBus || this.muted) return
    const now = this.ctx.currentTime

    const ringBurst = (offset: number, duration: number) => {
      if (!this.ctx || !this.sfxBus) return
      const oscA = this.ctx.createOscillator()
      const oscB = this.ctx.createOscillator()
      const lfo = this.ctx.createOscillator()
      const lfoGain = this.ctx.createGain()
      const env = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()

      oscA.frequency.value = 440
      oscB.frequency.value = 480
      lfo.frequency.value = 20
      lfoGain.gain.value = 0.06
      filter.type = 'bandpass'
      filter.frequency.value = 720
      filter.Q.value = 1.4

      env.gain.setValueAtTime(0.001, now + offset)
      env.gain.linearRampToValueAtTime(0.11, now + offset + 0.025)
      env.gain.setValueAtTime(0.11, now + offset + duration - 0.03)
      env.gain.exponentialRampToValueAtTime(0.001, now + offset + duration)

      lfo.connect(lfoGain)
      lfoGain.connect(env.gain)
      oscA.connect(filter)
      oscB.connect(filter)
      filter.connect(env)
      env.connect(this.sfxBus)

      oscA.start(now + offset)
      oscB.start(now + offset)
      lfo.start(now + offset)
      oscA.stop(now + offset + duration + 0.02)
      oscB.stop(now + offset + duration + 0.02)
      lfo.stop(now + offset + duration + 0.02)
    }

    ringBurst(0, 0.36)
    ringBurst(0.46, 0.36)
  }

  public startPhoneRing(): void {
    if (this.ringInterval !== null) return
    this.playPhoneRingOnce()
    if (typeof window !== 'undefined') {
      this.ringInterval = window.setInterval(() => {
        if (!this.muted) this.playPhoneRingOnce()
      }, 3400)
    }
  }

  public stopPhoneRing(): void {
    if (this.ringInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ringInterval)
      this.ringInterval = null
    }
  }

  /**
   * Eerie muffled VoIP receiver pickup: brief handset thud + filtered room-tone hiss
   * + 4 faint ghostly keyboard clicks echoing back across Ext. 419.
   */
  public playPhonePickup(): void {
    this.unlock()
    this.stopPhoneRing()
    if (!this.ctx || !this.sfxBus || this.muted) return
    const now = this.ctx.currentTime

    // Handset lift click
    const clickOsc = this.ctx.createOscillator()
    const clickGain = this.ctx.createGain()
    clickOsc.type = 'triangle'
    clickOsc.frequency.setValueAtTime(240, now)
    clickOsc.frequency.exponentialRampToValueAtTime(75, now + 0.06)
    clickGain.gain.setValueAtTime(0.18, now)
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07)
    clickOsc.connect(clickGain)
    clickGain.connect(this.sfxBus)
    clickOsc.start(now)
    clickOsc.stop(now + 0.08)

    // Brief telephone bandpassed static bed
    const len = Math.floor(this.ctx.sampleRate * 1.4)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.25
    }
    const staticSrc = this.ctx.createBufferSource()
    staticSrc.buffer = buf
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1150
    bp.Q.value = 2.2
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(0.001, now + 0.05)
    env.gain.linearRampToValueAtTime(0.08, now + 0.15)
    env.gain.setValueAtTime(0.07, now + 1.1)
    env.gain.exponentialRampToValueAtTime(0.001, now + 1.42)
    staticSrc.connect(bp)
    bp.connect(env)
    env.connect(this.sfxBus)
    staticSrc.start(now + 0.05)

    // Faint distant keystrokes echoing through the phone receiver
    ;[0.32, 0.51, 0.68, 0.94].forEach((offset) => {
      if (!this.ctx || !this.sfxBus) return
      const key = this.ctx.createOscillator()
      const kg = this.ctx.createGain()
      key.type = 'square'
      key.frequency.setValueAtTime(1180 + Math.random() * 160, now + offset)
      kg.gain.setValueAtTime(0.035, now + offset)
      kg.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.025)
      key.connect(kg)
      kg.connect(this.sfxBus)
      key.start(now + offset)
      key.stop(now + offset + 0.03)
    })
  }

  /**
   * Ticket advance / queue chime.
   */
  public playCaseAdvance(): void {
    this.unlock()
    if (!this.ctx || !this.uiBus || this.muted) return
    const now = this.ctx.currentTime
    ;[523.25, 659.25].forEach((freq, i) => {
      if (!this.ctx || !this.uiBus) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0.09, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22)
      osc.connect(gain)
      gain.connect(this.uiBus)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.24)
    })
  }

  /**
   * Distinct atmospheric stinger for each of the 4 Shift Endings.
   */
  public playEndingStinger(endingId: EndingId): void {
    this.unlock()
    if (!this.ctx || !this.sfxBus || this.muted) return
    const now = this.ctx.currentTime

    const chords: Record<EndingId, readonly number[]> = {
      'quiet-shift': [220, 261.63, 329.63], // Sterile calm A-minor corporate chime
      'extension-419': [196, 207.65, 293.66], // Haunting minor-second + fifth
      'split-session': [185, 220, 277.18, 282], // Slightly detuned dual unison
      'audit-exception': [146.83, 138.59, 98], // Power-down rollback drop
    }

    chords[endingId].forEach((freq) => {
      if (!this.ctx || !this.sfxBus) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      if (endingId === 'audit-exception') {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.72, now + 1.1)
      }
      filter.type = 'lowpass'
      filter.frequency.value = 640

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.085, now + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.sfxBus)
      osc.start(now)
      osc.stop(now + 1.45)
    })
  }
}
