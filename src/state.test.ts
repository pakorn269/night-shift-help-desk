/**
 * Unit tests for state machine transitions
 */
import { describe, test, expect } from 'vitest'
import {
  initialState,
  inspectAudit,
  closeTicket,
  callRequester,
  replay,
  type GameState
} from './state'

describe('State Machine', () => {
  describe('initialState', () => {
    test('returns initial phase', () => {
      const state = initialState()
      expect(state.phase).toBe('initial')
    })
  })

  describe('inspectAudit', () => {
    test('transitions from initial to audit-inspected', () => {
      const state: GameState = { phase: 'initial' }
      const result = inspectAudit(state)
      expect(result.phase).toBe('audit-inspected')
    })

    test('returns unchanged state when not in initial phase', () => {
      const state: GameState = { phase: 'audit-inspected' }
      const result = inspectAudit(state)
      expect(result).toBe(state)
    })

    test('does not transition from resolved-close', () => {
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      const result = inspectAudit(state)
      expect(result).toBe(state)
    })
  })

  describe('closeTicket', () => {
    test('transitions from audit-inspected to resolved-close with timestamp', () => {
      const state: GameState = { phase: 'audit-inspected' }
      const result = closeTicket(state)
      expect(result.phase).toBe('resolved-close')
      if (result.phase === 'resolved-close') {
        expect(result.firstClosureTimestamp).toBeGreaterThan(0)
        expect(result.firstClosureTimestamp).toBeLessThanOrEqual(Date.now())
      }
    })

    test('returns unchanged state when not in audit-inspected phase', () => {
      const state: GameState = { phase: 'initial' }
      const result = closeTicket(state)
      expect(result).toBe(state)
    })

    test('prevents duplicate close actions', () => {
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      const result = closeTicket(state)
      expect(result).toBe(state)
    })
  })

  describe('callRequester', () => {
    test('transitions from audit-inspected to resolved-call', () => {
      const state: GameState = { phase: 'audit-inspected' }
      const result = callRequester(state)
      expect(result.phase).toBe('resolved-call')
    })

    test('returns unchanged state when not in audit-inspected phase', () => {
      const state: GameState = { phase: 'initial' }
      const result = callRequester(state)
      expect(result).toBe(state)
    })

    test('does not transition from resolved-call', () => {
      const state: GameState = { phase: 'resolved-call' }
      const result = callRequester(state)
      expect(result).toBe(state)
    })
  })

  describe('replay', () => {
    test('transitions from resolved-close to initial', () => {
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      const result = replay(state)
      expect(result.phase).toBe('initial')
    })

    test('transitions from resolved-call to initial', () => {
      const state: GameState = { phase: 'resolved-call' }
      const result = replay(state)
      expect(result.phase).toBe('initial')
    })

    test('returns unchanged state when not in resolved phase', () => {
      const state: GameState = { phase: 'initial' }
      const result = replay(state)
      expect(result).toBe(state)
    })

    test('does not replay from audit-inspected', () => {
      const state: GameState = { phase: 'audit-inspected' }
      const result = replay(state)
      expect(result).toBe(state)
    })
  })

  describe('Complete game flow', () => {
    test('close decision path', () => {
      let state = initialState()
      expect(state.phase).toBe('initial')

      state = inspectAudit(state)
      expect(state.phase).toBe('audit-inspected')

      state = closeTicket(state)
      expect(state.phase).toBe('resolved-close')

      state = replay(state)
      expect(state.phase).toBe('initial')
    })

    test('call decision path', () => {
      let state = initialState()
      expect(state.phase).toBe('initial')

      state = inspectAudit(state)
      expect(state.phase).toBe('audit-inspected')

      state = callRequester(state)
      expect(state.phase).toBe('resolved-call')

      state = replay(state)
      expect(state.phase).toBe('initial')
    })
  })
})
