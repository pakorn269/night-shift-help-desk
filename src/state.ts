// State machine types and transitions
// This module will contain the game state machine logic

/**
 * GameState discriminated union representing the five possible game phases.
 * 
 * - initial: Game just started, audit trail not yet inspected
 * - audit-inspected: Player revealed the audit trail showing the 03:07 entry
 * - resolved-close: Player closed the ticket (stores timestamp to prevent duplicate actions)
 * - resolved-call: Player called the requester
 * - reset: Conceptual transition state (immediately becomes initial)
 */
export type GameState =
  | { phase: 'initial' }
  | { phase: 'audit-inspected' }
  | { phase: 'resolved-close'; firstClosureTimestamp: number }
  | { phase: 'resolved-call' }
  | { phase: 'reset' }


/**
 * Returns the initial game state.
 */
export function initialState(): GameState {
  return { phase: 'initial' }
}

/**
 * Transitions from initial to audit-inspected phase.
 * Returns unchanged state if precondition not met.
 */
export function inspectAudit(state: GameState): GameState {
  if (state.phase === 'initial') {
    return { phase: 'audit-inspected' }
  }
  return state
}

/**
 * Transitions from audit-inspected to resolved-close phase.
 * Stores the closure timestamp to prove the action occurred.
 * Returns unchanged state if precondition not met.
 */
export function closeTicket(state: GameState): GameState {
  if (state.phase === 'audit-inspected') {
    return { phase: 'resolved-close', firstClosureTimestamp: Date.now() }
  }
  return state
}

/**
 * Transitions from audit-inspected to resolved-call phase.
 * Returns unchanged state if precondition not met.
 */
export function callRequester(state: GameState): GameState {
  if (state.phase === 'audit-inspected') {
    return { phase: 'resolved-call' }
  }
  return state
}

/**
 * Transitions from any resolved phase back to initial phase (replay).
 * Returns unchanged state if precondition not met.
 */
export function replay(state: GameState): GameState {
  if (state.phase === 'resolved-close' || state.phase === 'resolved-call') {
    return { phase: 'initial' }
  }
  return state
}
