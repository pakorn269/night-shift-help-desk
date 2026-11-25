/**
 * Unit tests for Night Shift Help Desk 3-case state machine and derived selectors.
 */
import { describe, test, expect } from 'vitest'
import { DEFAULT_ANALYST_NAME } from './content'
import {
  advanceCase,
  answerPhone,
  callRequester,
  closeTicket,
  computeEndingId,
  formatShareableReport,
  getAuditEntries,
  getCctvFeed,
  getClockDisplay,
  getDreadLevel,
  initialState,
  inspectAudit,
  isCoffeeFrozen,
  isPhoneConnected,
  isPhoneRinging,
  replay,
  replayCase,
  resolveCase,
  sanitizeAnalystName,
  setAnalystName,
} from './state'

describe('State Machine', () => {
  describe('initialState & sanitizeAnalystName', () => {
    test('starts at Case 1 initial phase with default analyst handle', () => {
      const state = initialState()
      expect(state.phase).toBe('initial')
      if (state.phase === 'initial') {
        expect(state.caseId).toBe('case-1')
      }
      expect(state.record.analystName).toBe(DEFAULT_ANALYST_NAME)
      expect(getClockDisplay(state)).toBe('03:00')
      expect(getDreadLevel(state)).toBe(0)
      expect(getAuditEntries(state)).toHaveLength(0)
    })

    test('sanitizes blank or dangerous analyst names cleanly', () => {
      expect(sanitizeAnalystName('   ')).toBe(DEFAULT_ANALYST_NAME)
      expect(sanitizeAnalystName('<script>Pakorn</script>')).toBe('scriptPakorn/script')
      expect(sanitizeAnalystName('  Pakorn K.  ')).toBe('Pakorn K.')
    })

    test('setAnalystName updates handle without resetting phase', () => {
      const s0 = inspectAudit(initialState())
      const s1 = setAnalystName(s0, 'Pakorn')
      expect(s1.phase).toBe('audit-inspected')
      expect(s1.record.analystName).toBe('Pakorn')
      expect(setAnalystName(s1, 'Pakorn')).toBe(s1)
    })
  })

  describe('inspectAudit', () => {
    test('transitions initial -> audit-inspected and exposes impossible 03:07 log', () => {
      const s1 = inspectAudit(initialState('Pakorn'))
      expect(s1.phase).toBe('audit-inspected')
      const entries = getAuditEntries(s1)
      expect(entries).toHaveLength(1)
      expect(entries[0].time).toBe('03:07')
      expect(entries[0].actor).toContain('Pakorn')
    })

    test('returns exact reference when not in initial phase', () => {
      const inspected = inspectAudit(initialState())
      expect(inspectAudit(inspected)).toBe(inspected)

      const closed = closeTicket(inspected)
      expect(inspectAudit(closed)).toBe(closed)
    })
  })

  describe('closeTicket & callRequester (Case 1)', () => {
    test('closeTicket jumps clock to 03:07, duplicates closure, freezes coffee, prevents double-fire', () => {
      const inspected = inspectAudit(initialState('A. Mercer'))
      const closed = closeTicket(inspected)
      expect(closed.phase).toBe('case-resolved')
      expect(getClockDisplay(closed)).toBe('03:07')
      expect(isCoffeeFrozen(closed)).toBe(true)
      expect(isPhoneRinging(closed)).toBe(false)

      const entries = getAuditEntries(closed)
      expect(entries).toHaveLength(2)
      expect(entries[0].time).toBe('03:07')
      expect(entries[1].time).toBe('03:07')

      // Duplicate attempt returns same reference
      expect(closeTicket(closed)).toBe(closed)
      expect(callRequester(closed)).toBe(closed)
    })

    test('callRequester removes 03:07 closure, adds 03:00 self-extension entry, rings phone', () => {
      const inspected = inspectAudit(initialState('A. Mercer'))
      const called = callRequester(inspected)
      expect(called.phase).toBe('case-resolved')
      expect(getClockDisplay(called)).toBe('03:00')
      expect(isPhoneRinging(called)).toBe(true)

      const entries = getAuditEntries(called)
      expect(entries).toHaveLength(1)
      expect(entries[0].time).toBe('03:00')
      expect(entries[0].action).toContain('New ticket from your extension')
      expect(entries[0].action).not.toContain('Closed by')
    })

    test('rejects decisions before audit inspection', () => {
      const s0 = initialState()
      expect(closeTicket(s0)).toBe(s0)
      expect(callRequester(s0)).toBe(s0)
    })
  })

  describe('3-Case Progression & 4 Shift Endings', () => {
    test('computeEndingId maps all compliance/defiance combinations accurately', () => {
      expect(computeEndingId({ 'case-1': 'comply', 'case-2': 'comply', 'case-3': 'comply' })).toBe('quiet-shift')
      expect(computeEndingId({ 'case-1': 'defy', 'case-2': 'defy', 'case-3': 'defy' })).toBe('extension-419')
      expect(computeEndingId({ 'case-1': 'defy', 'case-2': 'comply', 'case-3': 'comply' })).toBe('split-session')
      expect(computeEndingId({ 'case-1': 'comply', 'case-2': 'defy', 'case-3': 'defy' })).toBe('audit-exception')
    })

    test('Case 2 & Case 3 audit logs dynamically reference prior case choices', () => {
      let s = initialState('J. Doe')
      s = inspectAudit(s)
      s = callRequester(s)
      s = advanceCase(s)
      expect(s.phase).toBe('initial')
      if (s.phase === 'initial') expect(s.caseId).toBe('case-2')

      s = inspectAudit(s)
      const c2Entries = getAuditEntries(s)
      expect(c2Entries[0].action).toContain('Outbound call to own extension')
      expect(getCctvFeed(s).spriteSheet).toContain('cctv-stairwell')

      s = resolveCase(s, 'comply')
      s = advanceCase(s)
      s = inspectAudit(s)
      const c3Entries = getAuditEntries(s)
      expect(c3Entries[0].time).toBe('02:55')
      expect(c3Entries[0].action).toContain('Ext. 419')
      expect(c3Entries[1].action).toContain('sensor fault')
      expect(getCctvFeed(s).spriteSheet).toContain('cctv-desk-b04')
    })

    test('replayCase resets active case only while replay resets full shift preserving name', () => {
      let s = initialState('Pakorn')
      s = inspectAudit(s)
      s = closeTicket(s)

      const replayedC1 = replayCase(s)
      expect(replayedC1.phase).toBe('initial')
      expect(replayedC1.record.choices['case-1']).toBeUndefined()
      expect(replayedC1.record.analystName).toBe('Pakorn')

      // Advance all the way to shift-complete and reset
      s = advanceCase(s) // case 2
      s = resolveCase(inspectAudit(s), 'comply')
      s = advanceCase(s) // case 3
      s = resolveCase(inspectAudit(s), 'comply')
      s = advanceCase(s) // shift-complete
      expect(s.phase).toBe('shift-complete')
      if (s.phase === 'shift-complete') expect(s.endingId).toBe('quiet-shift')

      const reset = replay(s)
      expect(reset.phase).toBe('initial')
      if (reset.phase === 'initial') expect(reset.caseId).toBe('case-1')
      expect(reset.record.analystName).toBe('Pakorn')
    })

    test('answerPhone transitions ringing handset to connected transcript and formatShareableReport exports ledger', () => {
      const s0 = initialState('Pakorn')
      expect(answerPhone(s0)).toBe(s0) // not ringing yet

      const called = callRequester(inspectAudit(s0))
      expect(isPhoneRinging(called)).toBe(true)
      expect(isPhoneConnected(called)).toBe(false)

      const answered = answerPhone(called)
      expect(isPhoneRinging(answered)).toBe(false)
      expect(isPhoneConnected(answered)).toBe(true)
      expect(answerPhone(answered)).toBe(answered) // idempotent

      let done = advanceCase(answered)
      done = advanceCase(resolveCase(inspectAudit(done), 'defy'))
      done = advanceCase(resolveCase(inspectAudit(done), 'defy'))
      expect(done.phase).toBe('shift-complete')
      if (done.phase === 'shift-complete') {
        const report = formatShareableReport(done, 1, 4, 'Extension 419', 'VOIP-419')
        expect(report).toContain('Pakorn')
        expect(report).toContain('Extension 419')
        expect(report).toContain('Answered Ext. 419')
      }
    })
  })
})
