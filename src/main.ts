// Application entry point and initialization
// This module will wire all components together

import './style.css'
import { initialState, inspectAudit, closeTicket, callRequester, replay } from './state'
import { getElements, render, renderTicketContent, renderEndingContent } from './renderer'
import { manageFocus } from './accessibility'

/**
 * Initializes the game application.
 * Sets up initial state, queries DOM elements, renders initial UI,
 * and wires event listeners.
 */
function initGame(): void {
  // Hold game state in closure
  let currentState = initialState()
  
  // Query and validate all required DOM elements
  const elements = getElements()
  
  // Render static content once
  renderTicketContent(elements)
  renderEndingContent(elements)
  
  // Initial render
  render(currentState, elements)
  manageFocus(currentState, elements)
  
  // Wire event handlers
  elements.inspectButton.addEventListener('click', () => {
    currentState = inspectAudit(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.closeButton.addEventListener('click', () => {
    currentState = closeTicket(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.callButton.addEventListener('click', () => {
    currentState = callRequester(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.closeReplayButton.addEventListener('click', () => {
    currentState = replay(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.callReplayButton.addEventListener('click', () => {
    currentState = replay(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', initGame)

