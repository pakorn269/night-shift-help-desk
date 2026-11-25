/**
 * Event-driven DOM Renderer for Night Shift Help Desk (Halcyon Desk v4.2).
 * Purely maps GameState + UserProfile into crisp enterprise UI + Piskel pixel art sprites.
 * All sprite paths use relative `./sprites/...` URLs for 100% subpath portability (GitHub Pages + root hosts).
 */
import {
  ALL_ENDINGS,
  ANALYST_DESK,
  ANALYST_EXTENSION,
  CASE_ORDER,
  CASES,
  ENDINGS,
  SYSTEM_MEMOS,
  VOIP_TRANSCRIPT,
  interpolateAnalyst,
} from './content'
import {
  getAuditEntries,
  getCaseRequester,
  getCctvFeed,
  getClockDisplay,
  getDreadLevel,
  isCoffeeFrozen,
  isPhoneConnected,
  isPhoneRinging,
} from './state'
import type { EndingId, GameState, UserPreferences } from './types'

export interface DOMElements {
  shell: HTMLElement
  brandLogo: HTMLElement
  clock: HTMLElement
  ntpBadge: HTMLElement
  systemMemo: HTMLElement
  analystBadgeSprite: HTMLElement
  analystNameInput: HTMLInputElement
  analystMeta: HTMLElement
  muteButton: HTMLButtonElement
  volumeSlider: HTMLInputElement
  motionButton: HTMLButtonElement

  // Check-in & CCTV Zoom modals
  checkinModal: HTMLElement
  checkinLogoSprite: HTMLElement
  checkinForm: HTMLFormElement
  checkinNameInput: HTMLInputElement
  checkinAudioToggle: HTMLInputElement
  cctvModal: HTMLElement
  cctvModalTitle: HTMLElement
  cctvModalStatus: HTMLElement
  cctvModalSprite: HTMLElement
  cctvModalLocation: HTMLElement
  cctvModalCaption: HTMLElement
  cctvModalClose: HTMLButtonElement

  // Queue & progress
  queueList: HTMLElement
  endingsCounter: HTMLElement
  endingsPips: HTMLElement

  // Main workbench (hidden when shift-complete)
  workbench: HTMLElement
  ticketSection: HTMLElement
  ticketIdBadge: HTMLElement
  ticketPriorityBadge: HTMLElement
  ticketAssetBadge: HTMLElement
  ticketSlaBadge: HTMLElement
  ticketTitle: HTMLElement
  ticketDescription: HTMLElement
  ticketMeta: HTMLElement
  inspectButton: HTMLButtonElement
  inspectHint: HTMLElement

  // Audit trail
  auditTrail: HTMLElement
  auditList: HTMLElement
  auditStatusPill: HTMLElement

  // Decision controls
  controls: HTMLElement
  controlsLockNote: HTMLElement
  closeButton: HTMLButtonElement
  closeButtonLabel: HTMLElement
  closeButtonHint: HTMLElement
  callButton: HTMLButtonElement
  callButtonLabel: HTMLElement
  callButtonHint: HTMLElement

  // Case outcome banner
  caseOutcome: HTMLElement
  outcomeIcon: HTMLImageElement
  outcomeCode: HTMLElement
  outcomeTitle: HTMLElement
  outcomeBody: HTMLElement
  outcomeFootnote: HTMLElement
  nextCaseButton: HTMLButtonElement
  replayCaseButton: HTMLButtonElement

  // Hardware & CCTV telemetry panel
  cctvPanel: HTMLElement
  cctvZoomButton: HTMLButtonElement
  cctvSprite: HTMLElement
  cctvCameraId: HTMLElement
  cctvStatusPill: HTMLElement
  cctvLocation: HTMLElement
  cctvCaption: HTMLElement
  phoneSprite: HTMLElement
  phoneStatus: HTMLElement
  phoneAnswerButton: HTMLButtonElement
  voipTranscript: HTMLElement
  voipTranscriptHead: HTMLElement
  voipTranscriptLines: HTMLElement
  coffeeSprite: HTMLElement
  coffeeStatus: HTMLElement

  // Final Shift Dossier
  shiftDossier: HTMLElement
  dossierNumeral: HTMLElement
  dossierCode: HTMLElement
  dossierTitle: HTMLElement
  dossierSubtitle: HTMLElement
  dossierClock: HTMLElement
  dossierSystemTag: HTMLElement
  dossierSummary: HTMLElement
  dossierEpilogue: HTMLElement
  dossierLedger: HTMLElement
  dossierGallery: HTMLElement
  shiftReplayButton: HTMLButtonElement
  copyReportButton: HTMLButtonElement

  // Screen reader status live region
  srAnnouncer: HTMLElement
}

function mustGet<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`Required element #${id} not found`)
  }
  return el as T
}

export function getElements(): DOMElements {
  return {
    shell: mustGet('console-shell'),
    brandLogo: mustGet('brand-logo-sprite'),
    clock: mustGet('clock'),
    ntpBadge: mustGet('ntp-badge'),
    systemMemo: mustGet('system-memo-text'),
    analystBadgeSprite: mustGet('analyst-badge-sprite'),
    analystNameInput: mustGet<HTMLInputElement>('analyst-name-input'),
    analystMeta: mustGet('analyst-meta'),
    muteButton: mustGet<HTMLButtonElement>('mute-button'),
    volumeSlider: mustGet<HTMLInputElement>('volume-slider'),
    motionButton: mustGet<HTMLButtonElement>('motion-button'),

    checkinModal: mustGet('checkin-modal'),
    checkinLogoSprite: mustGet('checkin-logo-sprite'),
    checkinForm: mustGet<HTMLFormElement>('checkin-form'),
    checkinNameInput: mustGet<HTMLInputElement>('checkin-name-input'),
    checkinAudioToggle: mustGet<HTMLInputElement>('checkin-audio-toggle'),
    cctvModal: mustGet('cctv-modal'),
    cctvModalTitle: mustGet('cctv-modal-title'),
    cctvModalStatus: mustGet('cctv-modal-status'),
    cctvModalSprite: mustGet('cctv-modal-sprite'),
    cctvModalLocation: mustGet('cctv-modal-location'),
    cctvModalCaption: mustGet('cctv-modal-caption'),
    cctvModalClose: mustGet<HTMLButtonElement>('cctv-modal-close'),

    queueList: mustGet('queue-list'),
    endingsCounter: mustGet('endings-counter'),
    endingsPips: mustGet('endings-pips'),

    workbench: mustGet('workbench'),
    ticketSection: mustGet('ticket-section'),
    ticketIdBadge: mustGet('ticket-id-badge'),
    ticketPriorityBadge: mustGet('ticket-priority-badge'),
    ticketAssetBadge: mustGet('ticket-asset-badge'),
    ticketSlaBadge: mustGet('ticket-sla-badge'),
    ticketTitle: mustGet('ticket-title'),
    ticketDescription: mustGet('ticket-description'),
    ticketMeta: mustGet('ticket-meta'),
    inspectButton: mustGet<HTMLButtonElement>('inspect-button'),
    inspectHint: mustGet('inspect-hint'),

    auditTrail: mustGet('audit-trail'),
    auditList: mustGet('audit-list'),
    auditStatusPill: mustGet('audit-status-pill'),

    controls: mustGet('controls'),
    controlsLockNote: mustGet('controls-lock-note'),
    closeButton: mustGet<HTMLButtonElement>('close-button'),
    closeButtonLabel: mustGet('close-button-label'),
    closeButtonHint: mustGet('close-button-hint'),
    callButton: mustGet<HTMLButtonElement>('call-button'),
    callButtonLabel: mustGet('call-button-label'),
    callButtonHint: mustGet('call-button-hint'),

    caseOutcome: mustGet('case-outcome'),
    outcomeIcon: mustGet<HTMLImageElement>('outcome-icon'),
    outcomeCode: mustGet('outcome-code'),
    outcomeTitle: mustGet('outcome-title'),
    outcomeBody: mustGet('outcome-body'),
    outcomeFootnote: mustGet('outcome-footnote'),
    nextCaseButton: mustGet<HTMLButtonElement>('next-case-button'),
    replayCaseButton: mustGet<HTMLButtonElement>('replay-case-button'),

    cctvPanel: mustGet('cctv-panel'),
    cctvZoomButton: mustGet<HTMLButtonElement>('cctv-zoom-button'),
    cctvSprite: mustGet('cctv-sprite'),
    cctvCameraId: mustGet('cctv-camera-id'),
    cctvStatusPill: mustGet('cctv-status-pill'),
    cctvLocation: mustGet('cctv-location'),
    cctvCaption: mustGet('cctv-caption'),
    phoneSprite: mustGet('phone-sprite'),
    phoneStatus: mustGet('phone-status'),
    phoneAnswerButton: mustGet<HTMLButtonElement>('phone-answer-button'),
    voipTranscript: mustGet('voip-transcript'),
    voipTranscriptHead: mustGet('voip-transcript-head'),
    voipTranscriptLines: mustGet('voip-transcript-lines'),
    coffeeSprite: mustGet('coffee-sprite'),
    coffeeStatus: mustGet('coffee-status'),

    shiftDossier: mustGet('shift-dossier'),
    dossierNumeral: mustGet('dossier-numeral'),
    dossierCode: mustGet('dossier-code'),
    dossierTitle: mustGet('dossier-title'),
    dossierSubtitle: mustGet('dossier-subtitle'),
    dossierClock: mustGet('dossier-clock'),
    dossierSystemTag: mustGet('dossier-system-tag'),
    dossierSummary: mustGet('dossier-summary'),
    dossierEpilogue: mustGet('dossier-epilogue'),
    dossierLedger: mustGet('dossier-ledger'),
    dossierGallery: mustGet('dossier-gallery'),
    shiftReplayButton: mustGet<HTMLButtonElement>('shift-replay-button'),
    copyReportButton: mustGet<HTMLButtonElement>('copy-report-button'),

    srAnnouncer: mustGet('sr-announcer'),
  }
}

/**
 * Binds subpath-safe relative sprite sheet URLs on all CSS sprite containers.
 */
export function bindStaticSprites(elements: DOMElements): void {
  elements.brandLogo.style.backgroundImage = 'url("./sprites/halcyon-logo.png")'
  elements.checkinLogoSprite.style.backgroundImage = 'url("./sprites/halcyon-logo.png")'
  elements.analystBadgeSprite.style.backgroundImage = 'url("./sprites/analyst-badge.png")'
  elements.phoneSprite.style.backgroundImage = 'url("./sprites/desk-phone.png")'
  elements.coffeeSprite.style.backgroundImage = 'url("./sprites/coffee-mug.png")'
}

export function renderPreferences(prefs: UserPreferences, elements: DOMElements): void {
  document.documentElement.dataset.reducedMotion = prefs.reducedMotion ? 'true' : 'false'

  elements.muteButton.setAttribute('aria-pressed', String(prefs.muted))
  elements.muteButton.textContent = prefs.muted ? 'Audio: OFF' : 'Audio: ON'
  elements.volumeSlider.value = String(Math.round(prefs.volume * 100))
  elements.volumeSlider.disabled = prefs.muted

  elements.motionButton.setAttribute('aria-pressed', String(prefs.reducedMotion))
  elements.motionButton.textContent = prefs.reducedMotion ? 'Calm: ON' : 'Calm: OFF'
}

export function renderUnlockedProgress(
  unlockedEndings: readonly EndingId[],
  elements: DOMElements,
): void {
  elements.endingsCounter.textContent = `${unlockedEndings.length} / ${ALL_ENDINGS.length} ENDINGS`
  elements.endingsPips.innerHTML = ''
  for (const id of ALL_ENDINGS) {
    const pip = document.createElement('span')
    const unlocked = unlockedEndings.includes(id)
    pip.className = unlocked ? 'dossier-pip unlocked' : 'dossier-pip'
    pip.title = unlocked ? ENDINGS[id].title : 'Undiscovered Shift Ending'
    pip.setAttribute('aria-label', unlocked ? `Unlocked: ${ENDINGS[id].title}` : 'Undiscovered ending')
    elements.endingsPips.appendChild(pip)
  }
}

function renderQueue(state: GameState, elements: DOMElements): void {
  elements.queueList.innerHTML = ''

  const activeCaseId = state.phase === 'shift-complete' ? null : state.caseId

  for (const id of CASE_ORDER) {
    const def = CASES[id]
    const choice = state.record.choices[id]
    const isActive = activeCaseId === id
    const isResolved = Boolean(choice)

    const li = document.createElement('li')
    li.className = 'queue-item'
    if (isActive) li.classList.add('active')
    if (isResolved) li.classList.add('resolved')
    if (!isActive && !isResolved) li.classList.add('locked')

    const iconSrc = isResolved
      ? './sprites/icons/icon-archive.png'
      : id === 'case-2'
        ? './sprites/icons/icon-badge.png'
        : id === 'case-3'
          ? './sprites/icons/icon-anomaly.png'
          : './sprites/icons/icon-ticket.png'

    const statusLabel = isResolved
      ? choice === 'comply'
        ? 'FILED'
        : 'FLAGGED'
      : isActive
        ? state.phase === 'audit-inspected'
          ? 'ANOMALY'
          : 'ACTIVE'
        : 'QUEUED'

    const topRow = document.createElement('div')
    topRow.className = 'queue-item-top'

    const img = document.createElement('img')
    img.src = iconSrc
    img.alt = ''
    img.width = 20
    img.height = 20
    img.className = 'pixel-icon'

    const codeSpan = document.createElement('span')
    codeSpan.className = 'queue-code'
    codeSpan.textContent = `${def.ticketNumber} · ${def.priority}`

    const statusSpan = document.createElement('span')
    statusSpan.className = `queue-status status-${statusLabel.toLowerCase()}`
    statusSpan.textContent = statusLabel

    topRow.append(img, codeSpan, statusSpan)

    const titleEl = document.createElement('div')
    titleEl.className = 'queue-title'
    titleEl.textContent = !isActive && !isResolved ? 'Encrypted — Pending Queue' : def.title

    const timeEl = document.createElement('div')
    timeEl.className = 'queue-time'
    timeEl.textContent = !isActive && !isResolved ? 'Scheduled --:--' : `${def.baseTime} · ${def.assetTag}`

    li.append(topRow, titleEl, timeEl)
    elements.queueList.appendChild(li)
  }

  // Phantom 4th ticket injected live into the queue when player defies Case 1 (Call Requester)
  if (state.record.choices['case-1'] === 'defy') {
    const phantom = document.createElement('li')
    phantom.className = 'queue-item phantom-ticket'

    const topRow = document.createElement('div')
    topRow.className = 'queue-item-top'

    const img = document.createElement('img')
    img.src = './sprites/icons/icon-anomaly.png'
    img.alt = ''
    img.width = 20
    img.height = 20
    img.className = 'pixel-icon'

    const codeSpan = document.createElement('span')
    codeSpan.className = 'queue-code'
    codeSpan.textContent = 'INC-0419 · SELF'

    const statusSpan = document.createElement('span')
    statusSpan.className = 'queue-status status-anomaly'
    statusSpan.textContent = state.record.phoneAnswered ? 'CONNECTED' : 'RINGING'

    topRow.append(img, codeSpan, statusSpan)

    const titleEl = document.createElement('div')
    titleEl.className = 'queue-title'
    titleEl.textContent = `Origin: ${ANALYST_EXTENSION} (${state.record.analystName})`

    const timeEl = document.createElement('div')
    timeEl.className = 'queue-time'
    timeEl.textContent = '03:00 · Body: "03:07"'

    phantom.append(topRow, titleEl, timeEl)
    elements.queueList.appendChild(phantom)
  }
}

function renderAuditTrail(state: GameState, elements: DOMElements): void {
  const entries = getAuditEntries(state)

  if (state.phase === 'initial' || state.phase === 'shift-complete') {
    elements.auditTrail.hidden = true
    elements.auditList.innerHTML = ''
    return
  }

  elements.auditTrail.hidden = false
  elements.auditList.innerHTML = ''

  const hasAnomaly = entries.some((e) => e.severity === 'anomaly' || e.severity === 'phantom')
  elements.auditStatusPill.textContent = hasAnomaly ? 'INTEGRITY MISMATCH' : 'VERIFIED'
  elements.auditStatusPill.dataset.severity = hasAnomaly ? 'anomaly' : 'normal'

  for (const entry of entries) {
    const li = document.createElement('li')
    li.className = `audit-row severity-${entry.severity}`

    const timeEl = document.createElement('span')
    timeEl.className = 'audit-time'
    timeEl.textContent = entry.time

    const mainEl = document.createElement('div')
    mainEl.className = 'audit-detail'

    const actorEl = document.createElement('div')
    actorEl.className = 'audit-actor'
    actorEl.textContent = entry.actor

    const actionEl = document.createElement('div')
    actionEl.className = 'audit-action'
    actionEl.textContent = entry.action

    mainEl.append(actorEl, actionEl)

    li.append(timeEl, mainEl)

    if (entry.tag) {
      const tagEl = document.createElement('span')
      tagEl.className = `audit-tag tag-${entry.severity}`
      tagEl.textContent = entry.tag
      li.appendChild(tagEl)
    }

    elements.auditList.appendChild(li)
  }
}

function renderTelemetry(state: GameState, elements: DOMElements): void {
  const cctv = getCctvFeed(state)
  elements.cctvSprite.style.backgroundImage = `url("${cctv.spriteSheet}")`
  elements.cctvSprite.dataset.mode = cctv.mode
  elements.cctvCameraId.textContent = cctv.cameraId
  elements.cctvStatusPill.textContent = cctv.statusBadge
  elements.cctvStatusPill.dataset.mode = cctv.mode
  elements.cctvLocation.textContent = cctv.locationLabel
  elements.cctvCaption.textContent = cctv.caption

  // Sync Zoom modal sprite & caption live so zooming always matches active state
  elements.cctvModalTitle.textContent = `${cctv.cameraId} // FORENSIC ZOOM`
  elements.cctvModalStatus.textContent = cctv.statusBadge
  elements.cctvModalStatus.dataset.mode = cctv.mode
  elements.cctvModalSprite.style.backgroundImage = `url("${cctv.spriteSheet}")`
  elements.cctvModalSprite.dataset.mode = cctv.mode
  elements.cctvModalLocation.textContent = cctv.locationLabel
  elements.cctvModalCaption.textContent = cctv.caption

  // VoIP Desk Phone (idle -> ringing -> answered connected transcript!)
  const ringing = isPhoneRinging(state)
  const connected = isPhoneConnected(state)
  elements.phoneSprite.dataset.state = ringing ? 'ringing' : 'idle'
  elements.phoneStatus.textContent = ringing
    ? 'INCOMING · EXT. 419 (SELF)'
    : connected
      ? VOIP_TRANSCRIPT.elapsedLabel
      : 'EXT. 419 · ON HOOK'
  elements.phoneStatus.dataset.alert = ringing || connected ? 'true' : 'false'

  elements.phoneAnswerButton.hidden = !ringing
  if (connected) {
    elements.voipTranscript.hidden = false
    elements.voipTranscriptHead.textContent = VOIP_TRANSCRIPT.callerId
    elements.voipTranscriptLines.innerHTML = ''
    for (const rawLine of VOIP_TRANSCRIPT.lines) {
      const li = document.createElement('li')
      li.textContent = interpolateAnalyst(rawLine, state.record.analystName)
      elements.voipTranscriptLines.appendChild(li)
    }
  } else {
    elements.voipTranscript.hidden = true
  }

  const frozen = isCoffeeFrozen(state)
  elements.coffeeSprite.dataset.state = frozen ? 'frozen' : 'warm'
  elements.coffeeStatus.textContent = frozen ? 'MUG · FROZEN AT 03:07' : 'MUG · WARM'
  elements.coffeeStatus.dataset.alert = frozen ? 'true' : 'false'
}

function renderShiftDossier(
  state: Extract<GameState, { phase: 'shift-complete' }>,
  unlockedEndings: readonly EndingId[],
  elements: DOMElements,
): void {
  const def = ENDINGS[state.endingId]
  const analyst = state.record.analystName

  elements.shiftDossier.hidden = false
  elements.shiftDossier.dataset.tone = def.tone
  elements.dossierNumeral.textContent = def.numeral
  elements.dossierCode.textContent = def.code
  elements.dossierTitle.textContent = def.title
  elements.dossierSubtitle.textContent = def.subtitle
  elements.dossierClock.textContent = def.finalClock
  elements.dossierSystemTag.textContent = def.systemTag
  elements.dossierSummary.textContent = interpolateAnalyst(def.summary, analyst)
  elements.dossierEpilogue.textContent = interpolateAnalyst(def.epilogue, analyst)

  // 3-Case decision ledger
  elements.dossierLedger.innerHTML = ''
  for (const id of CASE_ORDER) {
    const cDef = CASES[id]
    const choice = state.record.choices[id] ?? 'comply'
    const act = cDef.actions[choice]
    const li = document.createElement('li')
    li.className = `ledger-row choice-${choice}`

    const code = document.createElement('span')
    code.className = 'ledger-code'
    code.textContent = `${cDef.ticketNumber} (${cDef.baseTime})`

    const decision = document.createElement('span')
    decision.className = 'ledger-decision'
    decision.textContent = act.label

    const tag = document.createElement('span')
    tag.className = 'ledger-tag'
    tag.textContent = choice === 'comply' ? 'COMPLIED' : 'DEFIED'

    li.append(code, decision, tag)
    elements.dossierLedger.appendChild(li)
  }

  // 4-Ending discovery gallery
  elements.dossierGallery.innerHTML = ''
  for (const id of ALL_ENDINGS) {
    const eDef = ENDINGS[id]
    const unlocked = unlockedEndings.includes(id)
    const isCurrent = id === state.endingId

    const card = document.createElement('div')
    card.className = 'ending-card'
    if (unlocked) card.classList.add('unlocked')
    if (isCurrent) card.classList.add('current')

    const num = document.createElement('div')
    num.className = 'ending-card-num'
    num.textContent = isCurrent ? `${eDef.numeral} · CURRENT` : eDef.numeral

    const title = document.createElement('div')
    title.className = 'ending-card-title'
    title.textContent = unlocked ? eDef.title : 'Encrypted Shift Outcome'

    const hint = document.createElement('div')
    hint.className = 'ending-card-hint'
    hint.textContent = unlocked ? eDef.subtitle : 'Try a different compliance/defiance pattern.'

    card.append(num, title, hint)
    elements.dossierGallery.appendChild(card)
  }
}

/**
 * Main render function: synchronizes every DOM section and Piskel pixel sprite to GameState.
 */
export function render(
  state: GameState,
  elements: DOMElements,
  unlockedEndings: readonly EndingId[] = [],
): void {
  const dread = getDreadLevel(state)
  const clockStr = getClockDisplay(state)

  bindStaticSprites(elements)

  elements.shell.dataset.dread = String(dread)
  elements.shell.dataset.phase = state.phase
  elements.brandLogo.dataset.dread = String(dread)
  elements.analystBadgeSprite.dataset.dread = String(dread)

  elements.clock.textContent = clockStr
  const ntpStates = ['NTP: SYNCED', 'NTP: DRIFT +420s', 'NTP: DESYNC', 'NTP: OVERRIDE'] as const
  elements.ntpBadge.textContent = ntpStates[dread]
  elements.ntpBadge.dataset.dread = String(dread)
  elements.systemMemo.textContent = SYSTEM_MEMOS[dread]

  if (document.activeElement !== elements.analystNameInput) {
    elements.analystNameInput.value = state.record.analystName
  }
  elements.analystMeta.textContent = `${ANALYST_DESK} · ${ANALYST_EXTENSION}`

  renderQueue(state, elements)
  renderTelemetry(state, elements)
  renderUnlockedProgress(unlockedEndings, elements)

  if (state.phase === 'shift-complete') {
    elements.workbench.hidden = true
    renderShiftDossier(state, unlockedEndings, elements)
    elements.srAnnouncer.textContent = `Shift complete. ${ENDINGS[state.endingId].title}. Clock reads ${clockStr}.`
    return
  }

  elements.workbench.hidden = false
  elements.shiftDossier.hidden = true

  const def = CASES[state.caseId]
  const analyst = state.record.analystName

  elements.ticketIdBadge.textContent = `${def.ticketNumber} · CASE ${def.index}/3`
  elements.ticketPriorityBadge.textContent = def.priority
  elements.ticketPriorityBadge.dataset.priority = def.priority
  elements.ticketAssetBadge.textContent = def.assetTag
  elements.ticketSlaBadge.textContent = def.slaLabel
  elements.ticketTitle.textContent = def.title
  elements.ticketDescription.textContent = interpolateAnalyst(def.description, analyst)
  elements.ticketMeta.textContent = `Requester: ${getCaseRequester(state.caseId, analyst)}  |  Location: ${def.location}  |  Logged: ${def.baseTime}`
  elements.inspectHint.textContent = def.inspectHint

  elements.inspectButton.disabled = state.phase !== 'initial'
  elements.inspectButton.textContent =
    state.phase === 'initial' ? 'Inspect Audit Trail  [I]' : 'Audit Trail Inspected ✓'

  renderAuditTrail(state, elements)

  elements.closeButtonLabel.textContent = def.actions.comply.label
  elements.closeButtonHint.textContent = def.actions.comply.shortHint
  elements.callButtonLabel.textContent = def.actions.defy.label
  elements.callButtonHint.textContent = def.actions.defy.shortHint

  const decisionsEnabled = state.phase === 'audit-inspected'
  elements.closeButton.disabled = !decisionsEnabled
  elements.callButton.disabled = !decisionsEnabled
  elements.controls.hidden = state.phase === 'case-resolved'
  elements.controlsLockNote.hidden = state.phase !== 'initial'

  if (state.phase === 'case-resolved') {
    const act = def.actions[state.choice]
    elements.caseOutcome.hidden = false
    elements.caseOutcome.dataset.choice = state.choice
    elements.outcomeIcon.src =
      state.choice === 'comply' ? './sprites/icons/icon-clock.png' : './sprites/icons/icon-anomaly.png'
    elements.outcomeCode.textContent = act.outcomeCode
    elements.outcomeTitle.textContent = act.outcomeTitle
    elements.outcomeBody.textContent = interpolateAnalyst(act.outcomeBody, analyst)
    elements.outcomeFootnote.textContent = interpolateAnalyst(act.outcomeFootnote, analyst)

    elements.nextCaseButton.textContent =
      state.caseId === 'case-1'
        ? 'Open Next Ticket: INC-0314  [N]'
        : state.caseId === 'case-2'
          ? 'Open Final Ticket: INC-0321  [N]'
          : 'Compile Final Shift Dossier  [N]'

    elements.srAnnouncer.textContent = `${act.outcomeTitle}. Clock reads ${clockStr}.`
  } else {
    elements.caseOutcome.hidden = true
    if (state.phase === 'audit-inspected') {
      elements.srAnnouncer.textContent = `Audit trail revealed for ${def.ticketNumber}. Decision controls unlocked.`
    }
  }
}
