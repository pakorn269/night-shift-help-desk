/**
 * Core domain types for Night Shift Help Desk
 */

export type CaseId = 'case-1' | 'case-2' | 'case-3'

export type ChoiceKey = 'comply' | 'defy'

export type EndingId =
  | 'quiet-shift'
  | 'extension-419'
  | 'split-session'
  | 'audit-exception'

export type EvidenceTab = 'report' | 'audit' | 'cctv'

export type DreadLevel = 0 | 1 | 2 | 3

export type AuditSeverity = 'normal' | 'warning' | 'anomaly' | 'phantom'

export interface AuditEntry {
  readonly time: string
  readonly actor: string
  readonly action: string
  readonly tag?: string
  readonly severity: AuditSeverity
}

export interface CctvFeedView {
  readonly spriteSheet: string
  readonly cameraId: string
  readonly locationLabel: string
  readonly mode: 'idle' | 'anomaly'
  readonly caption: string
  readonly statusBadge: string
}

export interface ShiftRecord {
  readonly analystName: string
  readonly choices: Readonly<Partial<Record<CaseId, ChoiceKey>>>
  readonly firstClosureTimestamp?: number
  readonly phoneAnswered?: boolean
}

/**
 * Discriminated union representing all valid phases of the 3-case night shift.
 * Invalid transitions always preserve exact state referential equality.
 */
export type GameState =
  | {
      readonly phase: 'initial'
      readonly caseId: CaseId
      readonly activeTab: EvidenceTab
      readonly record: ShiftRecord
    }
  | {
      readonly phase: 'audit-inspected'
      readonly caseId: CaseId
      readonly activeTab: EvidenceTab
      readonly record: ShiftRecord
    }
  | {
      readonly phase: 'case-resolved'
      readonly caseId: CaseId
      readonly choice: ChoiceKey
      readonly activeTab: EvidenceTab
      readonly record: ShiftRecord
    }
  | {
      readonly phase: 'shift-complete'
      readonly endingId: EndingId
      readonly record: ShiftRecord
    }

export interface CaseActionCopy {
  readonly label: string
  readonly shortHint: string
  readonly outcomeTitle: string
  readonly outcomeCode: string
  readonly outcomeBody: string
  readonly outcomeFootnote: string
}

export interface CaseDefinition {
  readonly id: CaseId
  readonly index: number
  readonly ticketNumber: string
  readonly priority: 'P2' | 'P1' | 'P0-SYS'
  readonly baseTime: string
  readonly slaLabel: string
  readonly assetTag: string
  readonly location: string
  readonly requester: string
  readonly title: string
  readonly description: string
  readonly inspectHint: string
  readonly cameraId: string
  readonly cctvSprite: string
  readonly cctvIdleCaption: string
  readonly cctvAnomalyCaption: string
  readonly actions: {
    readonly comply: CaseActionCopy
    readonly defy: CaseActionCopy
  }
}

export interface EndingDefinition {
  readonly id: EndingId
  readonly numeral: string
  readonly code: string
  readonly title: string
  readonly subtitle: string
  readonly finalClock: string
  readonly summary: string
  readonly epilogue: string
  readonly systemTag: string
  readonly tone: 'compliant' | 'defiant' | 'fractured' | 'rollback'
}

export interface UserPreferences {
  readonly muted: boolean
  readonly volume: number
  readonly reducedMotion: boolean
}

export interface PersistedProfile {
  readonly version: 1
  readonly analystName: string
  readonly unlockedEndings: readonly EndingId[]
  readonly preferences: UserPreferences
}
