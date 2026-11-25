/**
 * Property-based tests for the 3-case Night Shift state machine.
 */
import { describe, test } from 'vitest'
import fc from 'fast-check'
import { ALL_ENDINGS, CASE_ORDER } from './content'
import {
  advanceCase,
  callRequester,
  closeTicket,
  computeEndingId,
  initialState,
  inspectAudit,
  replay,
  replayCase,
  resolveCase,
  sanitizeAnalystName,
} from './state'
import type { CaseId, ChoiceKey, GameState } from './types'

const caseIdArb = fc.constantFrom<CaseId>(...CASE_ORDER)
const choiceArb = fc.constantFrom<ChoiceKey>('comply', 'defy')
const endingArb = fc.constantFrom(...ALL_ENDINGS)

const gameStateArb: fc.Arbitrary<GameState> = fc.oneof(
  caseIdArb.map((caseId) => ({
    phase: 'initial' as const,
    caseId,
    activeTab: 'report' as const,
    record: { analystName: 'A. Mercer', choices: {} },
  })),
  caseIdArb.map((caseId) => ({
    phase: 'audit-inspected' as const,
    caseId,
    activeTab: 'audit' as const,
    record: { analystName: 'A. Mercer', choices: {} },
  })),
  fc.tuple(caseIdArb, choiceArb).map(([caseId, choice]) => ({
    phase: 'case-resolved' as const,
    caseId,
    choice,
    activeTab: 'audit' as const,
    record: { analystName: 'A. Mercer', choices: { [caseId]: choice } },
  })),
  endingArb.map((endingId) => ({
    phase: 'shift-complete' as const,
    endingId,
    record: { analystName: 'A. Mercer', choices: {} },
  })),
)

describe('State Machine Property-Based Tests', () => {
  test('Property 1: Invalid transitions always preserve exact state reference', () => {
    fc.assert(
      fc.property(gameStateArb, (state) => {
        if (state.phase !== 'initial' && inspectAudit(state) !== state) return false
        if (state.phase !== 'audit-inspected') {
          if (closeTicket(state) !== state) return false
          if (callRequester(state) !== state) return false
        }
        if (state.phase !== 'case-resolved') {
          if (advanceCase(state) !== state) return false
          if (replayCase(state) !== state) return false
        }
        if (state.phase !== 'case-resolved' && state.phase !== 'shift-complete') {
          if (replay(state) !== state) return false
        }
        return true
      }),
      { numRuns: 200 },
    )
  })

  test('Property 2: Every 3-case path deterministically terminates in a valid EndingId', () => {
    fc.assert(
      fc.property(choiceArb, choiceArb, choiceArb, (c1, c2, c3) => {
        let s = initialState()
        s = advanceCase(resolveCase(inspectAudit(s), c1))
        s = advanceCase(resolveCase(inspectAudit(s), c2))
        s = advanceCase(resolveCase(inspectAudit(s), c3))

        if (s.phase !== 'shift-complete') return false
        const expected = computeEndingId({ 'case-1': c1, 'case-2': c2, 'case-3': c3 })
        return s.endingId === expected && ALL_ENDINGS.includes(s.endingId)
      }),
      { numRuns: 100 },
    )
  })

  test('Property 3: sanitizeAnalystName always returns non-empty safe handle <= 24 chars', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (raw) => {
        const clean = sanitizeAnalystName(raw)
        return (
          clean.length >= 1 &&
          clean.length <= 24 &&
          !clean.includes('<') &&
          !clean.includes('>') &&
          !clean.includes('\n')
        )
      }),
      { numRuns: 200 },
    )
  })
})
