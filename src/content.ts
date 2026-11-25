/**
 * All player-facing copy and narrative tables for Night Shift Help Desk.
 * Centralized in one module for easy revision and localization.
 */
import type { CaseDefinition, CaseId, EndingDefinition, EndingId } from './types'

export const DEFAULT_ANALYST_NAME = 'A. Mercer'
export const ANALYST_EXTENSION = 'Ext. 419'
export const ANALYST_DESK = 'DESK-B04'
export const BADGE_ID = '#0419'

export const CASE_ORDER: readonly CaseId[] = ['case-1', 'case-2', 'case-3'] as const

export const ALL_ENDINGS: readonly EndingId[] = [
  'quiet-shift',
  'extension-419',
  'split-session',
  'audit-exception',
] as const

export const SYSTEM_MEMOS = [
  'SOLO COVERAGE // Floor 4 occupancy sensor: 1 analyst scheduled.',
  'NTP WARNING // Local console clock drifted +420s against core directory.',
  'SECURITY NOTICE // Do not answer VoIP calls originating from your own extension.',
  'SESSION ALERT // Two concurrent operator tokens active on DESK-B04.',
] as const

export const VOIP_TRANSCRIPT = {
  callerId: 'EXT. 419 — DESK-B04 (LOCAL LOOPBACK)',
  elapsedLabel: 'CONNECTED · 07:00 ELAPSED',
  lines: [
    '[07:00] Static hum. Steady mechanical keystrokes in the background—matching your exact typing cadence.',
    '[07:03] A muffled voice sounds identical to yours: "{ANALYST}? Do not close 0300. It is still waiting."',
    '[07:07] Line drops to dead air. Receiver icon remains marked CONNECTED.',
  ],
} as const

/**
 * Helper to substitute the active analyst's name into narrative strings.
 */
export function interpolateAnalyst(template: string, analystName: string): string {
  return template.replace(/\{ANALYST\}/g, analystName)
}

export const CASES: Readonly<Record<CaseId, CaseDefinition>> = {
  'case-1': {
    id: 'case-1',
    index: 1,
    ticketNumber: 'INC-0300',
    priority: 'P2',
    baseTime: '03:00',
    slaLabel: 'SLA: -00:07:00',
    assetTag: 'WKST-B3-204',
    location: 'Building 3, Floor 2',
    requester: 'J. Chen — Facilities',
    title: 'Workstation Powered On Unexpectedly',
    description:
      'A workstation in Building 3, Floor 2 powered on by itself at 03:00. No scheduled tasks, wake-on-LAN packets, or remote access sessions are recorded. Facilities found the screen lit in an empty cubicle during rounds.',
    inspectHint: 'Review the ticket audit log before selecting a resolution.',
    cameraId: 'CAM-B3-204',
    cctvSprite: './sprites/cctv-workstation.png',
    cctvIdleCaption: 'Empty cubicle at 03:00. CRT monitor in amber standby. No movement detected.',
    cctvAnomalyCaption:
      'Monitor powered on autonomously. Terminal displays a 03:07 closure line. Faint silhouette visible in glass reflection.',
    actions: {
      comply: {
        label: 'Close as Resolved',
        shortHint: 'Trust the existing 03:07 audit entry',
        outcomeTitle: 'Ticket Closed — Clock Desynced',
        outcomeCode: 'RES-DUP-0307',
        outcomeBody:
          'The dashboard flickers. The shift clock now reads 03:07. A second closure entry appears in the audit trail, timestamped 03:07, also signed by {ANALYST}. You do not remember closing it twice.',
        outcomeFootnote: 'Your mug beside the keyboard has stopped steaming.',
      },
      defy: {
        label: 'Keep Open & Call Requester',
        shortHint: 'Challenge the impossible entry',
        outcomeTitle: 'Incoming Call — Extension 419',
        outcomeCode: 'VOIP-LOOP-419',
        outcomeBody:
          'The 03:07 closure vanishes from the audit trail. Your desk handset rings once—caller ID reads EXT. 419 (DESK-B04). A new ticket drops into the log from your own extension at 03:00. Its only text is a timestamp: 03:07.',
        outcomeFootnote: 'You left the receiver on the hook. The line still shows CONNECTED.',
      },
    },
  },

  'case-2': {
    id: 'case-2',
    index: 2,
    ticketNumber: 'INC-0314',
    priority: 'P1',
    baseTime: '03:14',
    slaLabel: 'SLA: BREACH',
    assetTag: 'DOOR-B4-STAIR-N',
    location: 'Building 4, North Stairwell',
    requester: 'ACS-09 — Automated Physical Security',
    title: 'Badge Swipe From an Empty Stairwell',
    description:
      'Access door DOOR-B4-STAIR-N unlocked via RFID credential #0419—your own analyst badge—at 03:14. Console telemetry confirms your badge remained docked on Desk B-04 the entire time.',
    inspectHint: 'Inspect the physical access log to verify the badge signature.',
    cameraId: 'CAM-B4-STAIR-N',
    cctvSprite: './sprites/cctv-stairwell.png',
    cctvIdleCaption: 'Floor 4 North Stairwell locked. RFID reader LED solid red. Corridor vacant.',
    cctvAnomalyCaption:
      'RFID LED flashes emerald ACCESS GRANTED with nobody present. Steel door eases ajar, spilling cold stairwell light across the tile.',
    actions: {
      comply: {
        label: 'Clear as Sensor Fault',
        shortHint: 'Mark the badge swipe as a hardware glitch',
        outcomeTitle: 'Alert Cleared — Distance Erased',
        outcomeCode: 'ACS-ACK-0314',
        outcomeBody:
          'The warning clears immediately. Before your eyes, the audit table quietly rewrites "Floor 4 North Stairwell" to "Desk B-04", erasing the hallway between the open door and your chair.',
        outcomeFootnote: 'Building occupancy indicator ticks from 1 to 2.',
      },
      defy: {
        label: 'Revoke Duplicate Badge & Lock',
        shortHint: 'Lock the stairwell and invalidate badge #0419',
        outcomeTitle: 'Override Rejected — Active Operator',
        outcomeCode: 'ERR-SELF-REVOKE',
        outcomeBody:
          'Security returns ERROR 409: CANNOT REVOKE ACTIVE OPERATOR CREDENTIAL. Your desk status LED blinks red, and a fresh token renews locally from DESK-B04—issued three seconds before you clicked.',
        outcomeFootnote: 'The stairwell door latches shut. From the inside.',
      },
    },
  },

  'case-3': {
    id: 'case-3',
    index: 3,
    ticketNumber: 'INC-0321',
    priority: 'P0-SYS',
    baseTime: '03:21',
    slaLabel: 'SLA: 00:00:00',
    assetTag: 'DESK-B04-CONSOLE',
    location: 'Building 4, Floor 4 — Operations',
    requester: '{ANALYST} — Night Operations (Ext. 419)',
    title: 'Shift Handover Request',
    description:
      '"Requesting immediate console takeover for Desk B-04. The operator currently seated here has been staring into a powered-off monitor since 03:00 and keeps typing into the dark."',
    inspectHint: 'Inspect the immutable audit trail and live Desk B-04 feed.',
    cameraId: 'CAM-B4-OPS',
    cctvSprite: './sprites/cctv-desk-b04.png',
    cctvIdleCaption: 'Ceiling camera behind Desk B-04. Monitors dark. Swivel chair empty.',
    cctvAnomalyCaption:
      'Dual monitors glow brightly on Desk B-04. A calm operator silhouette sits facing the screens—with a faint second outline beside it.',
    actions: {
      comply: {
        label: 'Approve Handover & Sign Out',
        shortHint: 'Release Desk B-04 to the incoming session',
        outcomeTitle: 'Handover Accepted',
        outcomeCode: 'SHIFT-XFER-OK',
        outcomeBody:
          'Your credentials detach smoothly. The ticket queue clears to zero without a sound. On the reflection of the dark glass, the other cursor keeps moving.',
        outcomeFootnote: 'Compiling final shift dossier...',
      },
      defy: {
        label: 'Deny Request & Pull Console Power',
        shortHint: 'Refuse handover and force hard shutdown',
        outcomeTitle: 'Emergency Power Interrupt',
        outcomeCode: 'PWR-HALT-B04',
        outcomeBody:
          'You reject the handover and cut local console power. The room drops into silence—except for the faint phosphor glow still humming inside the monitor glass.',
        outcomeFootnote: 'Recovering immutable shift record...',
      },
    },
  },
} as const

export const ENDINGS: Readonly<Record<EndingId, EndingDefinition>> = {
  'quiet-shift': {
    id: 'quiet-shift',
    numeral: 'ENDING I / IV',
    code: 'SHIFT-00 // ZERO-INCIDENT COMPLIANCE',
    title: 'The Quiet Shift',
    subtitle: 'Every anomaly filed. Every timestamp obeyed.',
    finalClock: '07:00',
    summary:
      'You trusted the impossible closure, dismissed the stairwell swipe, and signed over Desk B-04 without resistance. Halcyon Desk marks your shift 100% SLA-compliant.',
    epilogue:
      'The lobby doors unlock at 07:00, though you cannot remember standing up. In the queue preview for tomorrow night, INC-0300 is already scheduled—and already assigned to {ANALYST}, currently logged in at Desk B-04.',
    systemTag: 'STATUS: COMPLIANT // OPERATOR RETAINED',
    tone: 'compliant',
  },
  'extension-419': {
    id: 'extension-419',
    numeral: 'ENDING II / IV',
    code: 'VOIP-419 // UNRESOLVED LOOP',
    title: 'Extension 419',
    subtitle: 'You fought every rewrite until only the line remained.',
    finalClock: '03:07',
    summary:
      'You challenged the 03:07 log, tried to revoke your own badge, and cut power to Desk B-04. Halcyon Desk falls back to an emergency amber prompt.',
    epilogue:
      'With the workstation dead, your VoIP handset rings once more in the dark. The LCD reads DESK-B04 (EXT. 419). When you finally lift the receiver, the call duration timer is already at 07:00—and you hear keys clicking in time with your breathing.',
    systemTag: 'STATUS: DEFIANT // CALL ACTIVE',
    tone: 'defiant',
  },
  'split-session': {
    id: 'split-session',
    numeral: 'ENDING III / IV',
    code: 'AUTH-DUAL // CONCURRENT SESSION MERGE',
    title: 'Split Session',
    subtitle: 'Half the log remembers you. Half belongs to the other shift.',
    finalClock: '03:21',
    summary:
      'You resisted part of the trail and accepted the rest, then signed the handover. Unable to reconcile two divergent histories, Halcyon Desk merges both operator tokens into one seat.',
    epilogue:
      'The console unlocks smoothly with zero open tickets. On your ID badge in the corner of the screen, two nearly identical silhouettes overlap by a few millimeters. Only one of them blinks.',
    systemTag: 'STATUS: MERGED // 2 OPERATORS AT DESK-B04',
    tone: 'fractured',
  },
  'audit-exception': {
    id: 'audit-exception',
    numeral: 'ENDING IV / IV',
    code: 'DB-ROLLBACK // IMMUTABLE ORPHAN',
    title: 'Audit Exception',
    subtitle: 'You interrupted the write mid-commit.',
    finalClock: '03:00',
    summary:
      'Your mixed responses left the ledger half-rewritten when you pulled the console power. On emergency battery, the database rolls back to 03:00—preserving one unclosed orphan row.',
    epilogue:
      'The screen restores INC-0300 as OPEN. The audit trail is blank except for a single unsent draft typed by {ANALYST}: "Do not close it." Down the quiet hallway, the North Stairwell door clicks gently shut.',
    systemTag: 'STATUS: ROLLBACK // LEDGER CORRUPTED',
    tone: 'rollback',
  },
} as const
