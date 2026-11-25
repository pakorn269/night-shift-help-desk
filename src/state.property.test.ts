/**
 * Property-based tests for state machine
 * Tests universal properties that should hold across all valid inputs
 */
import { describe, test } from 'vitest'
import fc from 'fast-check'
import {
  inspectAudit,
  closeTicket,
  callRequester,
  replay
} from './state'

/**
 * Arbitrary generator for valid game states
 */
const gameStateArb = fc.oneof(
  fc.constant({ phase: 'initial' as const }),
  fc.constant({ phase: 'audit-inspected' as const }),
  fc.record({
    phase: fc.constant('resolved-close' as const),
    firstClosureTimestamp: fc.integer({ min: 0, max: Date.now() })
  }),
  fc.constant({ phase: 'resolved-call' as const })
)

describe('Property-Based Tests', () => {
  describe('Property 1: Invalid State Transitions Preserve State', () => {
    test('inspectAudit returns referentially equal state when precondition not met', () => {
      fc.assert(
        fc.property(gameStateArb, (state) => {
          // inspectAudit only valid from initial
          if (state.phase !== 'initial') {
            const result = inspectAudit(state)
            // Should return exact same reference
            return result === state
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('closeTicket returns referentially equal state when precondition not met', () => {
      fc.assert(
        fc.property(gameStateArb, (state) => {
          // closeTicket only valid from audit-inspected
          if (state.phase !== 'audit-inspected') {
            const result = closeTicket(state)
            // Should return exact same reference
            return result === state
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('callRequester returns referentially equal state when precondition not met', () => {
      fc.assert(
        fc.property(gameStateArb, (state) => {
          // callRequester only valid from audit-inspected
          if (state.phase !== 'audit-inspected') {
            const result = callRequester(state)
            // Should return exact same reference
            return result === state
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('replay returns referentially equal state when precondition not met', () => {
      fc.assert(
        fc.property(gameStateArb, (state) => {
          // replay only valid from resolved-close or resolved-call
          if (state.phase !== 'resolved-close' && state.phase !== 'resolved-call') {
            const result = replay(state)
            // Should return exact same reference
            return result === state
          }
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('all transitions preserve state when invalid', () => {
      fc.assert(
        fc.property(gameStateArb, (state) => {
          const transitions = [inspectAudit, closeTicket, callRequester, replay]
          
          // For each transition, if it's invalid for this state, it should return same reference
          return transitions.every(transition => {
            const result = transition(state)
            // If result phase matches input phase, should be same reference
            if (result.phase === state.phase) {
              return result === state
            }
            return true
          })
        }),
        { numRuns: 100 }
      )
    })
  })
})
