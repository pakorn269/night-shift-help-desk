/**
 * Unit tests for Halcyon Desk DOM Renderer and Piskel sprite state wiring.
 */
import { describe, test, expect, beforeEach } from 'vitest'
import { getElements, render, renderPreferences } from './renderer'
import {
  advanceCase,
  answerPhone,
  callRequester,
  closeTicket,
  initialState,
  inspectAudit,
  resolveCase,
} from './state'
import { mountConsoleDOM } from './test-dom'

describe('Renderer', () => {
  beforeEach(() => {
    mountConsoleDOM()
  })

  test('getElements queries all required elements and fails fast when missing', () => {
    const els = getElements()
    expect(els.clock).toBeDefined()
    expect(els.cctvSprite).toBeDefined()
    expect(els.phoneSprite).toBeDefined()
    expect(els.coffeeSprite).toBeDefined()

    document.getElementById('clock')?.remove()
    expect(() => getElements()).toThrow('Required element #clock not found')
  })

  test('renders initial Case 1 state cleanly (03:00, hidden audit, idle CCTV & warm coffee)', () => {
    const els = getElements()
    const state = initialState('A. Mercer')
    render(state, els)

    expect(els.clock.textContent).toBe('03:00')
    expect(els.auditTrail.hidden).toBe(true)
    expect(els.inspectButton.disabled).toBe(false)
    expect(els.closeButton.disabled).toBe(true)
    expect(els.callButton.disabled).toBe(true)
    expect(els.caseOutcome.hidden).toBe(true)
    expect(els.shiftDossier.hidden).toBe(true)
    expect(els.cctvSprite.dataset.mode).toBe('idle')
    expect(els.coffeeSprite.dataset.state).toBe('warm')
    expect(els.phoneSprite.dataset.state).toBe('idle')
    expect(els.queueList.children.length).toBe(3)
  })

  test('renders Case 1 audit-inspected state with custom analyst name and anomaly CCTV', () => {
    const els = getElements()
    const state = inspectAudit(initialState('Pakorn'))
    render(state, els)

    expect(els.auditTrail.hidden).toBe(false)
    expect(els.auditList.children.length).toBe(1)
    expect(els.auditList.children[0].textContent).toContain('03:07')
    expect(els.auditList.children[0].textContent).toContain('Pakorn')
    expect(els.closeButton.disabled).toBe(false)
    expect(els.callButton.disabled).toBe(false)
    expect(els.cctvSprite.dataset.mode).toBe('anomaly')
  })

  test('renders Case 1 Close outcome with 03:07 clock jump, duplicate rows, and frozen coffee', () => {
    const els = getElements()
    const state = closeTicket(inspectAudit(initialState('A. Mercer')))
    render(state, els)

    expect(els.clock.textContent).toBe('03:07')
    expect(els.auditList.children.length).toBe(2)
    expect(els.caseOutcome.hidden).toBe(false)
    expect(els.caseOutcome.dataset.choice).toBe('comply')
    expect(els.controls.hidden).toBe(true)
    expect(els.coffeeSprite.dataset.state).toBe('frozen')
  })

  test('renders Case 1 Call outcome with phantom INC-0419, ringing phone, and interactive VoIP transcript on answer', () => {
    const els = getElements()
    const state = callRequester(inspectAudit(initialState('Pakorn')))
    render(state, els)

    expect(els.clock.textContent).toBe('03:00')
    expect(els.auditList.children.length).toBe(1)
    expect(els.auditList.children[0].textContent).toContain('New ticket from your extension')
    expect(els.queueList.children.length).toBe(4)
    expect(els.queueList.children[3].textContent).toContain('INC-0419')
    expect(els.phoneSprite.dataset.state).toBe('ringing')
    expect(els.phoneAnswerButton.hidden).toBe(false)
    expect(els.voipTranscript.hidden).toBe(true)

    const answered = answerPhone(state)
    render(answered, els)
    expect(els.phoneAnswerButton.hidden).toBe(true)
    expect(els.voipTranscript.hidden).toBe(false)
    expect(els.voipTranscriptLines.textContent).toContain('Pakorn')
    expect(els.cctvModalSprite.style.backgroundImage).toContain('./sprites/cctv-workstation.png')
  })

  test('renders Final Shift Dossier with 4-ending gallery and unlocked counter', () => {
    const els = getElements()
    let s = initialState('Pakorn')
    s = advanceCase(resolveCase(inspectAudit(s), 'defy'))
    s = advanceCase(resolveCase(inspectAudit(s), 'defy'))
    s = advanceCase(resolveCase(inspectAudit(s), 'defy'))

    render(s, els, ['extension-419'])
    expect(els.workbench.hidden).toBe(true)
    expect(els.shiftDossier.hidden).toBe(false)
    expect(els.dossierTitle.textContent).toBe('Extension 419')
    expect(els.dossierLedger.children.length).toBe(3)
    expect(els.dossierGallery.children.length).toBe(4)
    expect(els.endingsCounter.textContent).toBe('1 / 4 ENDINGS')
    expect(els.brandLogo.dataset.dread).toBe('3')
    expect(els.analystBadgeSprite.dataset.dread).toBe('3')
  })

  test('renderPreferences toggles reduced-motion data attribute and mute state', () => {
    const els = getElements()
    renderPreferences({ muted: true, volume: 0.4, reducedMotion: true }, els)
    expect(document.documentElement.dataset.reducedMotion).toBe('true')
    expect(els.muteButton.textContent).toBe('Audio: OFF')
    expect(els.volumeSlider.disabled).toBe(true)
    expect(els.motionButton.textContent).toBe('Calm: ON')
  })
})
