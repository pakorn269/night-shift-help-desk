/**
 * Unit tests for renderer functions
 */
import { describe, test, expect, beforeEach } from 'vitest'
import { render, getElements } from './renderer'
import type { GameState } from './state'

describe('Renderer', () => {
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

  describe('getElements', () => {
    test('queries all required elements successfully', () => {
      const elements = getElements()
      expect(elements.clock).toBeDefined()
      expect(elements.auditTrail).toBeDefined()
      expect(elements.inspectButton).toBeDefined()
      expect(elements.closeButton).toBeDefined()
      expect(elements.callButton).toBeDefined()
    })

    test('throws when required element is missing', () => {
      document.getElementById('clock')?.remove()
      expect(() => getElements()).toThrow('Required element #clock not found')
    })
  })

  describe('render - clock', () => {
    test('displays 03:00 in initial state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'initial' }
      render(state, elements)
      expect(elements.clock.textContent).toBe('03:00')
    })

    test('displays 03:00 in audit-inspected state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'audit-inspected' }
      render(state, elements)
      expect(elements.clock.textContent).toBe('03:00')
    })

    test('displays 03:07 in resolved-close state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      render(state, elements)
      expect(elements.clock.textContent).toBe('03:07')
    })

    test('displays 03:00 in resolved-call state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-call' }
      render(state, elements)
      expect(elements.clock.textContent).toBe('03:00')
    })
  })

  describe('render - audit trail', () => {
    test('hides audit trail in initial state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'initial' }
      render(state, elements)
      expect(elements.auditTrail.hidden).toBe(true)
    })

    test('shows audit trail with one entry in audit-inspected state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'audit-inspected' }
      render(state, elements)
      expect(elements.auditTrail.hidden).toBe(false)
      expect(elements.auditList.children.length).toBe(1)
      expect(elements.auditList.children[0].textContent).toContain('03:07')
      expect(elements.auditList.children[0].textContent).toContain('Closed by [Analyst Name]')
    })

    test('shows audit trail with two entries in resolved-close state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      render(state, elements)
      expect(elements.auditTrail.hidden).toBe(false)
      expect(elements.auditList.children.length).toBe(2)
      expect(elements.auditList.children[0].textContent).toContain('03:07')
      expect(elements.auditList.children[1].textContent).toContain('03:07')
    })

    test('shows audit trail with new ticket entry in resolved-call state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-call' }
      render(state, elements)
      expect(elements.auditTrail.hidden).toBe(false)
      expect(elements.auditList.children.length).toBe(1)
      expect(elements.auditList.children[0].textContent).toContain('03:00')
      expect(elements.auditList.children[0].textContent).toContain('New ticket from your extension')
    })
  })

  describe('render - controls', () => {
    test('enables only inspect button in initial state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'initial' }
      render(state, elements)
      expect(elements.inspectButton.disabled).toBe(false)
      expect(elements.closeButton.disabled).toBe(true)
      expect(elements.callButton.disabled).toBe(true)
    })

    test('enables both decision buttons in audit-inspected state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'audit-inspected' }
      render(state, elements)
      expect(elements.inspectButton.disabled).toBe(true)
      expect(elements.closeButton.disabled).toBe(false)
      expect(elements.callButton.disabled).toBe(false)
    })

    test('disables all decision buttons in resolved-close state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      render(state, elements)
      expect(elements.inspectButton.disabled).toBe(true)
      expect(elements.closeButton.disabled).toBe(true)
      expect(elements.callButton.disabled).toBe(true)
    })

    test('disables all decision buttons in resolved-call state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-call' }
      render(state, elements)
      expect(elements.inspectButton.disabled).toBe(true)
      expect(elements.closeButton.disabled).toBe(true)
      expect(elements.callButton.disabled).toBe(true)
    })
  })

  describe('render - endings', () => {
    test('hides both endings in initial state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'initial' }
      render(state, elements)
      expect(elements.closeEnding.hidden).toBe(true)
      expect(elements.callEnding.hidden).toBe(true)
    })

    test('hides both endings in audit-inspected state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'audit-inspected' }
      render(state, elements)
      expect(elements.closeEnding.hidden).toBe(true)
      expect(elements.callEnding.hidden).toBe(true)
    })

    test('shows only close ending in resolved-close state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-close', firstClosureTimestamp: 123456 }
      render(state, elements)
      expect(elements.closeEnding.hidden).toBe(false)
      expect(elements.callEnding.hidden).toBe(true)
    })

    test('shows only call ending in resolved-call state', () => {
      const elements = getElements()
      const state: GameState = { phase: 'resolved-call' }
      render(state, elements)
      expect(elements.closeEnding.hidden).toBe(true)
      expect(elements.callEnding.hidden).toBe(false)
    })
  })
})
