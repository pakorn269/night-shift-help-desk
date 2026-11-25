/**
 * Integration tests for complete game flows
 */
import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { getElements, render, renderTicketContent, renderEndingContent } from './renderer'
import { initialState, inspectAudit, closeTicket, callRequester, replay } from './state'

describe('Integration Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <div id="clock"></div>
        <div id="ticket-section"></div>
        <div id="ticket-title"></div>
        <div id="ticket-description"></div>
        <div id="ticket-meta"></div>
        <div id="audit-trail"></div>
        <ul id="audit-list"></ul>
        <button id="inspect-button"></button>
        <button id="close-button"></button>
        <button id="call-button"></button>
        <div id="close-ending"></div>
        <div id="close-ending-title"></div>
        <div id="close-ending-body"></div>
        <div id="call-ending"></div>
        <div id="call-ending-title"></div>
        <div id="call-ending-body"></div>
        <button id="close-replay-button"></button>
        <button id="call-replay-button"></button>
      </main>
    `
  })

  describe('Complete game flow - close decision', () => {
    test('follows correct sequence through close decision path', () => {
      const elements = getElements()
      renderTicketContent(elements)
      renderEndingContent(elements)
      
      // Initial state
      let state = initialState()
      render(state, elements)
      expect(state.phase).toBe('initial')
      expect(elements.clock.textContent).toBe('03:00')
      expect(elements.auditTrail.hidden).toBe(true)
      expect(elements.inspectButton.disabled).toBe(false)
      
      // Inspect audit
      state = inspectAudit(state)
      render(state, elements)
      expect(state.phase).toBe('audit-inspected')
      expect(elements.auditTrail.hidden).toBe(false)
      expect(elements.auditList.children.length).toBe(1)
      expect(elements.closeButton.disabled).toBe(false)
      expect(elements.callButton.disabled).toBe(false)
      
      // Close ticket
      state = closeTicket(state)
      render(state, elements)
      expect(state.phase).toBe('resolved-close')
      expect(elements.clock.textContent).toBe('03:07')
      expect(elements.auditList.children.length).toBe(2)
      expect(elements.closeEnding.hidden).toBe(false)
      expect(elements.callEnding.hidden).toBe(true)
      
      // Replay
      state = replay(state)
      render(state, elements)
      expect(state.phase).toBe('initial')
      expect(elements.clock.textContent).toBe('03:00')
      expect(elements.auditTrail.hidden).toBe(true)
    })
  })

  describe('Complete game flow - call decision', () => {
    test('follows correct sequence through call decision path', () => {
      const elements = getElements()
      renderTicketContent(elements)
      renderEndingContent(elements)
      
      // Initial state
      let state = initialState()
      render(state, elements)
      expect(state.phase).toBe('initial')
      
      // Inspect audit
      state = inspectAudit(state)
      render(state, elements)
      expect(state.phase).toBe('audit-inspected')
      
      // Call requester
      state = callRequester(state)
      render(state, elements)
      expect(state.phase).toBe('resolved-call')
      expect(elements.clock.textContent).toBe('03:00')
      expect(elements.auditList.children.length).toBe(1)
      expect(elements.auditList.children[0].textContent).toContain('New ticket from your extension')
      expect(elements.callEnding.hidden).toBe(false)
      expect(elements.closeEnding.hidden).toBe(true)
      
      // Replay
      state = replay(state)
      render(state, elements)
      expect(state.phase).toBe('initial')
    })
  })

  describe('Property 8: Replay Cycle Completeness', () => {
    test('replay from close decision always returns to fully reset initial state', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          
          // Complete close decision path
          let state = initialState()
          state = inspectAudit(state)
          state = closeTicket(state)
          
          // Replay
          state = replay(state)
          render(state, elements)
          
          // Verify full reset to initial conditions
          if (state.phase !== 'initial') return false
          if (elements.clock.textContent !== '03:00') return false
          if (!elements.auditTrail.hidden) return false
          if (elements.inspectButton.disabled) return false
          if (!elements.closeButton.disabled) return false
          if (!elements.callButton.disabled) return false
          if (!elements.closeEnding.hidden) return false
          if (!elements.callEnding.hidden) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('replay from call decision always returns to fully reset initial state', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          
          // Complete call decision path
          let state = initialState()
          state = inspectAudit(state)
          state = callRequester(state)
          
          // Replay
          state = replay(state)
          render(state, elements)
          
          // Verify full reset to initial conditions
          if (state.phase !== 'initial') return false
          if (elements.clock.textContent !== '03:00') return false
          if (!elements.auditTrail.hidden) return false
          if (elements.inspectButton.disabled) return false
          if (!elements.closeButton.disabled) return false
          if (!elements.callButton.disabled) return false
          if (!elements.closeEnding.hidden) return false
          if (!elements.callEnding.hidden) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })

    test('multiple replay cycles maintain consistency', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (cycles) => {
          const elements = getElements()
          
          for (let i = 0; i < cycles; i++) {
            // Complete a full cycle
            let state = initialState()
            state = inspectAudit(state)
            state = closeTicket(state)
            state = replay(state)
            render(state, elements)
            
            // Each cycle should end in valid initial state
            if (state.phase !== 'initial') return false
            if (elements.inspectButton.disabled) return false
          }
          
          return true
        }),
        { numRuns: 50 }
      )
    })
  })
})
