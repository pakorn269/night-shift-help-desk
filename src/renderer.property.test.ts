/**
 * Property-based tests for DOM renderer invariants.
 */
import { describe, test, beforeEach } from 'vitest'
import fc from 'fast-check'
import { getElements, render } from './renderer'
import {
  advanceCase,
  callRequester,
  closeTicket,
  initialState,
  inspectAudit,
  resolveCase,
} from './state'
import { mountConsoleDOM } from './test-dom'
import type { ChoiceKey } from './types'

const safeNameArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 ._-]{1,14}$/)
  .filter((s) => s.trim().length >= 2)
const choiceArb = fc.constantFrom<ChoiceKey>('comply', 'defy')

describe('Renderer Property-Based Tests', () => {
  beforeEach(() => {
    mountConsoleDOM()
  })

  test('Property 4: Case 1 inspect always reveals 03:07 timestamp and custom analyst name', () => {
    fc.assert(
      fc.property(safeNameArb, (name) => {
        const els = getElements()
        const inspected = inspectAudit(initialState(name))
        render(inspected, els)

        if (els.auditTrail.hidden) return false
        if (els.auditList.children.length !== 1) return false
        const rowText = els.auditList.children[0].textContent ?? ''
        return (
          rowText.includes('03:07') &&
          rowText.includes(name.trim()) &&
          !els.closeButton.disabled &&
          !els.callButton.disabled
        )
      }),
      { numRuns: 50 },
    )
  })

  test('Property 5: Case 1 close always jumps clock to 03:07 with duplicate entries', () => {
    fc.assert(
      fc.property(safeNameArb, (name) => {
        const els = getElements()
        const closed = closeTicket(inspectAudit(initialState(name)))
        render(closed, els)

        if (els.clock.textContent !== '03:07') return false
        if (els.auditList.children.length !== 2) return false
        if (els.coffeeSprite.dataset.state !== 'frozen') return false
        return (
          (els.auditList.children[0].textContent ?? '').includes('03:07') &&
          (els.auditList.children[1].textContent ?? '').includes('03:07')
        )
      }),
      { numRuns: 50 },
    )
  })

  test('Property 6: Case 1 call always removes 03:07 closure, adds phantom queue item, and rings phone', () => {
    fc.assert(
      fc.property(safeNameArb, (name) => {
        const els = getElements()
        const called = callRequester(inspectAudit(initialState(name)))
        render(called, els)

        if (els.clock.textContent !== '03:00') return false
        if (els.auditList.children.length !== 1) return false
        const text = els.auditList.children[0].textContent ?? ''
        return (
          !text.includes('Closed by') &&
          text.includes('03:00') &&
          text.includes('New ticket from your extension') &&
          els.phoneSprite.dataset.state === 'ringing' &&
          els.queueList.children.length === 4
        )
      }),
      { numRuns: 50 },
    )
  })

  test('Property 7: Every completed 3-case path renders Shift Dossier and hides Workbench', () => {
    fc.assert(
      fc.property(choiceArb, choiceArb, choiceArb, (c1, c2, c3) => {
        const els = getElements()
        let s = initialState('A. Mercer')
        s = advanceCase(resolveCase(inspectAudit(s), c1))
        s = advanceCase(resolveCase(inspectAudit(s), c2))
        s = advanceCase(resolveCase(inspectAudit(s), c3))
        render(s, els)

        return (
          els.workbench.hidden &&
          !els.shiftDossier.hidden &&
          els.dossierLedger.children.length === 3 &&
          els.dossierGallery.children.length === 4
        )
      }),
      { numRuns: 40 },
    )
  })
})
