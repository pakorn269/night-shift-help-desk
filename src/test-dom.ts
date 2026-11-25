/**
 * Shared minimal DOM fixture and safe Storage stub for renderer & integration tests.
 */
export function ensureMemoryLocalStorage(): void {
  const store = new Map<string, string>()
  const mockStorage: Storage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  })
}

export function mountConsoleDOM(): void {
  ensureMemoryLocalStorage()
  document.body.innerHTML = `
    <div id="phosphor-veil"></div>
    <div id="sr-announcer"></div>

    <div id="checkin-modal" hidden>
      <div id="checkin-logo-sprite"></div>
      <form id="checkin-form">
        <input id="checkin-name-input" value="A. Mercer" />
        <input id="checkin-audio-toggle" type="checkbox" checked />
        <button id="checkin-submit-btn" type="submit"></button>
      </form>
    </div>

    <div id="cctv-modal" hidden>
      <h2 id="cctv-modal-title"></h2>
      <span id="cctv-modal-status"></span>
      <button id="cctv-modal-close" type="button"></button>
      <div id="cctv-modal-sprite"></div>
      <span id="cctv-modal-location"></span>
      <p id="cctv-modal-caption"></p>
    </div>

    <div id="console-shell" data-dread="0" data-phase="initial">
      <div id="brand-logo-sprite" data-dread="0"></div>
      <div id="clock">03:00</div>
      <span id="ntp-badge" data-dread="0"></span>
      <span id="system-memo-text"></span>
      <div id="analyst-badge-sprite" data-dread="0"></div>
      <input id="analyst-name-input" value="A. Mercer" />
      <span id="analyst-meta"></span>
      <button id="mute-button" type="button"></button>
      <input id="volume-slider" type="range" value="65" />
      <button id="motion-button" type="button"></button>

      <ul id="queue-list"></ul>
      <span id="endings-counter"></span>
      <div id="endings-pips"></div>

      <div id="workbench">
        <section id="ticket-section">
          <span id="ticket-id-badge"></span>
          <span id="ticket-priority-badge"></span>
          <span id="ticket-asset-badge"></span>
          <span id="ticket-sla-badge"></span>
          <h2 id="ticket-title"></h2>
          <p id="ticket-description"></p>
          <p id="ticket-meta"></p>
          <button id="inspect-button" type="button"></button>
          <span id="inspect-hint"></span>
        </section>

        <section id="audit-trail" hidden>
          <span id="audit-status-pill"></span>
          <ul id="audit-list"></ul>
        </section>

        <section id="controls">
          <span id="controls-lock-note"></span>
          <button id="close-button" type="button" disabled>
            <strong id="close-button-label"></strong>
            <small id="close-button-hint"></small>
          </button>
          <button id="call-button" type="button" disabled>
            <strong id="call-button-label"></strong>
            <small id="call-button-hint"></small>
          </button>
        </section>

        <section id="case-outcome" hidden>
          <img id="outcome-icon" alt="" />
          <div id="outcome-code"></div>
          <h2 id="outcome-title"></h2>
          <p id="outcome-body"></p>
          <p id="outcome-footnote"></p>
          <button id="next-case-button" type="button"></button>
          <button id="replay-case-button" type="button"></button>
        </section>
      </div>

      <section id="shift-dossier" hidden>
        <div id="dossier-numeral"></div>
        <div id="dossier-code"></div>
        <h2 id="dossier-title"></h2>
        <p id="dossier-subtitle"></p>
        <div id="dossier-clock"></div>
        <div id="dossier-system-tag"></div>
        <p id="dossier-summary"></p>
        <blockquote id="dossier-epilogue"></blockquote>
        <ul id="dossier-ledger"></ul>
        <div id="dossier-gallery"></div>
        <button id="shift-replay-button" type="button"></button>
        <button id="copy-report-button" type="button"></button>
      </section>

      <section id="cctv-panel">
        <h2 id="cctv-camera-id"></h2>
        <span id="cctv-status-pill"></span>
        <button id="cctv-zoom-button" type="button">
          <div id="cctv-sprite"></div>
        </button>
        <div id="cctv-location"></div>
        <p id="cctv-caption"></p>
      </section>

      <div id="phone-sprite"></div>
      <span id="phone-status"></span>
      <button id="phone-answer-button" type="button" hidden></button>
      <div id="voip-transcript" hidden>
        <div id="voip-transcript-head"></div>
        <ul id="voip-transcript-lines"></ul>
      </div>
      <div id="coffee-sprite"></div>
      <span id="coffee-status"></span>
    </div>
  `
}
