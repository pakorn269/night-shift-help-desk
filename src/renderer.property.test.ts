/**
 * Property-based tests for renderer
 */
import { describe, test, beforeEach } from 'vitest'
import fc from 'fast-check'
import { render, getElements } from './renderer'
import { initialState, inspectAudit, closeTicket, callRequester } from './state'

describe('Renderer Property Tests', () => {
  beforeEach(() => {
    // Set up minimal DOM structure for testing
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

  describe('Property 2: Inspect Transition Reveals Audit Trail', () => {
    test('inspecting from initial state always reveals audit trail with one 03:07 entry', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          const state = initialState()
          const inspected = inspectAudit(state)
          render(inspected, elements)
          
          // Verify audit trail is visible
          if (elements.auditTrail.hidden) return false
          
          // Verify exactly one entry
          if (elements.auditList.children.length !== 1) return false
          
          // Verify entry contains 03:07 timestamp
          const entry = elements.auditList.children[0]
          return entry.textContent?.includes('03:07') === true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 3: Audit-Inspected State Enables Both Decision Controls', () => {
    test('rendering audit-inspected state always enables both decision buttons', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          const state = { phase: 'audit-inspected' as const }
          render(state, elements)
          
          // Both decision buttons should be enabled
          if (elements.closeButton.disabled) return false
          if (elements.callButton.disabled) return false
          
          // Inspect button should be disabled
          if (!elements.inspectButton.disabled) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 4: Close Decision Produces Supernatural Effects', () => {
    test('closing ticket from audit-inspected always produces clock jump and duplicate entries', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          const state = { phase: 'audit-inspected' as const }
          const closed = closeTicket(state)
          render(closed, elements)
          
          // Clock should display 03:07
          if (elements.clock.textContent !== '03:07') return false
          
          // Audit list should contain exactly two entries
          if (elements.auditList.children.length !== 2) return false
          
          // Both entries should be timestamped 03:07
          const entry1 = elements.auditList.children[0]
          const entry2 = elements.auditList.children[1]
          if (!entry1.textContent?.includes('03:07')) return false
          if (!entry2.textContent?.includes('03:07')) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 5: Call Decision Removes Original Audit Entry', () => {
    test('calling requester from audit-inspected always removes 03:07 entry and adds new ticket', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          const state = { phase: 'audit-inspected' as const }
          const called = callRequester(state)
          render(called, elements)
          
          // Should have exactly one entry
          if (elements.auditList.children.length !== 1) return false
          
          const entry = elements.auditList.children[0]
          const entryText = entry.textContent || ''
          
          // Should NOT contain 03:07 closure entry
          if (entryText.includes('Closed by [Analyst Name]')) return false
          
          // Should contain 03:00 new ticket entry
          if (!entryText.includes('03:00')) return false
          if (!entryText.includes('New ticket from your extension')) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 6: Resolved-Close State Shows Ending and Disables Decisions', () => {
    test('resolved-close state always shows close ending and disables decision buttons', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: Date.now() }), (timestamp) => {
          const elements = getElements()
          const state = { phase: 'resolved-close' as const, firstClosureTimestamp: timestamp }
          render(state, elements)
          
          // Close ending should be visible
          if (elements.closeEnding.hidden) return false
          
          // Call ending should be hidden
          if (!elements.callEnding.hidden) return false
          
          // Both decision buttons should be disabled
          if (!elements.closeButton.disabled) return false
          if (!elements.callButton.disabled) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 7: Resolved-Call State Shows Ending and Disables Decisions', () => {
    test('resolved-call state always shows call ending and disables decision buttons', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const elements = getElements()
          const state = { phase: 'resolved-call' as const }
          render(state, elements)
          
          // Call ending should be visible
          if (elements.callEnding.hidden) return false
          
          // Close ending should be hidden
          if (!elements.closeEnding.hidden) return false
          
          // Both decision buttons should be disabled
          if (!elements.closeButton.disabled) return false
          if (!elements.callButton.disabled) return false
          
          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
