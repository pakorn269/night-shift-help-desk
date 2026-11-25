/**
 * Application entry point for Night Shift Help Desk.
 * Wires pure state machine, Piskel-powered DOM renderer, procedural Web Audio mixer,
 * proportional game feel controller, Shift Check-In, VoIP pickup, CCTV Forensic Zoom,
 * shareable shift report card, persistent ending dossier, and keyboard navigation.
 */
import './style.css'
import { manageFocus, setupKeyboardShortcuts } from './accessibility'
import { NightShiftAudio } from './audio'
import { ALL_ENDINGS, ENDINGS } from './content'
import { JuiceController } from './juice'
import { getElements, render, renderPreferences } from './renderer'
import {
  advanceCase,
  answerPhone,
  callRequester,
  closeTicket,
  formatShareableReport,
  getDreadLevel,
  initialState,
  inspectAudit,
  isPhoneRinging,
  replayCase,
  replayShift,
  setAnalystName,
} from './state'
import { loadProfile, saveProfile, unlockEndingInProfile } from './storage'
import type { GameState, PersistedProfile } from './types'

function initGame(): void {
  let profile: PersistedProfile = loadProfile()
  let currentState: GameState = initialState(profile.analystName)

  const elements = getElements()
  const audio = new NightShiftAudio(profile.preferences.muted, profile.preferences.volume)
  const juice = new JuiceController(profile.preferences.reducedMotion)
  juice.setTarget(elements.shell)

  // Seed Shift Check-In overlay with persisted profile settings
  elements.checkinNameInput.value = profile.analystName
  elements.checkinAudioToggle.checked = !profile.preferences.muted

  const syncUi = (moveFocus = true) => {
    renderPreferences(profile.preferences, elements)
    render(currentState, elements, profile.unlockedEndings)
    audio.setDreadLevel(getDreadLevel(currentState))
    if (isPhoneRinging(currentState)) {
      audio.startPhoneRing()
    } else {
      audio.stopPhoneRing()
    }
    if (moveFocus) {
      manageFocus(currentState, elements)
    }
  }

  const handleCheckInSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const nextState = setAnalystName(currentState, elements.checkinNameInput.value)
    const wantsAudio = elements.checkinAudioToggle.checked

    currentState = nextState
    profile = {
      ...profile,
      analystName: currentState.record.analystName,
      preferences: {
        ...profile.preferences,
        muted: !wantsAudio,
      },
    }
    saveProfile(profile)
    audio.setMuted(!wantsAudio)
    if (wantsAudio) {
      audio.unlock()
      audio.playCaseAdvance()
    }

    elements.checkinModal.hidden = true
    juice.trigger('small', elements.workbench)
    syncUi(true)
  }

  const openCctvModal = () => {
    elements.cctvModal.hidden = false
    audio.playClick()
    elements.cctvModalClose.focus()
  }

  const closeCctvModal = (): boolean => {
    if (elements.cctvModal.hidden) return false
    elements.cctvModal.hidden = true
    audio.playClick()
    elements.cctvZoomButton.focus()
    return true
  }

  const handleInspect = () => {
    const next = inspectAudit(currentState)
    if (next === currentState) return
    currentState = next
    audio.playAuditReveal()
    juice.trigger('medium', elements.auditTrail)
    syncUi(true)
  }

  const handleComply = () => {
    const next = closeTicket(currentState)
    if (next === currentState) return
    currentState = next
    audio.playClockJump()
    juice.trigger('large', elements.clock)
    syncUi(true)
  }

  const handleDefy = () => {
    const next = callRequester(currentState)
    if (next === currentState) return
    currentState = next
    if (next.phase === 'case-resolved' && next.caseId === 'case-1') {
      audio.playClockJump()
    } else {
      audio.playAuditReveal()
    }
    juice.trigger('large', elements.cctvPanel)
    syncUi(true)
  }

  const handleAnswerPhone = () => {
    const next = answerPhone(currentState)
    if (next === currentState) return
    currentState = next
    audio.playPhonePickup()
    juice.trigger('medium', elements.voipTranscript)
    syncUi(false)
  }

  const handleAdvance = () => {
    const next = advanceCase(currentState)
    if (next === currentState) return
    currentState = next
    if (currentState.phase === 'shift-complete') {
      profile = unlockEndingInProfile(profile, currentState.endingId)
      audio.playEndingStinger(currentState.endingId)
      juice.trigger('large', elements.shiftDossier)
    } else {
      audio.playCaseAdvance()
      juice.trigger('small', elements.ticketSection)
    }
    syncUi(true)
  }

  const handleReplayCase = () => {
    const next = replayCase(currentState)
    if (next === currentState) return
    currentState = next
    audio.playClick()
    juice.trigger('small', elements.ticketSection)
    syncUi(true)
  }

  const handleReplayShift = () => {
    const next = replayShift(currentState)
    if (next === currentState) return
    currentState = next
    elements.copyReportButton.textContent = 'Copy Shift Report'
    audio.playCaseAdvance()
    juice.trigger('small', elements.workbench)
    syncUi(true)
  }

  const handleCopyReport = async () => {
    if (currentState.phase !== 'shift-complete') return
    const def = ENDINGS[currentState.endingId]
    const text = formatShareableReport(
      currentState,
      profile.unlockedEndings.length,
      ALL_ENDINGS.length,
      def.title,
      def.code,
    )
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      }
      elements.copyReportButton.textContent = 'Report Copied ✓'
      audio.playClick()
      window.setTimeout(() => {
        elements.copyReportButton.textContent = 'Copy Shift Report'
      }, 2400)
    } catch {
      elements.copyReportButton.textContent = 'Copy Failed'
    }
  }

  const handleToggleMute = () => {
    const muted = !profile.preferences.muted
    profile = {
      ...profile,
      preferences: { ...profile.preferences, muted },
    }
    saveProfile(profile)
    audio.setMuted(muted)
    if (!muted) audio.playClick()
    renderPreferences(profile.preferences, elements)
  }

  const handleVolumeChange = () => {
    const vol = Number(elements.volumeSlider.value) / 100
    profile = {
      ...profile,
      preferences: { ...profile.preferences, volume: vol, muted: vol === 0 ? true : profile.preferences.muted },
    }
    saveProfile(profile)
    audio.setVolume(vol)
    audio.setMuted(profile.preferences.muted)
    renderPreferences(profile.preferences, elements)
  }

  const handleToggleMotion = () => {
    const reducedMotion = !profile.preferences.reducedMotion
    profile = {
      ...profile,
      preferences: { ...profile.preferences, reducedMotion },
    }
    saveProfile(profile)
    juice.setReducedMotion(reducedMotion)
    audio.playClick()
    renderPreferences(profile.preferences, elements)
  }

  const handleAnalystNameCommit = () => {
    const next = setAnalystName(currentState, elements.analystNameInput.value)
    currentState = next
    profile = { ...profile, analystName: currentState.record.analystName }
    saveProfile(profile)
    syncUi(false)
  }

  // Wire controls
  elements.checkinForm.addEventListener('submit', handleCheckInSubmit)
  elements.cctvZoomButton.addEventListener('click', openCctvModal)
  elements.cctvModalClose.addEventListener('click', closeCctvModal)
  elements.cctvModal.addEventListener('click', (e) => {
    if (e.target === elements.cctvModal) closeCctvModal()
  })

  elements.inspectButton.addEventListener('click', handleInspect)
  elements.closeButton.addEventListener('click', handleComply)
  elements.callButton.addEventListener('click', handleDefy)
  elements.phoneAnswerButton.addEventListener('click', handleAnswerPhone)
  elements.nextCaseButton.addEventListener('click', handleAdvance)
  elements.replayCaseButton.addEventListener('click', handleReplayCase)
  elements.shiftReplayButton.addEventListener('click', handleReplayShift)
  elements.copyReportButton.addEventListener('click', () => {
    void handleCopyReport()
  })

  elements.muteButton.addEventListener('click', handleToggleMute)
  elements.volumeSlider.addEventListener('input', handleVolumeChange)
  elements.motionButton.addEventListener('click', handleToggleMotion)

  elements.analystNameInput.addEventListener('change', handleAnalystNameCommit)
  elements.analystNameInput.addEventListener('blur', handleAnalystNameCommit)

  setupKeyboardShortcuts(() => currentState, {
    onInspect: handleInspect,
    onComply: handleComply,
    onDefy: handleDefy,
    onAdvance: handleAdvance,
    onReplayCase: handleReplayCase,
    onReplayShift: handleReplayShift,
    onToggleMute: handleToggleMute,
    onAnswerPhone: handleAnswerPhone,
    onToggleCctvZoom: () => {
      if (elements.cctvModal.hidden) openCctvModal()
      else closeCctvModal()
    },
    onEscapeModal: () => closeCctvModal(),
    isModalOpen: () => !elements.checkinModal.hidden || !elements.cctvModal.hidden,
  })

  // Initial render (Check-In modal sits cleanly on top; focus its input)
  syncUi(false)
  elements.checkinNameInput.focus()
}

document.addEventListener('DOMContentLoaded', initGame)
