/**
 * End-to-end integration tests across all 3 cases, all 4 endings, replay cycles, and storage.
 */
import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { getElements, render } from './renderer'
import {
  advanceCase,
  callRequester,
  closeTicket,
  initialState,
  inspectAudit,
  replayCase,
  replayShift,
  resolveCase,
} from './state'
import { defaultProfile, loadProfile, saveProfile, unlockEndingInProfile } from './storage'
import { mountConsoleDOM } from './test-dom'
import type { ChoiceKey, EndingId } from './types'

describe('Integration Tests — Full 3-Case Night Shift', () => {
  beforeEach(() => {
    mountConsoleDOM()
    window.localStorage.clear()
  })

  const endingScenarios: ReadonlyArray<{
    name: string
    choices: [ChoiceKey, ChoiceKey, ChoiceKey]
    expectedEnding: EndingId
    expectedClock: string
  }> = [
    {
      name: 'Ending I: The Quiet Shift (full compliance)',
      choices: ['comply', 'comply', 'comply'],
      expectedEnding: 'quiet-shift',
      expectedClock: '07:00',
    },
    {
      name: 'Ending II: Extension 419 (full defiance)',
      choices: ['defy', 'defy', 'defy'],
      expectedEnding: 'extension-419',
      expectedClock: '03:07',
    },
    {
      name: 'Ending III: Split Session (mixed + approve handover)',
      choices: ['defy', 'comply', 'comply'],
      expectedEnding: 'split-session',
      expectedClock: '03:21',
    },
    {
      name: 'Ending IV: Audit Exception (mixed + pull power)',
      choices: ['comply', 'defy', 'defy'],
      expectedEnding: 'audit-exception',
      expectedClock: '03:00',
    },
  ]

  for (const scenario of endingScenarios) {
    test(`completes ${scenario.name}`, () => {
      const els = getElements()
      let state = initialState('Pakorn')

      for (const choice of scenario.choices) {
        render(state, els)
        expect(els.auditTrail.hidden).toBe(true)

        state = inspectAudit(state)
        render(state, els)
        expect(els.auditTrail.hidden).toBe(false)
        expect(els.closeButton.disabled).toBe(false)
        expect(els.callButton.disabled).toBe(false)

        state = resolveCase(state, choice)
        render(state, els)
        expect(els.caseOutcome.hidden).toBe(false)

        state = advanceCase(state)
      }

      expect(state.phase).toBe('shift-complete')
      if (state.phase === 'shift-complete') {
        expect(state.endingId).toBe(scenario.expectedEnding)
      }

      render(state, els, [scenario.expectedEnding])
      expect(els.shiftDossier.hidden).toBe(false)
      expect(els.clock.textContent).toBe(scenario.expectedClock)
      expect(els.dossierClock.textContent).toBe(scenario.expectedClock)

      // Full shift replay returns cleanly to Case 1 03:00 preserving custom name
      state = replayShift(state)
      render(state, els, [scenario.expectedEnding])
      expect(state.phase).toBe('initial')
      expect(els.clock.textContent).toBe('03:00')
      expect(els.auditTrail.hidden).toBe(true)
      expect(els.shiftDossier.hidden).toBe(true)
      expect(els.analystNameInput.value).toBe('Pakorn')
    })
  }

  test('Case 1 immediate replay allows testing Close then Call cleanly', () => {
    const els = getElements()
    let s = initialState('A. Mercer')
    s = closeTicket(inspectAudit(s))
    render(s, els)
    expect(els.clock.textContent).toBe('03:07')

    s = replayCase(s)
    render(s, els)
    expect(els.clock.textContent).toBe('03:00')
    expect(els.auditTrail.hidden).toBe(true)

    s = callRequester(inspectAudit(s))
    render(s, els)
    expect(els.clock.textContent).toBe('03:00')
    expect(els.phoneSprite.dataset.state).toBe('ringing')
  })

  test('Profile storage persists unlocked endings & recovers safely from corrupted JSON', () => {
    let profile = defaultProfile()
    profile = unlockEndingInProfile(profile, 'quiet-shift')
    profile = unlockEndingInProfile(profile, 'quiet-shift') // idempotent
    profile = unlockEndingInProfile(profile, 'extension-419')
    saveProfile({ ...profile, analystName: 'Pakorn' })

    const loaded = loadProfile()
    expect(loaded.analystName).toBe('Pakorn')
    expect(loaded.unlockedEndings).toEqual(['quiet-shift', 'extension-419'])

    // Corrupted JSON falls back cleanly without throwing
    window.localStorage.setItem('night-shift-help-desk:v1', '{not-valid-json')
    const recovered = loadProfile()
    expect(recovered.unlockedEndings).toEqual([])
  })

  test('Property 8: Multiple consecutive replay cycles preserve full reset invariants', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (cycles) => {
        const els = getElements()
        let s = initialState('A. Mercer')

        for (let i = 0; i < cycles; i++) {
          s = closeTicket(inspectAudit(s))
          s = replayShift(s)
          render(s, els)
          if (s.phase !== 'initial') return false
          if (els.clock.textContent !== '03:00') return false
          if (!els.auditTrail.hidden) return false
          if (els.inspectButton.disabled) return false
        }
        return true
      }),
      { numRuns: 40 },
    )
  })
})
