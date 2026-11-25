/**
 * Accessibility, logical focus management, and keyboard shortcuts for Night Shift Help Desk.
 */
import type { GameState } from './types'
import type { DOMElements } from './renderer'

export interface KeyboardHandlers {
  onInspect: () => void
  onComply: () => void
  onDefy: () => void
  onAdvance: () => void
  onReplayCase: () => void
  onReplayShift: () => void
  onToggleMute: () => void
  onAnswerPhone: () => void
  onToggleCctvZoom: () => void
  onEscapeModal: () => boolean
  isModalOpen: () => boolean
}

/**
 * Moves focus to the next logical interactive control after state transitions.
 * Never steals focus when the player is editing an input or inside an open modal.
 */
export function manageFocus(state: GameState, elements: DOMElements): void {
  if (
    document.activeElement === elements.analystNameInput ||
    !elements.checkinModal.hidden ||
    !elements.cctvModal.hidden
  ) {
    return
  }

  let target: HTMLElement | null = null

  switch (state.phase) {
    case 'initial':
      target = elements.inspectButton
      break
    case 'audit-inspected':
      target = elements.closeButton
      break
    case 'case-resolved':
      target = elements.nextCaseButton
      break
    case 'shift-complete':
      target = elements.shiftReplayButton
      break
  }

  if (target && !target.hasAttribute('disabled') && !target.hasAttribute('hidden')) {
    target.focus()
  }
}

/**
 * Registers ergonomic single-key shortcuts for keyboard-first play.
 */
export function setupKeyboardShortcuts(
  getState: () => GameState,
  handlers: KeyboardHandlers,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    if (event.key === 'Escape') {
      if (handlers.onEscapeModal()) {
        event.preventDefault()
        return
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      return
    }

    if (handlers.isModalOpen()) return

    const activeTag = (document.activeElement?.tagName ?? '').toLowerCase()
    if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
      return
    }

    const key = event.key.toLowerCase()
    const state = getState()

    if (key === 'm') {
      event.preventDefault()
      handlers.onToggleMute()
      return
    }

    if (key === 'z') {
      event.preventDefault()
      handlers.onToggleCctvZoom()
      return
    }

    if (key === 'p') {
      event.preventDefault()
      handlers.onAnswerPhone()
      return
    }

    if (state.phase === 'initial' && key === 'i') {
      event.preventDefault()
      handlers.onInspect()
      return
    }

    if (state.phase === 'audit-inspected') {
      if (key === '1' || key === 'c') {
        event.preventDefault()
        handlers.onComply()
        return
      }
      if (key === '2' || key === 'k') {
        event.preventDefault()
        handlers.onDefy()
        return
      }
    }

    if (state.phase === 'case-resolved') {
      if (key === 'n') {
        event.preventDefault()
        handlers.onAdvance()
        return
      }
      if (key === 'r') {
        event.preventDefault()
        handlers.onReplayCase()
        return
      }
    }

    if (state.phase === 'shift-complete' && key === 'r') {
      event.preventDefault()
      handlers.onReplayShift()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}
