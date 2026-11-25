/**
 * Versioned localStorage persistence for unlocked endings, analyst handle, and accessibility/audio prefs.
 * Safe in restricted / headless / jsdom environments (never throws).
 */
import { ALL_ENDINGS, DEFAULT_ANALYST_NAME } from './content'
import { sanitizeAnalystName } from './state'
import type { EndingId, PersistedProfile, UserPreferences } from './types'

const STORAGE_KEY = 'night-shift-help-desk:v1'

const DEFAULT_PREFERENCES: UserPreferences = {
  muted: false,
  volume: 0.65,
  reducedMotion: false,
}

export function defaultProfile(): PersistedProfile {
  const systemReduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return {
    version: 1,
    analystName: DEFAULT_ANALYST_NAME,
    unlockedEndings: [],
    preferences: {
      ...DEFAULT_PREFERENCES,
      reducedMotion: systemReduced,
    },
  }
}

function isValidEndingId(value: unknown): value is EndingId {
  return typeof value === 'string' && (ALL_ENDINGS as readonly string[]).includes(value)
}

export function loadProfile(): PersistedProfile {
  const fallback = defaultProfile()
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback

    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    const rec = parsed as Record<string, unknown>
    if (rec.version !== 1) return fallback

    const analystName =
      typeof rec.analystName === 'string'
        ? sanitizeAnalystName(rec.analystName)
        : fallback.analystName

    const unlockedRaw = Array.isArray(rec.unlockedEndings) ? rec.unlockedEndings : []
    const unlockedSet = new Set<EndingId>()
    for (const item of unlockedRaw) {
      if (isValidEndingId(item)) unlockedSet.add(item)
    }

    const prefsRaw =
      rec.preferences && typeof rec.preferences === 'object'
        ? (rec.preferences as Record<string, unknown>)
        : {}

    const volumeNum =
      typeof prefsRaw.volume === 'number' && Number.isFinite(prefsRaw.volume)
        ? Math.min(1, Math.max(0, prefsRaw.volume))
        : fallback.preferences.volume

    return {
      version: 1,
      analystName,
      unlockedEndings: Array.from(unlockedSet),
      preferences: {
        muted: typeof prefsRaw.muted === 'boolean' ? prefsRaw.muted : fallback.preferences.muted,
        volume: volumeNum,
        reducedMotion:
          typeof prefsRaw.reducedMotion === 'boolean'
            ? prefsRaw.reducedMotion
            : fallback.preferences.reducedMotion,
      },
    }
  } catch {
    return fallback
  }
}

export function saveProfile(profile: PersistedProfile): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Ignore quota or privacy-mode storage errors
  }
}

export function unlockEndingInProfile(profile: PersistedProfile, endingId: EndingId): PersistedProfile {
  if (profile.unlockedEndings.includes(endingId)) return profile
  const updated: PersistedProfile = {
    ...profile,
    unlockedEndings: [...profile.unlockedEndings, endingId],
  }
  saveProfile(updated)
  return updated
}
