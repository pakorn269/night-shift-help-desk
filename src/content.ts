// Ticket copy and ending text
// This module will contain all game content and copy text

/**
 * The initial support ticket that the player must resolve.
 * Uses const assertion to make all properties deeply readonly.
 */
export const ticket = {
  title: 'Workstation Powered On Unexpectedly',
  description: 'A workstation in Building 3, Floor 2, powered on by itself at 03:00. No scheduled tasks or remote access logs. Requester found it on when arriving for their night shift.',
  requester: 'J. Chen - Facilities',
  time: '03:00'
} as const

/**
 * Ending copy for both decision paths.
 * Uses const assertion to make all properties deeply readonly.
 */
export const endings = {
  close: {
    title: 'Ticket Closed',
    body: "The dashboard flickers. The clock now reads 03:07. You notice a second closure entry in the audit trail, timestamped 03:07, also under your name. You don't remember closing it twice."
  },
  call: {
    title: 'Incoming Ticket',
    body: 'The original closure entry vanishes from the audit trail. The queue rings. A new ticket appears - from your own extension, submitted at 03:00. The description field is empty except for a timestamp: 03:07.'
  }
} as const
