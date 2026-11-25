/**
 * Pure finite state machine & derived selectors for Night Shift Help Desk.
 * Zero side effects; invalid transitions return the exact input state reference.
 */
import { CASES, DEFAULT_ANALYST_NAME, interpolateAnalyst } from './content'
import type {
  AuditEntry,
  CaseId,
  CctvFeedView,
  ChoiceKey,
  DreadLevel,
  EndingId,
  EvidenceTab,
  GameState,
  ShiftRecord,
} from './types'

export type { GameState } from './types'

/**
 * Sanitizes a user-supplied analyst name to safe corporate handle length.
 */
export function sanitizeAnalystName(raw: string): string {
  const cleaned = raw.replace(/[\r\n\t<>]/g, '').trim().slice(0, 24)
  return cleaned.length > 0 ? cleaned : DEFAULT_ANALYST_NAME
}

/**
 * Creates a fresh initial state at Case 1 (03:00).
 */
export function initialState(analystName: string = DEFAULT_ANALYST_NAME): GameState {
  return {
    phase: 'initial',
    caseId: 'case-1',
    activeTab: 'report',
    record: {
      analystName: sanitizeAnalystName(analystName),
      choices: {},
    },
  }
}

/**
 * Updates the analyst handle in the current state without altering gameplay phase.
 */
export function setAnalystName(state: GameState, rawName: string): GameState {
  const nextName = sanitizeAnalystName(rawName)
  if (nextName === state.record.analystName) return state
  return {
    ...state,
    record: {
      ...state.record,
      analystName: nextName,
    },
  }
}

/**
 * Switches the active evidence panel tab.
 * Cannot switch to the 'audit' tab while in 'initial' phase unless inspectAudit() is called.
 */
export function setEvidenceTab(state: GameState, tab: EvidenceTab): GameState {
  if (state.phase === 'shift-complete') return state
  if (state.phase === 'initial' && tab === 'audit') {
    return inspectAudit(state)
  }
  if (state.activeTab === tab) return state
  return {
    ...state,
    activeTab: tab,
  }
}

/**
 * Transitions from initial -> audit-inspected and opens the Audit Trail panel.
 * Returns unchanged reference if precondition is not met.
 */
export function inspectAudit(state: GameState): GameState {
  if (state.phase !== 'initial') return state
  return {
    phase: 'audit-inspected',
    caseId: state.caseId,
    activeTab: 'audit',
    record: state.record,
  }
}

/**
 * Computes which of the 4 Shift Endings corresponds to a completed 3-case choice record.
 */
export function computeEndingId(choices: Readonly<Partial<Record<CaseId, ChoiceKey>>>): EndingId {
  const c1 = choices['case-1'] ?? 'comply'
  const c2 = choices['case-2'] ?? 'comply'
  const c3 = choices['case-3'] ?? 'comply'

  if (c1 === 'comply' && c2 === 'comply' && c3 === 'comply') return 'quiet-shift'
  if (c1 === 'defy' && c2 === 'defy' && c3 === 'defy') return 'extension-419'
  if (c3 === 'comply') return 'split-session'
  return 'audit-exception'
}

/**
 * Executes a player choice ('comply' or 'defy') on the active case.
 * Valid only from 'audit-inspected'; prevents double-execution per case.
 */
export function resolveCase(state: GameState, choice: ChoiceKey, nowMs: number = Date.now()): GameState {
  if (state.phase !== 'audit-inspected') return state

  const nextChoices: Readonly<Partial<Record<CaseId, ChoiceKey>>> = {
    ...state.record.choices,
    [state.caseId]: choice,
  }

  const nextRecord: ShiftRecord = {
    ...state.record,
    choices: nextChoices,
    firstClosureTimestamp:
      state.caseId === 'case-1' && choice === 'comply'
        ? nowMs
        : state.record.firstClosureTimestamp,
  }

  return {
    phase: 'case-resolved',
    caseId: state.caseId,
    choice,
    activeTab: 'audit',
    record: nextRecord,
  }
}

/**
 * Convenience action for Case 1 / Comply path (Close as Resolved).
 */
export function closeTicket(state: GameState): GameState {
  return resolveCase(state, 'comply')
}

/**
 * Convenience action for Case 1 / Defy path (Keep Open & Call Requester).
 */
export function callRequester(state: GameState): GameState {
  return resolveCase(state, 'defy')
}

/**
 * Advances from a resolved case to the next case in the night shift,
 * or transitions from Case 3 to the final 'shift-complete' dossier.
 */
export function advanceCase(state: GameState): GameState {
  if (state.phase !== 'case-resolved') return state

  if (state.caseId === 'case-1') {
    return {
      phase: 'initial',
      caseId: 'case-2',
      activeTab: 'report',
      record: state.record,
    }
  }
  if (state.caseId === 'case-2') {
    return {
      phase: 'initial',
      caseId: 'case-3',
      activeTab: 'report',
      record: state.record,
    }
  }

  return {
    phase: 'shift-complete',
    endingId: computeEndingId(state.record.choices),
    record: state.record,
  }
}

/**
 * Replays the current case from 'case-resolved' back to its 'initial' state,
 * clearing only the current case's choice so the player can explore the alternate path immediately.
 */
export function replayCase(state: GameState): GameState {
  if (state.phase !== 'case-resolved') return state

  const nextChoices: Partial<Record<CaseId, ChoiceKey>> = { ...state.record.choices }
  delete nextChoices[state.caseId]

  return {
    phase: 'initial',
    caseId: state.caseId,
    activeTab: 'report',
    record: {
      analystName: state.record.analystName,
      choices: nextChoices,
      firstClosureTimestamp:
        state.caseId === 'case-1' ? undefined : state.record.firstClosureTimestamp,
      phoneAnswered: state.caseId === 'case-1' ? false : state.record.phoneAnswered,
    },
  }
}

/**
 * Resets the entire shift back to Case 1 (03:00), preserving the analyst's name.
 * Valid from 'case-resolved' or 'shift-complete'.
 */
export function replayShift(state: GameState): GameState {
  if (state.phase !== 'case-resolved' && state.phase !== 'shift-complete') {
    return state
  }
  return initialState(state.record.analystName)
}

/**
 * Backwards-compatible alias: resets to Case 1 initial state from any resolved/complete state.
 */
export function replay(state: GameState): GameState {
  return replayShift(state)
}

// ---------------------------------------------------------------------------
// Derived Pure Selectors (Single Source of Truth for Renderer & Audio)
// ---------------------------------------------------------------------------

/**
 * Returns the exact digital clock readout for the current state.
 * Preserves the signature 03:00 -> 03:07 supernatural jump on Case 1 Close!
 */
export function getClockDisplay(state: GameState): string {
  if (state.phase === 'shift-complete') {
    switch (state.endingId) {
      case 'quiet-shift':
        return '07:00'
      case 'extension-419':
        return '03:07'
      case 'split-session':
        return '03:21'
      case 'audit-exception':
        return '03:00'
    }
  }

  if (state.caseId === 'case-1') {
    if (state.phase === 'case-resolved' && state.choice === 'comply') {
      return '03:07'
    }
    return '03:00'
  }

  if (state.caseId === 'case-2') {
    if (state.phase === 'case-resolved' && state.choice === 'comply') {
      return '03:21'
    }
    return '03:14'
  }

  // Case 3
  if (state.phase === 'case-resolved' && state.choice === 'defy') {
    return '03:00'
  }
  return '03:21'
}

/**
 * Returns the current ambient dread level (0..3) driving UI patina, pixel sprites, and audio layers.
 */
export function getDreadLevel(state: GameState): DreadLevel {
  if (state.phase === 'shift-complete') return 3
  if (state.caseId === 'case-3') return 3
  if (state.caseId === 'case-2') {
    return state.phase === 'initial' ? 1 : 2
  }
  // Case 1
  if (state.phase === 'initial') return 0
  if (state.phase === 'audit-inspected') return 1
  return 2
}

/**
 * Answers the ringing VoIP handset (Ext. 419) when active, revealing the secret call transcript.
 * Returns exact input reference if the phone is not currently ringing or already answered.
 */
export function answerPhone(state: GameState): GameState {
  if (!isPhoneRinging(state) || state.record.phoneAnswered) return state
  return {
    ...state,
    record: {
      ...state.record,
      phoneAnswered: true,
    },
  }
}

/**
 * Returns whether the VoIP desk handset should actively ring in the UI.
 */
export function isPhoneRinging(state: GameState): boolean {
  if (state.record.phoneAnswered) return false
  if (state.phase === 'case-resolved' && state.caseId === 'case-1' && state.choice === 'defy') {
    return true
  }
  if (state.phase === 'shift-complete' && state.endingId === 'extension-419') {
    return true
  }
  return false
}

/**
 * Returns whether the VoIP handset is in the eerie post-answer connected loopback state.
 */
export function isPhoneConnected(state: GameState): boolean {
  return Boolean(state.record.phoneAnswered)
}

/**
 * Returns whether the night-shift coffee mug has gone strangely still/frozen (time anomaly).
 */
export function isCoffeeFrozen(state: GameState): boolean {
  if (state.phase === 'case-resolved' && state.caseId === 'case-1' && state.choice === 'comply') {
    return true
  }
  if (state.phase === 'shift-complete') return true
  if (state.caseId === 'case-3' && state.phase !== 'initial') return true
  return false
}

/**
 * Returns the forensic audit trail entries for the active case & state.
 * Always empty in 'initial' phase (audit trail stays hidden until inspected).
 */
export function getAuditEntries(state: GameState): readonly AuditEntry[] {
  if (state.phase === 'initial' || state.phase === 'shift-complete') {
    return []
  }

  const analyst = state.record.analystName
  const c1Choice = state.record.choices['case-1']
  const c2Choice = state.record.choices['case-2']

  if (state.caseId === 'case-1') {
    if (state.phase === 'audit-inspected') {
      return [
        {
          time: '03:07',
          actor: `${analyst} (Ext. 419)`,
          action: `Closed by ${analyst} — Resolution: "Routine power test."`,
          tag: 'FUTURE +07m',
          severity: 'anomaly',
        },
      ]
    }
    if (state.choice === 'comply') {
      return [
        {
          time: '03:07',
          actor: `${analyst} (Ext. 419)`,
          action: `Closed by ${analyst} — Resolution: "Routine power test."`,
          tag: 'VERIFIED',
          severity: 'warning',
        },
        {
          time: '03:07',
          actor: `${analyst} (Ext. 419)`,
          action: `Closed by ${analyst} — Duplicate closure confirmed.`,
          tag: 'DUPLICATE',
          severity: 'anomaly',
        },
      ]
    }
    // Call requester (defy) — original 03:07 entry vanishes, replaced by phantom ticket from own extension!
    return [
      {
        time: '03:00',
        actor: `${analyst} (Ext. 419)`,
        action: 'New ticket from your extension — Description: "03:07"',
        tag: 'ORIGIN: SELF',
        severity: 'phantom',
      },
    ]
  }

  if (state.caseId === 'case-2') {
    const callbackLine: AuditEntry =
      c1Choice === 'comply'
        ? {
            time: '03:07',
            actor: 'SYSTEM // HALCYON',
            action: `Prior ticket INC-0300 closed twice by ${analyst}. Shift nominal.`,
            tag: 'PRIOR LOG',
            severity: 'normal',
          }
        : {
            time: '03:07',
            actor: 'VOIP // EXT. 419',
            action: 'Outbound call to own extension lasted 07m 00s (room tone only).',
            tag: 'PRIOR LOG',
            severity: 'warning',
          }

    if (state.phase === 'audit-inspected') {
      return [
        callbackLine,
        {
          time: '03:12',
          actor: `${analyst} (Badge #0419)`,
          action: 'Active workstation session verified at DESK-B04.',
          tag: 'LOCAL',
          severity: 'normal',
        },
        {
          time: '03:14',
          actor: `${analyst} (Badge #0419)`,
          action: 'RFID unlock granted at Floor 4 North Stairwell — "Night Shift Handover".',
          tag: 'IMPOSSIBLE LOC',
          severity: 'anomaly',
        },
      ]
    }

    if (state.choice === 'comply') {
      return [
        callbackLine,
        {
          time: '03:14',
          actor: `${analyst} (Badge #0419)`,
          action: 'Location retroactively updated: Floor 4 North Stairwell → DESK-B04.',
          tag: 'REWRITTEN',
          severity: 'anomaly',
        },
        {
          time: '03:14',
          actor: 'ACS-09 // FLOOR 4',
          action: 'Occupancy count updated: 2 personnel present (1 scheduled).',
          tag: 'OCCUPANCY: 2',
          severity: 'phantom',
        },
      ]
    }

    return [
      callbackLine,
      {
        time: '03:14',
        actor: 'ACS-09 // SECURITY',
        action: 'ERROR 409: Cannot revoke Badge #0419 — active operator seated at DESK-B04.',
        tag: 'REJECTED',
        severity: 'warning',
      },
      {
        time: '03:14',
        actor: `${analyst} (DESK-B04)`,
        action: 'Session token silently renewed from local terminal 00:03 before request.',
        tag: 'PRE-DATED',
        severity: 'phantom',
      },
    ]
  }

  // Case 3: References the player's actual choices from Cases 1 and 2 — pre-dated at 02:55!
  const c1Desc =
    c1Choice === 'comply'
      ? 'Closed INC-0300 quietly without questioning 03:07'
      : 'Refused 03:07 log and dialed own extension (Ext. 419)'
  const c2Desc =
    c2Choice === 'comply'
      ? 'Cleared Stairwell RFID alert as a sensor fault'
      : 'Attempted to revoke own active Badge #0419'

  const baseEntries: AuditEntry[] = [
    {
      time: '02:55',
      actor: `${analyst} (PRE-SHIFT)`,
      action: `Predicted action recorded before login: ${c1Desc}.`,
      tag: 'PRE-SHIFT',
      severity: 'anomaly',
    },
    {
      time: '02:55',
      actor: `${analyst} (PRE-SHIFT)`,
      action: `Predicted action recorded before login: ${c2Desc}.`,
      tag: 'PRE-SHIFT',
      severity: 'anomaly',
    },
    {
      time: '03:21',
      actor: `${analyst} (Ext. 419)`,
      action: 'Handover ticket INC-0321 filed from DESK-B04.',
      tag: 'ACTIVE',
      severity: 'phantom',
    },
  ]

  if (state.phase === 'audit-inspected') {
    return baseEntries
  }

  if (state.choice === 'comply') {
    return [
      ...baseEntries,
      {
        time: '03:21',
        actor: 'SYSTEM // HALCYON',
        action: `Session transferred. Welcome to Night Operations, ${analyst}.`,
        tag: 'HANDOVER OK',
        severity: 'warning',
      },
    ]
  }

  return [
    ...baseEntries,
    {
      time: '03:00',
      actor: 'SYSTEM // RECOVERY',
      action: 'Power interrupt logged. Rolling back active queue to 03:00...',
      tag: 'HALT',
      severity: 'phantom',
    },
  ]
}

/**
 * Returns the current CCTV pixel-art feed view model for the active case.
 */
export function getCctvFeed(state: GameState): CctvFeedView {
  const caseId: CaseId = state.phase === 'shift-complete' ? 'case-3' : state.caseId
  const def = CASES[caseId]
  const isAnomaly = state.phase !== 'initial'

  return {
    spriteSheet: def.cctvSprite,
    cameraId: def.cameraId,
    locationLabel: def.location,
    mode: isAnomaly ? 'anomaly' : 'idle',
    caption: interpolateAnalyst(isAnomaly ? def.cctvAnomalyCaption : def.cctvIdleCaption, state.record.analystName),
    statusBadge: isAnomaly ? 'ANOMALY DETECTED' : 'LIVE // NOMINAL',
  }
}

/**
 * Returns the display requester string for a case with analyst name interpolated.
 */
export function getCaseRequester(caseId: CaseId, analystName: string): string {
  return interpolateAnalyst(CASES[caseId].requester, analystName)
}

/**
 * Formats a compact, shareable plain-text Shift Dossier report card for clipboard export.
 */
export function formatShareableReport(
  state: Extract<GameState, { phase: 'shift-complete' }>,
  unlockedCount: number,
  totalEndings: number,
  endingTitle: string,
  endingCode: string,
): string {
  const c1 = state.record.choices['case-1'] === 'defy' ? 'DEFIED (Called Ext. 419)' : 'COMPLIED (Closed 03:07)'
  const c2 = state.record.choices['case-2'] === 'defy' ? 'DEFIED (Revoked Badge)' : 'COMPLIED (Cleared Alert)'
  const c3 = state.record.choices['case-3'] === 'defy' ? 'DEFIED (Pulled Power)' : 'COMPLIED (Approved Handover)'
  const clk = getClockDisplay(state)
  return [
    'HALCYON DESK // ITSM v4.2 — NIGHT SHIFT REPORT',
    `Analyst: ${state.record.analystName} (DESK-B04 · Ext. 419)`,
    `Ending:  ${endingTitle} [${endingCode}]`,
    `Clock:   ${clk}  |  Endings Uncovered: ${unlockedCount}/${totalEndings}`,
    `INC-0300: ${c1}`,
    `INC-0314: ${c2}`,
    `INC-0321: ${c3}`,
    state.record.phoneAnswered ? 'VOIP LOG: Answered Ext. 419 (07:00 loopback recorded)' : 'VOIP LOG: Line unanswered',
  ].join('\n')
}
