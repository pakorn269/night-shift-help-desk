// DOM manipulation and UI updates
// This module will handle all rendering logic

import type { GameState } from './state'
import { ticket, endings } from './content'

/**
 * Interface for all required DOM elements.
 * Missing elements will cause getElements() to throw.
 */
export interface DOMElements {
  clock: HTMLElement
  ticketSection: HTMLElement
  ticketTitle: HTMLElement
  ticketDescription: HTMLElement
  ticketMeta: HTMLElement
  auditTrail: HTMLElement
  auditList: HTMLElement
  inspectButton: HTMLButtonElement
  closeButton: HTMLButtonElement
  callButton: HTMLButtonElement
  closeEnding: HTMLElement
  closeEndingTitle: HTMLElement
  closeEndingBody: HTMLElement
  callEnding: HTMLElement
  callEndingTitle: HTMLElement
  callEndingBody: HTMLElement
  closeReplayButton: HTMLButtonElement
  callReplayButton: HTMLButtonElement
}

/**
 * Queries and validates all required DOM elements.
 * Throws descriptive errors if any required element is missing.
 */
export function getElements(): DOMElements {
  const clock = document.getElementById('clock')
  if (!clock) throw new Error('Required element #clock not found')
  
  const ticketSection = document.getElementById('ticket-section')
  if (!ticketSection) throw new Error('Required element #ticket-section not found')
  
  const ticketTitle = document.getElementById('ticket-title')
  if (!ticketTitle) throw new Error('Required element #ticket-title not found')
  
  const ticketDescription = document.getElementById('ticket-description')
  if (!ticketDescription) throw new Error('Required element #ticket-description not found')
  
  const ticketMeta = document.getElementById('ticket-meta')
  if (!ticketMeta) throw new Error('Required element #ticket-meta not found')
  
  const auditTrail = document.getElementById('audit-trail')
  if (!auditTrail) throw new Error('Required element #audit-trail not found')
  
  const auditList = document.getElementById('audit-list')
  if (!auditList) throw new Error('Required element #audit-list not found')
  
  const inspectButton = document.getElementById('inspect-button') as HTMLButtonElement
  if (!inspectButton) throw new Error('Required element #inspect-button not found')
  
  const closeButton = document.getElementById('close-button') as HTMLButtonElement
  if (!closeButton) throw new Error('Required element #close-button not found')
  
  const callButton = document.getElementById('call-button') as HTMLButtonElement
  if (!callButton) throw new Error('Required element #call-button not found')
  
  const closeEnding = document.getElementById('close-ending')
  if (!closeEnding) throw new Error('Required element #close-ending not found')
  
  const closeEndingTitle = document.getElementById('close-ending-title')
  if (!closeEndingTitle) throw new Error('Required element #close-ending-title not found')
  
  const closeEndingBody = document.getElementById('close-ending-body')
  if (!closeEndingBody) throw new Error('Required element #close-ending-body not found')
  
  const callEnding = document.getElementById('call-ending')
  if (!callEnding) throw new Error('Required element #call-ending not found')
  
  const callEndingTitle = document.getElementById('call-ending-title')
  if (!callEndingTitle) throw new Error('Required element #call-ending-title not found')
  
  const callEndingBody = document.getElementById('call-ending-body')
  if (!callEndingBody) throw new Error('Required element #call-ending-body not found')
  
  const closeReplayButton = document.getElementById('close-replay-button') as HTMLButtonElement
  if (!closeReplayButton) throw new Error('Required element #close-replay-button not found')
  
  const callReplayButton = document.getElementById('call-replay-button') as HTMLButtonElement
  if (!callReplayButton) throw new Error('Required element #call-replay-button not found')
  
  return {
    clock,
    ticketSection,
    ticketTitle,
    ticketDescription,
    ticketMeta,
    auditTrail,
    auditList,
    inspectButton,
    closeButton,
    callButton,
    closeEnding,
    closeEndingTitle,
    closeEndingBody,
    callEnding,
    callEndingTitle,
    callEndingBody,
    closeReplayButton,
    callReplayButton
  }
}

/**
 * Helper to add a single audit entry to the list.
 */
function addAuditEntry(list: HTMLElement, time: string, text: string): void {
  const li = document.createElement('li')
  li.textContent = `${time} - ${text}`
  list.appendChild(li)
}

/**
 * Updates the clock display based on game state.
 * Shows 03:07 in resolved-close state, 03:00 otherwise.
 */
function renderClock(state: GameState, elements: DOMElements): void {
  if (state.phase === 'resolved-close') {
    elements.clock.textContent = '03:07'
  } else {
    elements.clock.textContent = '03:00'
  }
}

/**
 * Updates audit trail visibility and content based on game state.
 */
function renderAuditTrail(state: GameState, elements: DOMElements): void {
  if (state.phase === 'initial') {
    elements.auditTrail.hidden = true
  } else {
    elements.auditTrail.hidden = false
    
    // Clear existing entries
    elements.auditList.innerHTML = ''
    
    // Show original 03:07 entry unless call decision removed it
    if (state.phase !== 'resolved-call') {
      addAuditEntry(elements.auditList, '03:07', 'Closed by [Analyst Name]')
    }
    
    // Add second closure entry for close decision
    if (state.phase === 'resolved-close') {
      addAuditEntry(elements.auditList, '03:07', 'Closed by [Analyst Name]')
    }
    
    // Add ticket from own extension for call decision
    if (state.phase === 'resolved-call') {
      addAuditEntry(elements.auditList, '03:00', 'New ticket from your extension')
    }
  }
}

/**
 * Updates button enabled/disabled states based on game state.
 */
function renderControls(state: GameState, elements: DOMElements): void {
  elements.inspectButton.disabled = state.phase !== 'initial'
  elements.closeButton.disabled = state.phase !== 'audit-inspected'
  elements.callButton.disabled = state.phase !== 'audit-inspected'
}

/**
 * Updates ending section visibility based on game state.
 */
function renderEndings(state: GameState, elements: DOMElements): void {
  elements.closeEnding.hidden = state.phase !== 'resolved-close'
  elements.callEnding.hidden = state.phase !== 'resolved-call'
}

/**
 * Populates static ticket content.
 * Called once during initialization.
 */
export function renderTicketContent(elements: DOMElements): void {
  elements.ticketTitle.textContent = ticket.title
  elements.ticketDescription.textContent = ticket.description
  elements.ticketMeta.textContent = `Requester: ${ticket.requester}`
}

/**
 * Populates static ending content.
 * Called once during initialization.
 */
export function renderEndingContent(elements: DOMElements): void {
  elements.closeEndingTitle.textContent = endings.close.title
  elements.closeEndingBody.textContent = endings.close.body
  elements.callEndingTitle.textContent = endings.call.title
  elements.callEndingBody.textContent = endings.call.body
}

/**
 * Main render function - updates all UI based on current game state.
 * Public API for the renderer module.
 */
export function render(state: GameState, elements: DOMElements): void {
  renderClock(state, elements)
  renderAuditTrail(state, elements)
  renderControls(state, elements)
  renderEndings(state, elements)
}

