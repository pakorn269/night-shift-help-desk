/**
 * Unit tests for NightShiftAudio and JuiceController safety in headless/browser environments.
 */
import { describe, test, expect } from 'vitest'
import { NightShiftAudio } from './audio'
import { JuiceController } from './juice'

describe('Audio & Juice Safety', () => {
  test('NightShiftAudio operates safely when Web Audio API is unavailable', () => {
    const audio = new NightShiftAudio(false, 0.7)
    expect(() => {
      audio.unlock()
      audio.setVolume(0.5)
      audio.setVolume(2.0) // clamps
      audio.setVolume(-1) // clamps
      audio.setDreadLevel(0)
      audio.setDreadLevel(3)
      audio.playClick()
      audio.playAuditReveal()
      audio.playClockJump()
      audio.playPhoneRingOnce()
      audio.startPhoneRing()
      audio.playPhonePickup()
      audio.stopPhoneRing()
      audio.playCaseAdvance()
      audio.playEndingStinger('quiet-shift')
      audio.playEndingStinger('extension-419')
      audio.playEndingStinger('split-session')
      audio.playEndingStinger('audit-exception')
      audio.setMuted(true)
    }).not.toThrow()
  })

  test('JuiceController respects reducedMotion and never mutates DOM when enabled', () => {
    const target = document.createElement('div')
    const juice = new JuiceController(true)
    juice.setTarget(target)
    juice.trigger('large', target)
    expect(target.style.transform).toBe('')
    expect(target.classList.contains('juice-clock-jump')).toBe(false)
  })
})
