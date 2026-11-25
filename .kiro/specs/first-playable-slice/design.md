# Design Document

## Overview

The Night Shift Help Desk first playable slice is a browser-based horror game built as a single-page application using Vite, TypeScript, HTML, and CSS. The game presents a fictional help desk scenario where the player discovers an impossible audit log entry timestamped in the future, creating doubt about ordinary workplace software before introducing supernatural consequences.

The design centers on a **finite state machine** that manages game progression through five distinct states: initial, audit inspected, resolved by close decision, resolved by call decision, and reset. The state machine enforces strict transition rules to prevent duplicate actions and ensures each decision path executes exactly once per game session.

The architecture separates concerns into three primary layers:
- **State management layer**: Game state machine with transition logic
- **UI rendering layer**: DOM manipulation and presentation
- **Content layer**: Ticket text and ending copy separate from logic

This separation enables easy content updates without touching game logic, supports testability through pure state functions, and provides clear boundaries for future expansion to multiple cases.

**Key Design Decisions:**

1. **No UI framework**: Vanilla TypeScript with direct DOM manipulation keeps the bundle small and eliminates framework learning curves. The game's limited interactivity (5 controls total) doesn't justify framework overhead.

2. **State machine pattern**: Explicit state enumeration with typed transitions prevents impossible states and makes the game's decision tree verifiable. Each state transition is a pure function that can be tested independently.

3. **Accessibility-first DOM structure**: Semantic HTML with ARIA attributes supports keyboard navigation and screen readers without compromising the dark, understated aesthetic. Focus management is explicit and testable.

4. **Mobile-first responsive design**: Narrow viewport (360px) as the design baseline ensures the critical clue (03:07 timestamp with analyst name) remains visible on all devices. Desktop layouts are progressive enhancements.

## Architecture

### Component Overview

The application consists of five TypeScript modules with clear responsibilities:

```
src/
├── main.ts              # Application entry point, initialization
├── state.ts             # State machine types and transitions
├── renderer.ts          # DOM manipulation and UI updates
├── content.ts           # Ticket copy and ending text
└── accessibility.ts     # Focus management and keyboard navigation
```

### Data Flow

The data flow follows a unidirectional pattern:

1. **User interaction** (click or keyboard) triggers an event handler
2. **Event handler** calls a state transition function with current state
3. **State transition function** returns new state (pure function, no side effects)
4. **Renderer** receives new state and updates DOM to match
5. **Accessibility module** manages focus based on new UI state

```
User Input → Event Handler → State Transition → New State → Render → Update Focus
     ↑                                                                      ↓
     └──────────────────────── UI Ready for Next Input ───────────────────┘
```

**Why this pattern:**
- State transitions are pure functions, making them easy to test
- Rendering is separated from logic, enabling isolated testing of each
- Accessibility concerns are centralized rather than scattered
- Adding new states or transitions is straightforward

### State Machine Architecture

The game state machine uses a discriminated union type to represent five possible states:

```typescript
type GameState = 
  | { phase: 'initial' }
  | { phase: 'audit-inspected' }
  | { phase: 'resolved-close'; firstClosureTimestamp: number }
  | { phase: 'resolved-call' }
  | { phase: 'reset' }
```

Each state enables specific UI controls and permits specific transitions:

- **initial**: Only "inspect audit trail" is enabled
- **audit-inspected**: Both "close ticket" and "call requester" are enabled
- **resolved-close**: Only "replay" is enabled, stores closure timestamp to prevent re-execution
- **resolved-call**: Only "replay" is enabled
- **reset**: Briefly transitions to 'initial' to reset all state

Transitions are implemented as pure functions that return new state objects. The renderer subscribes to state changes and updates the DOM accordingly.

### Module Boundaries

**main.ts**
- Initializes the application on DOMContentLoaded
- Wires event listeners to DOM elements
- Holds the current game state in a closure
- Calls state transition functions and passes results to renderer

**state.ts**
- Exports the GameState discriminated union type
- Exports transition functions: inspectAudit(), closeTicket(), callRequester(), replay()
- Each transition function takes current state and returns new state
- Enforces one-action-per-session rule by checking phase before transitions

**renderer.ts**
- Exports render(state: GameState) function
- Updates DOM to match the provided state
- Shows/hides UI sections based on state.phase
- Updates clock display, audit trail, and endings
- Enables/disables controls based on state

**content.ts**
- Exports ticket text as typed objects
- Exports ending copy for both decision paths
- Separates copy from logic to enable easy iteration
- Uses TypeScript const assertions for type safety

**accessibility.ts**
- Exports manageFocus(state: GameState) function
- Sets focus to the next logical control after state transitions
- Implements keyboard event handlers for Enter/Space activation
- Ensures visible focus indicators are present

**Why these boundaries:**
- Each module has a single, clear responsibility
- Dependencies flow in one direction (main → state/renderer/accessibility → content)
- State logic is isolated and testable without DOM
- Rendering logic is isolated and testable with mocked state
- Content updates don't require touching any other module

## Components and Interfaces

### State Module Interface

```typescript
// state.ts

export type GameState = 
  | { phase: 'initial' }
  | { phase: 'audit-inspected' }
  | { phase: 'resolved-close'; firstClosureTimestamp: number }
  | { phase: 'resolved-call' }
  | { phase: 'reset' }

export function initialState(): GameState {
  return { phase: 'initial' }
}

export function inspectAudit(state: GameState): GameState {
  if (state.phase === 'initial') {
    return { phase: 'audit-inspected' }
  }
  return state
}

export function closeTicket(state: GameState): GameState {
  if (state.phase === 'audit-inspected') {
    return { phase: 'resolved-close', firstClosureTimestamp: Date.now() }
  }
  return state
}

export function callRequester(state: GameState): GameState {
  if (state.phase === 'audit-inspected') {
    return { phase: 'resolved-call' }
  }
  return state
}

export function replay(state: GameState): GameState {
  if (state.phase === 'resolved-close' || state.phase === 'resolved-call') {
    return { phase: 'initial' }
  }
  return state
}
```

**Design rationale:**
- Discriminated union ensures TypeScript narrows types in each branch
- Pure functions enable easy unit testing
- Transition guards prevent invalid state changes
- firstClosureTimestamp proves a closure happened (used for second audit entry display)

### Renderer Module Interface

```typescript
// renderer.ts

import type { GameState } from './state'

export interface DOMElements {
  clock: HTMLElement
  ticketSection: HTMLElement
  auditTrail: HTMLElement
  auditList: HTMLElement
  inspectButton: HTMLButtonElement
  closeButton: HTMLButtonElement
  callButton: HTMLButtonElement
  closeEnding: HTMLElement
  callEnding: HTMLElement
  closeReplayButton: HTMLButtonElement
  callReplayButton: HTMLButtonElement
}

export function getElements(): DOMElements {
  // Query and return all required DOM elements
  // Throws if any required element is missing
}

export function render(state: GameState, elements: DOMElements): void {
  renderClock(state, elements)
  renderAuditTrail(state, elements)
  renderControls(state, elements)
  renderEndings(state, elements)
}

function renderClock(state: GameState, elements: DOMElements): void {
  if (state.phase === 'resolved-close') {
    elements.clock.textContent = '03:07'
  } else {
    elements.clock.textContent = '03:00'
  }
}

function renderAuditTrail(state: GameState, elements: DOMElements): void {
  if (state.phase === 'initial') {
    elements.auditTrail.hidden = true
  } else {
    elements.auditTrail.hidden = false
    updateAuditEntries(state, elements)
  }
}

function updateAuditEntries(state: GameState, elements: DOMElements): void {
  // Clear existing entries
  elements.auditList.innerHTML = ''
  
  // Always show original 03:07 entry unless call decision removed it
  if (state.phase !== 'resolved-call') {
    addAuditEntry(elements.auditList, '03:07', 'Closed by [Analyst Name]')
  }
  
  // Add second closure entry for close decision
  if (state.phase === 'resolved-close') {
    addAuditEntry(elements.auditList, '03:07', 'Closed by [Analyst Name]')
  }
  
  // Add ticket from own extension for call decision
  if (state.phase === 'resolved-call') {
    addAuditEntry(elements.auditList, '03:00', 'New ticket from your extension')
  }
}

function renderControls(state: GameState, elements: DOMElements): void {
  // Enable/disable controls based on state
  elements.inspectButton.disabled = state.phase !== 'initial'
  elements.closeButton.disabled = state.phase !== 'audit-inspected'
  elements.callButton.disabled = state.phase !== 'audit-inspected'
}

function renderEndings(state: GameState, elements: DOMElements): void {
  elements.closeEnding.hidden = state.phase !== 'resolved-close'
  elements.callEnding.hidden = state.phase !== 'resolved-call'
}
```

**Design rationale:**
- getElements() centralizes DOM queries and validates all required elements exist
- render() is the single public interface, internal functions are implementation details
- Each render sub-function handles one concern (clock, audit, controls, endings)
- Disabled state prevents invalid interactions, reducing edge cases
- innerHTML clearing and rebuilding audit entries is safe for the small data set

### Content Module Interface

```typescript
// content.ts

export const ticket = {
  title: 'Workstation Powered On Unexpectedly',
  description: 'A workstation in Building 3, Floor 2, powered on by itself at 03:00. No scheduled tasks or remote access logs. Requester found it on when arriving for their night shift.',
  requester: 'J. Chen - Facilities',
  time: '03:00'
} as const

export const endings = {
  close: {
    title: 'Ticket Closed',
    body: 'The dashboard flickers. The clock now reads 03:07. You notice a second closure entry in the audit trail, timestamped 03:07, also under your name. You don't remember closing it twice.'
  },
  call: {
    title: 'Incoming Ticket',
    body: 'The original closure entry vanishes from the audit trail. The queue rings. A new ticket appears - from your own extension, submitted at 03:00. The description field is empty except for a timestamp: 03:07.'
  }
} as const
```

**Design rationale:**
- Const assertions make objects deeply readonly
- Typed exports enable autocomplete in renderer
- Single source of truth for all copy
- Easy to update copy without touching logic or rendering code

### Accessibility Module Interface

```typescript
// accessibility.ts

import type { GameState } from './state'
import type { DOMElements } from './renderer'

export function manageFocus(state: GameState, elements: DOMElements): void {
  switch (state.phase) {
    case 'initial':
      elements.inspectButton.focus()
      break
    case 'audit-inspected':
      elements.closeButton.focus()
      break
    case 'resolved-close':
      elements.closeReplayButton.focus()
      break
    case 'resolved-call':
      elements.callReplayButton.focus()
      break
  }
}

export function setupKeyboardHandlers(elements: DOMElements): void {
  // Add keyboard event listeners for Enter/Space on all buttons
  // Buttons have native keyboard support, but we ensure consistent behavior
}
```

**Design rationale:**
- Focus management is centralized rather than scattered across event handlers
- Each state transition moves focus to the next logical control
- Keyboard handlers are set up once at initialization
- Uses native button keyboard support (Enter/Space) rather than reimplementing

### Main Module Integration

```typescript
// main.ts

import { initialState, inspectAudit, closeTicket, callRequester, replay } from './state'
import { getElements, render } from './renderer'
import { manageFocus } from './accessibility'

function initGame() {
  let currentState = initialState()
  const elements = getElements()
  
  // Initial render
  render(currentState, elements)
  manageFocus(currentState, elements)
  
  // Wire event handlers
  elements.inspectButton.addEventListener('click', () => {
    currentState = inspectAudit(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.closeButton.addEventListener('click', () => {
    currentState = closeTicket(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.callButton.addEventListener('click', () => {
    currentState = callRequester(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.closeReplayButton.addEventListener('click', () => {
    currentState = replay(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
  
  elements.callReplayButton.addEventListener('click', () => {
    currentState = replay(currentState)
    render(currentState, elements)
    manageFocus(currentState, elements)
  })
}

document.addEventListener('DOMContentLoaded', initGame)
```

**Design rationale:**
- State is held in closure, not global variable
- Each event handler: transition state → render → manage focus
- Consistent pattern makes adding new interactions straightforward
- DOMContentLoaded ensures all elements exist before initialization

## Data Models

### Game State Model

The game state is represented as a discriminated union with five possible phases:

**initial**
- **Properties**: `{ phase: 'initial' }`
- **Meaning**: Game just started or was reset, audit trail not yet inspected
- **UI state**: Clock shows 03:00, audit trail hidden, only inspect button enabled
- **Valid transitions**: → audit-inspected

**audit-inspected**
- **Properties**: `{ phase: 'audit-inspected' }`
- **Meaning**: Player has revealed the audit trail showing the 03:07 entry
- **UI state**: Clock shows 03:00, audit trail visible with single 03:07 entry, both decision buttons enabled
- **Valid transitions**: → resolved-close, → resolved-call

**resolved-close**
- **Properties**: `{ phase: 'resolved-close'; firstClosureTimestamp: number }`
- **Meaning**: Player chose to close the ticket, trusting the existing audit entry
- **UI state**: Clock shows 03:07, audit trail shows two 03:07 closure entries, close ending visible, only replay button enabled
- **Valid transitions**: → initial (via replay)
- **Why timestamp**: Proves a closure occurred (used for rendering second entry and preventing duplicate actions)

**resolved-call**
- **Properties**: `{ phase: 'resolved-call' }`
- **Meaning**: Player chose to call the requester, challenging the existing audit entry
- **UI state**: Clock shows 03:00, audit trail shows new ticket from player's extension (03:07 entry removed), call ending visible, only replay button enabled
- **Valid transitions**: → initial (via replay)

**reset**
- **Properties**: Not explicitly represented; replay() returns to initial state directly
- **Meaning**: Transition state; exists conceptually but not in the type system
- **UI state**: N/A, immediately becomes initial state
- **Valid transitions**: N/A

### Content Data Model

```typescript
interface Ticket {
  readonly title: string
  readonly description: string
  readonly requester: string
  readonly time: string
}

interface Ending {
  readonly title: string
  readonly body: string
}

interface Content {
  readonly ticket: Ticket
  readonly endings: {
    readonly close: Ending
    readonly call: Ending
  }
}
```

All content fields are readonly. Content objects use const assertions to prevent accidental mutation.

### DOM Element References Model

```typescript
interface DOMElements {
  clock: HTMLElement
  ticketSection: HTMLElement
  auditTrail: HTMLElement
  auditList: HTMLElement
  inspectButton: HTMLButtonElement
  closeButton: HTMLButtonElement
  callButton: HTMLButtonElement
  closeEnding: HTMLElement
  callEnding: HTMLElement
  closeReplayButton: HTMLButtonElement
  callReplayButton: HTMLButtonElement
}
```

All DOM elements are queried once at initialization and stored in this structure. Missing elements throw errors during getElements() rather than failing silently during render.

### HTML Structure Model

The HTML document follows this semantic structure:

```html
<body>
  <main>
    <header>
      <h1>Night Shift Help Desk</h1>
      <div class="clock" id="clock" aria-live="polite">03:00</div>
    </header>
    
    <section class="ticket" id="ticket-section">
      <h2>Workstation Powered On Unexpectedly</h2>
      <p class="ticket-description">...</p>
      <p class="ticket-meta">Requester: J. Chen - Facilities</p>
      <button id="inspect-button" type="button">Inspect Audit Trail</button>
    </section>
    
    <section class="audit-trail" id="audit-trail" hidden>
      <h2>Audit Trail</h2>
      <ul id="audit-list" role="list">
        <!-- Entries inserted dynamically -->
      </ul>
    </section>
    
    <section class="controls" id="controls">
      <button id="close-button" type="button" disabled>Close as Resolved</button>
      <button id="call-button" type="button" disabled>Call Requester</button>
    </section>
    
    <section class="ending" id="close-ending" hidden>
      <h2>Ticket Closed</h2>
      <p>...</p>
      <button id="close-replay-button" type="button">Replay</button>
    </section>
    
    <section class="ending" id="call-ending" hidden>
      <h2>Incoming Ticket</h2>
      <p>...</p>
      <button id="call-replay-button" type="button">Replay</button>
    </section>
  </main>
</body>
```

**Key attributes:**
- `aria-live="polite"` on clock announces time changes to screen readers
- `role="list"` on audit list ensures assistive tech recognizes it as a list
- `hidden` attribute (not CSS display:none) for sections that should be removed from accessibility tree
- `disabled` attribute on buttons prevents keyboard activation and communicates unavailability to screen readers
- Semantic HTML (`<main>`, `<section>`, `<header>`) provides document structure for screen readers

### CSS Layout Model

The CSS follows a mobile-first approach with these breakpoints:

- **Base (0-359px)**: Single column, minimum padding
- **Small (360px+)**: Target viewport, comfortable padding, critical clue fully visible
- **Medium (768px+)**: Increased spacing, larger text
- **Large (1024px+)**: Centered layout with max-width constraint

**Layout approach:**
- CSS Grid for page-level layout (header, sections, footer spacing)
- Flexbox for button groups (controls section)
- No CSS frameworks or preprocessors
- Dark theme with high contrast for accessibility (WCAG AA minimum)

## Error Handling

### DOM Query Errors

**Problem**: Required DOM elements are missing from HTML  
**Strategy**: Fail fast during initialization

```typescript
export function getElements(): DOMElements {
  const clock = document.getElementById('clock')
  if (!clock) throw new Error('Required element #clock not found')
  
  const inspectButton = document.getElementById('inspect-button')
  if (!inspectButton) throw new Error('Required element #inspect-button not found')
  
  // ... validate all required elements
  
  return { clock, inspectButton, /* ... */ } as DOMElements
}
```

**Rationale**: Missing DOM elements indicate a development error, not a runtime condition. Throwing immediately prevents silent failures and surfaces the issue in development.

### Invalid State Transitions

**Problem**: Event handler called with unexpected current state  
**Strategy**: Return current state unchanged

```typescript
export function closeTicket(state: GameState): GameState {
  if (state.phase === 'audit-inspected') {
    return { phase: 'resolved-close', firstClosureTimestamp: Date.now() }
  }
  return state // No transition if precondition not met
}
```

**Rationale**: The UI should prevent invalid transitions by disabling controls. If an invalid transition is attempted (e.g., due to race condition or manual DOM manipulation), returning unchanged state is safe and maintains consistency. No error is thrown because the application can continue safely.

### TypeScript Strict Mode

The project uses TypeScript strict mode with these relevant flags:
- `strict: true` - Enables all strict type checking
- `noImplicitAny: true` - Disallows implicit any types
- `strictNullChecks: true` - Makes null/undefined explicit
- `noUnusedLocals: true` - Flags unused local variables
- `noUnusedParameters: true` - Flags unused function parameters

**Rationale**: Strict mode catches type errors at compile time rather than runtime. The state machine benefits particularly from discriminated union exhaustiveness checking.

### Focus Management Edge Cases

**Problem**: Focus target element is hidden or disabled  
**Strategy**: Check element state before setting focus

```typescript
export function manageFocus(state: GameState, elements: DOMElements): void {
  let target: HTMLElement | null = null
  
  switch (state.phase) {
    case 'initial':
      target = elements.inspectButton
      break
    case 'audit-inspected':
      target = elements.closeButton
      break
    // ... other cases
  }
  
  if (target && !target.disabled && !target.hidden) {
    target.focus()
  }
}
```

**Rationale**: While the renderer should ensure focus targets are always enabled and visible, defensive checks prevent focus loss if rendering and focus management get out of sync.

### Content Validation

**Problem**: Content objects are missing required fields  
**Strategy**: TypeScript const assertions at compile time

```typescript
export const ticket = {
  title: 'Workstation Powered On Unexpectedly',
  description: '...',
  requester: 'J. Chen - Facilities',
  time: '03:00'
} as const

// TypeScript enforces all fields are present and readonly
```

**Rationale**: Content validation happens at compile time, not runtime. Missing or misspelled fields are TypeScript errors during development.

## Testing Strategy

### Assessment: Property-Based Testing Applicability

This feature involves:
- **State machine logic**: Pure functions with clear input/output behavior
- **UI rendering**: DOM manipulation and layout
- **User interactions**: Event handling and focus management

**PBT Applicability Analysis:**

1. **State transitions** - Pure functions suitable for PBT ✓
2. **UI rendering** - DOM output, use snapshot tests ✗
3. **Focus management** - Side effects, use example-based tests ✗

**Decision**: Property-based testing IS appropriate for state machine logic, but NOT appropriate for UI rendering or focus management. Use a dual testing approach:
- **Property tests** for state transition logic
- **Unit tests** for rendering and integration
- **Manual testing** for accessibility and viewport compliance

### Testing Approach

**Unit Tests (Example-Based)**

Target coverage:
- State transition functions with specific scenarios
- Renderer functions with mocked DOM elements
- Integration between state and rendering
- Edge cases: disabled buttons, hidden sections, duplicate actions

Example unit tests:
```typescript
// State transitions
test('inspectAudit: initial → audit-inspected', () => {
  const result = inspectAudit({ phase: 'initial' })
  expect(result.phase).toBe('audit-inspected')
})

test('inspectAudit: returns unchanged state when not in initial phase', () => {
  const result = inspectAudit({ phase: 'resolved-close', firstClosureTimestamp: 123 })
  expect(result).toEqual({ phase: 'resolved-close', firstClosureTimestamp: 123 })
})

test('closeTicket: prevents duplicate close actions', () => {
  const resolved = { phase: 'resolved-close' as const, firstClosureTimestamp: 123 }
  const result = closeTicket(resolved)
  expect(result).toBe(resolved) // Returns same reference when no transition
})

// Rendering
test('renderClock: displays 03:07 in resolved-close state', () => {
  const mockClock = { textContent: '' } as HTMLElement
  const state = { phase: 'resolved-close' as const, firstClosureTimestamp: 123 }
  renderClock(state, { clock: mockClock } as DOMElements)
  expect(mockClock.textContent).toBe('03:07')
})

test('renderControls: disables both decision buttons in initial state', () => {
  const mockClose = { disabled: false } as HTMLButtonElement
  const mockCall = { disabled: false } as HTMLButtonElement
  const elements = { closeButton: mockClose, callButton: mockCall } as DOMElements
  renderControls({ phase: 'initial' }, elements)
  expect(mockClose.disabled).toBe(true)
  expect(mockCall.disabled).toBe(true)
})
```

**Property-Based Tests**

Property testing library: **fast-check** (TypeScript-native, well-maintained, commonly used for browser applications)

Each property test runs minimum 100 iterations with randomized inputs.

Properties to test:
1. State transition idempotence
2. Invalid transitions preserve state
3. Replay reachability

Test configuration:
```typescript
import fc from 'fast-check'

// Generator for valid game states
const gameStateArb = fc.oneof(
  fc.constant({ phase: 'initial' as const }),
  fc.constant({ phase: 'audit-inspected' as const }),
  fc.record({ phase: fc.constant('resolved-close' as const), firstClosureTimestamp: fc.integer() }),
  fc.constant({ phase: 'resolved-call' as const })
)
```

**Manual Testing Checklist**

Accessibility:
- [ ] Tab through all controls in logical order
- [ ] Visible focus indicators on all interactive elements
- [ ] Enter and Space activate buttons
- [ ] Screen reader announces clock changes (aria-live="polite")
- [ ] Screen reader reads audit entries in order

Responsive layout:
- [ ] 360px viewport: all text visible, no clipping of timestamp/name
- [ ] 768px viewport: comfortable spacing
- [ ] 1024px viewport: centered layout, max-width applied

Both decision paths:
- [ ] Close decision: clock updates, second audit entry appears, close ending shows
- [ ] Call decision: original audit entry removed, new ticket appears, call ending shows
- [ ] Replay from each ending returns to initial state correctly

Browser compatibility:
- [ ] Chrome (target browser for Kiroween submission)
- [ ] Test on mobile Chrome (responsive verification)

**Test Framework Setup**

Use Vitest (Vite-native test runner) with these configurations:
- Test files colocated with source: `src/**/*.test.ts`
- DOM environment: `jsdom` (for unit tests that touch DOM)
- Coverage target: 80% for state.ts, 60% for renderer.ts (UI harder to cover comprehensively)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/main.ts']
    }
  }
})
```

**Why not test everything with properties?**

UI rendering and focus management involve side effects (DOM manipulation) and don't have universal properties that hold across all inputs. Example-based tests with specific scenarios are more appropriate and easier to write for these concerns.

**Integration with CI**

The build verification should include:
- `npm run test` - Run all unit and property tests
- `npm run build` - Verify production build succeeds
- Exit code 0 required for both steps

Future CI setup (not in first playable) will add:
- Automated deployment to static hosting
- Visual regression tests with Percy or Playwright
- Lighthouse audit for accessibility score



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invalid State Transitions Preserve State

*For any* game state and any transition function, if the transition's precondition is not met, the returned state SHALL be referentially equal to the input state.

**Validates: Requirements 5.5, 6.5**

**Rationale**: The state machine must be safe against invalid transitions. When a transition is attempted from an inappropriate state (e.g., calling closeTicket from initial state), the system should return the unchanged state rather than corrupting state or throwing an error. This property ensures defensive transition guards work correctly.

### Property 2: Inspect Transition Reveals Audit Trail

*For any* game in the initial state, calling inspectAudit SHALL transition to audit-inspected state, and rendering that state SHALL make the audit trail visible with exactly one entry showing timestamp 03:07 and the analyst name.

**Validates: Requirements 3.1, 3.2**

**Rationale**: The inspect action is the first critical interaction. This property ensures the audit trail revelation works consistently and displays the correct initial clue (the impossible future timestamp) that drives the entire game's tension.

### Property 3: Audit-Inspected State Enables Both Decision Controls

*For any* game in the audit-inspected state, rendering that state SHALL result in both the close button and call button being enabled, while the inspect button remains disabled.

**Validates: Requirements 4.1, 4.2**

**Rationale**: After inspecting the audit trail, the player must be able to make either decision. This property ensures both paths are available and the inspect button doesn't allow repeated inspection.

### Property 4: Close Decision Produces Supernatural Effects

*For any* game in the audit-inspected state, calling closeTicket SHALL transition to resolved-close state, and rendering that state SHALL display the clock as 03:07 AND display exactly two audit entries both timestamped 03:07 under the analyst name.

**Validates: Requirements 5.1, 5.2**

**Rationale**: The close decision's supernatural consequence is the core of one ending path. This property ensures the time jump and duplicated audit entry appear correctly, creating the intended unsettling effect.

### Property 5: Call Decision Removes Original Audit Entry

*For any* game in the audit-inspected state, calling callRequester SHALL transition to resolved-call state, and rendering that state SHALL display an audit trail with zero entries containing timestamp 03:07 AND exactly one entry showing a new ticket from the player's extension.

**Validates: Requirements 6.1, 6.2**

**Rationale**: The call decision's consequence involves the impossible audit entry vanishing and being replaced by an equally impossible new ticket. This property ensures the original entry is removed (not hidden) and the new entry appears correctly.

### Property 6: Resolved-Close State Shows Ending and Disables Decisions

*For any* game in the resolved-close state, rendering that state SHALL make the close ending visible, hide the call ending, and disable both decision buttons (close and call).

**Validates: Requirements 5.3, 5.4**

**Rationale**: After making the close decision, the player should see the corresponding ending and be prevented from making another decision until replay. This property ensures the UI reflects the terminal state correctly.

### Property 7: Resolved-Call State Shows Ending and Disables Decisions

*For any* game in the resolved-call state, rendering that state SHALL make the call ending visible, hide the close ending, and disable both decision buttons (close and call).

**Validates: Requirements 6.3, 6.4**

**Rationale**: After making the call decision, the player should see the corresponding ending and be prevented from making another decision until replay. This property ensures the UI reflects the terminal state correctly and shows the distinct ending.

### Property 8: Replay Cycle Completeness

*For any* game in a resolved state (resolved-close or resolved-call), calling replay SHALL transition to initial state, and subsequently executing the sequence [inspectAudit, then either closeTicket or callRequester] SHALL produce the same outcomes as the first execution: audit trail with one original entry after inspect, then the appropriate ending state with correct UI changes.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

**Rationale**: Replay must fully reset all game state to allow players to experience the other decision path. This comprehensive property ensures the entire game cycle can be repeated without state corruption, leftover UI artifacts, or disabled transitions. It validates that both decision paths remain available after replay.

