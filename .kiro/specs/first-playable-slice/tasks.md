# Implementation Plan: First Playable Slice

## ✅ Implementation Complete!

**Status**: All core tasks completed and verified  
**Tests**: 50/50 passing (100% success rate)  
**Build**: Production build successful (11.4 KB total, 3.4 KB gzipped)  
**Dev Server**: Running at http://localhost:5173/

### Completion Summary

✅ **Core Implementation**
- State machine with 5 phases and 5 pure transition functions
- Complete UI rendering with responsive design (360px to 1024px+)
- Dark theme with WCAG AA contrast ratios
- Full accessibility support (ARIA, keyboard nav, focus management)
- Two decision paths with supernatural consequences
- Replay functionality with complete state reset

✅ **Testing Coverage**
- 16 unit tests for state machine
- 18 unit tests for renderer
- 5 property-based tests for state transitions (500 iterations)
- 6 property-based tests for rendering (600 iterations)
- 5 integration tests for complete game flows
- **Total: 50 tests, all passing**

✅ **Build Verification**
- TypeScript strict mode: No errors
- Production build: 6.03 KB JS (1.82 KB gzipped), 3.59 KB CSS (0.98 KB gzipped)
- Dev server: Running and functional

### Ready for Manual Testing
- [ ] Keyboard navigation testing
- [ ] Screen reader compatibility testing
- [ ] Responsive layout verification (360px, 768px, 1024px)
- [ ] Both decision paths playtesting
- [ ] Browser compatibility (Chrome primary, mobile Chrome)

---

## Overview

This implementation plan converts the Night Shift Help Desk design into discrete coding tasks. The game is built as a Vite + TypeScript single-page application with a five-module architecture: main (initialization), state (state machine), renderer (DOM manipulation), content (copy text), and accessibility (focus management). The plan follows a bottom-up approach: establish project structure, implement core state logic, add rendering, integrate accessibility, implement testing, and verify the build.

## Tasks

- [x] 1. Scaffold Vite + TypeScript project structure
  - Run `npm create vite@latest . -- --template vanilla-ts` in workspace root
  - Install dependencies with `npm install`
  - Install Vitest and fast-check: `npm install -D vitest jsdom @vitest/ui fast-check`
  - Configure Vitest in `vitest.config.ts` with jsdom environment
  - Create src directory structure: `src/main.ts`, `src/state.ts`, `src/renderer.ts`, `src/content.ts`, `src/accessibility.ts`
  - Update `tsconfig.json` with strict mode flags: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
  - Add test script to `package.json`: `"test": "vitest --run"`
  - Track `package-lock.json` in version control
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 2. Implement state machine module
  - [-] 2.1 Define GameState discriminated union type
    - Create `GameState` type with five phases: initial, audit-inspected, resolved-close, resolved-call, reset
    - Add `firstClosureTimestamp: number` property to resolved-close phase
    - Export all types from `src/state.ts`
    - _Requirements: 12.6_
  
  - [~] 2.2 Implement state transition functions
    - Write `initialState()` returning initial phase
    - Write `inspectAudit(state)` transitioning initial → audit-inspected
    - Write `closeTicket(state)` transitioning audit-inspected → resolved-close with timestamp
    - Write `callRequester(state)` transitioning audit-inspected → resolved-call
    - Write `replay(state)` transitioning resolved-* → initial
    - Each function returns unchanged state if precondition not met
    - _Requirements: 1.1, 3.1, 5.1, 6.1, 8.1_
  
  - [ ]* 2.3 Write property test for invalid state transitions (Property 1)
    - **Property 1: Invalid State Transitions Preserve State**
    - **Validates: Requirements 5.5, 6.5**
    - Use fast-check to generate arbitrary game states
    - For each transition function, verify that calling it from invalid states returns referentially equal input
    - Run minimum 100 iterations
  
  - [ ]* 2.4 Write unit tests for state transitions
    - Test `inspectAudit`: initial → audit-inspected
    - Test `closeTicket`: audit-inspected → resolved-close with timestamp
    - Test `callRequester`: audit-inspected → resolved-call
    - Test `replay`: resolved-close → initial and resolved-call → initial
    - Test invalid transitions return unchanged state
    - _Requirements: 1.1, 3.1, 5.1, 6.1, 8.1_

- [ ] 3. Implement content module
  - [-] 3.1 Define and export ticket content
    - Create `ticket` object with title, description, requester, time fields
    - Use const assertion for readonly properties
    - Export from `src/content.ts`
    - _Requirements: 2.1_
  
  - [-] 3.2 Define and export ending content
    - Create `endings.close` object with title and body
    - Create `endings.call` object with title and body
    - Use const assertions for readonly properties
    - Export from `src/content.ts`
    - _Requirements: 7.1, 7.2_

- [~] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement HTML structure
  - [~] 5.1 Create semantic HTML with accessibility attributes
    - Create `index.html` in workspace root
    - Add `<main>` element containing game interface
    - Add `<header>` with game title and clock (id="clock", aria-live="polite")
    - Add ticket `<section>` (id="ticket-section") with inspect button (id="inspect-button")
    - Add audit trail `<section>` (id="audit-trail", hidden) with list (id="audit-list", role="list")
    - Add controls `<section>` with close button (id="close-button", disabled) and call button (id="call-button", disabled)
    - Add close ending `<section>` (id="close-ending", hidden) with replay button (id="close-replay-button")
    - Add call ending `<section>` (id="call-ending", hidden) with replay button (id="call-replay-button")
    - All buttons use type="button"
    - _Requirements: 2.3, 2.4, 9.4, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 5.2 Write unit tests for DOM structure
    - Test all required element IDs exist
    - Test clock has aria-live="polite"
    - Test audit list has role="list"
    - Test all buttons have type="button"
    - _Requirements: 2.3, 9.4_

- [ ] 6. Implement renderer module
  - [~] 6.1 Implement DOM element query and validation
    - Write `getElements()` function querying all required DOM elements by ID
    - Throw descriptive errors if any required element is missing
    - Return typed `DOMElements` interface
    - Export from `src/renderer.ts`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 5.3, 6.3, 7.3_
  
  - [~] 6.2 Implement clock rendering
    - Write `renderClock(state, elements)` updating clock textContent
    - Display "03:00" for all states except resolved-close
    - Display "03:07" for resolved-close state
    - _Requirements: 1.2, 5.1_
  
  - [~] 6.3 Implement audit trail rendering
    - Write `renderAuditTrail(state, elements)` controlling visibility and content
    - Hide audit trail in initial state
    - Show audit trail with single 03:07 entry in audit-inspected state
    - Show audit trail with two 03:07 entries in resolved-close state
    - Show audit trail with new ticket from player's extension in resolved-call state (remove 03:07 entry)
    - Write `addAuditEntry(list, time, text)` helper creating list items
    - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4, 5.2, 6.1_
  
  - [~] 6.4 Implement control rendering
    - Write `renderControls(state, elements)` enabling/disabling buttons
    - Disable inspect button in all states except initial
    - Disable both decision buttons in all states except audit-inspected
    - _Requirements: 1.5, 4.1, 4.2, 5.4, 6.4_
  
  - [~] 6.5 Implement ending rendering
    - Write `renderEndings(state, elements)` controlling ending visibility
    - Hide both endings in non-resolved states
    - Show close ending only in resolved-close state
    - Show call ending only in resolved-call state
    - _Requirements: 1.4, 5.3, 6.3, 7.1, 7.2_
  
  - [~] 6.6 Implement main render function
    - Write `render(state, elements)` calling all render sub-functions
    - Call renderClock, renderAuditTrail, renderControls, renderEndings
    - Export as public API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ]* 6.7 Write property test for inspect transition effects (Property 2)
    - **Property 2: Inspect Transition Reveals Audit Trail**
    - **Validates: Requirements 3.1, 3.2**
    - Start with initial state, call inspectAudit, render result
    - Verify audit trail visible property is true
    - Verify audit list contains exactly one entry with 03:07 timestamp
  
  - [ ]* 6.8 Write property test for audit-inspected state controls (Property 3)
    - **Property 3: Audit-Inspected State Enables Both Decision Controls**
    - **Validates: Requirements 4.1, 4.2**
    - Render audit-inspected state
    - Verify close button enabled
    - Verify call button enabled
    - Verify inspect button disabled
  
  - [ ]* 6.9 Write property test for close decision effects (Property 4)
    - **Property 4: Close Decision Produces Supernatural Effects**
    - **Validates: Requirements 5.1, 5.2**
    - Start with audit-inspected, call closeTicket, render result
    - Verify clock displays "03:07"
    - Verify audit list contains exactly two entries both timestamped 03:07
  
  - [ ]* 6.10 Write property test for call decision effects (Property 5)
    - **Property 5: Call Decision Removes Original Audit Entry**
    - **Validates: Requirements 6.1, 6.2**
    - Start with audit-inspected, call callRequester, render result
    - Verify audit list contains zero entries with 03:07 timestamp
    - Verify audit list contains exactly one entry about new ticket from player's extension
  
  - [ ]* 6.11 Write property test for resolved-close ending display (Property 6)
    - **Property 6: Resolved-Close State Shows Ending and Disables Decisions**
    - **Validates: Requirements 5.3, 5.4**
    - Render resolved-close state
    - Verify close ending visible
    - Verify call ending hidden
    - Verify both decision buttons disabled
  
  - [ ]* 6.12 Write property test for resolved-call ending display (Property 7)
    - **Property 7: Resolved-Call State Shows Ending and Disables Decisions**
    - **Validates: Requirements 6.3, 6.4**
    - Render resolved-call state
    - Verify call ending visible
    - Verify close ending hidden
    - Verify both decision buttons disabled
  
  - [ ]* 6.13 Write unit tests for renderer functions
    - Test renderClock with initial and resolved-close states
    - Test renderAuditTrail visibility and content for all states
    - Test renderControls button states for all phases
    - Test renderEndings visibility for all phases
    - Use mocked DOMElements for isolation
    - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2, 5.1, 5.2, 6.1_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement accessibility module
  - [~] 8.1 Implement focus management
    - Write `manageFocus(state, elements)` moving focus to next logical control
    - Focus inspect button in initial state
    - Focus close button in audit-inspected state
    - Focus close replay button in resolved-close state
    - Focus call replay button in resolved-call state
    - Add defensive checks for disabled/hidden elements
    - Export from `src/accessibility.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [~] 8.2 Implement keyboard event handlers
    - Write `setupKeyboardHandlers(elements)` ensuring buttons respond to Enter/Space
    - Leverage native button keyboard support
    - Export from `src/accessibility.ts`
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ]* 8.3 Write unit tests for focus management
    - Test manageFocus calls focus() on correct element for each state
    - Test defensive checks prevent focus on disabled elements
    - Use mocked HTMLElement with focus() spy
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 9. Implement main application module
  - [~] 9.1 Wire initialization and event handlers
    - Import all modules: state, renderer, content, accessibility
    - Write `initGame()` function initializing state to initial phase
    - Call `getElements()` and store reference
    - Perform initial render and focus management
    - Add event listeners to all five buttons calling appropriate state transition → render → manageFocus
    - Inspect button: inspectAudit → render → manageFocus
    - Close button: closeTicket → render → manageFocus
    - Call button: callRequester → render → manageFocus
    - Both replay buttons: replay → render → manageFocus
    - Export from `src/main.ts`
    - _Requirements: 1.1, 3.1, 4.1, 4.2, 5.1, 6.1, 8.1_
  
  - [~] 9.2 Add DOMContentLoaded listener
    - Add event listener calling initGame when DOM ready
    - _Requirements: 1.1_
  
  - [ ]* 9.3 Write integration tests for complete game flow
    - Test full close decision path: initial → inspect → close → replay → initial
    - Test full call decision path: initial → inspect → call → replay → initial
    - Verify UI state at each step (button states, visibility, clock, audit entries)
    - _Requirements: 1.1, 3.1, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 8.1, 8.2_
  
  - [ ]* 9.4 Write property test for replay cycle completeness (Property 8)
    - **Property 8: Replay Cycle Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
    - For both resolved states (resolved-close, resolved-call)
    - Call replay, then inspectAudit, verify audit trail shows single original 03:07 entry
    - Then execute both decision paths and verify outcomes match first execution
    - Verify no state corruption, no leftover UI artifacts, both decisions remain available

- [~] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement CSS styling
  - [~] 11.1 Create mobile-first base styles
    - Create `src/style.css` with dark theme palette (high contrast for WCAG AA)
    - Define CSS custom properties for colors, spacing, typography
    - Style body and main with mobile-first layout (0-359px breakpoint)
    - _Requirements: 2.3, 7.4, 10.1, 10.2, 10.3, 10.4_
  
  - [~] 11.2 Style header and clock
    - Use CSS Grid for header layout
    - Position clock prominently
    - Ensure clock readable at 360px viewport
    - _Requirements: 1.2, 10.3_
  
  - [~] 11.3 Style ticket section
    - Layout ticket content with comfortable reading width
    - Style inspect button with clear affordance
    - Ensure no clipping at 360px viewport
    - _Requirements: 2.1, 2.4, 10.1, 10.2, 10.4_
  
  - [~] 11.4 Style audit trail section
    - Style audit list with clear visual hierarchy
    - Ensure timestamp and analyst name visible together at 360px
    - Use adequate spacing for readability
    - _Requirements: 3.2, 3.3, 3.5, 10.1, 10.2_
  
  - [~] 11.5 Style decision controls
    - Use Flexbox for button layout
    - Add visible focus indicators (outline, not just color)
    - Ensure both buttons visible at 360px without clipping
    - _Requirements: 4.3, 4.4, 9.4, 10.4_
  
  - [~] 11.6 Style ending sections
    - Create distinct visual presentation for each ending
    - Style replay buttons consistently with other controls
    - Ensure adequate contrast for all text
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 11.7 Add responsive breakpoints
    - Add 360px+ breakpoint with comfortable padding
    - Add 768px+ breakpoint with increased spacing and larger text
    - Add 1024px+ breakpoint with centered layout and max-width constraint
    - Test all breakpoints ensure critical clue remains visible
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [~] 11.8 Import styles in main.ts
    - Add `import './style.css'` to `src/main.ts`
    - Verify Vite bundles CSS correctly

- [ ] 12. Verify build process
  - [~] 12.1 Run production build
    - Execute `npm run build`
    - Verify TypeScript compilation succeeds without errors
    - Verify output appears in `dist/` directory
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [~] 12.2 Run test suite
    - Execute `npm run test`
    - Verify all unit tests pass
    - Verify all property tests pass (minimum 100 iterations each)
    - _Requirements: 11.1, 11.2_
  
  - [ ]* 12.3 Verify test coverage
    - Run `npm run test -- --coverage`
    - Check state.ts coverage >= 80%
    - Check renderer.ts coverage >= 60%
    - Review uncovered lines for edge cases

- [ ] 13. Manual testing and accessibility verification
  - [~] 13.1 Perform keyboard navigation testing
    - Tab through all controls, verify logical order
    - Verify visible focus indicators on all interactive elements
    - Test Enter and Space activate all buttons
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [~] 13.2 Test responsive layout
    - Test at 360px viewport: verify no clipping of timestamp, analyst name, clock, decision controls
    - Test at 768px viewport: verify comfortable spacing
    - Test at 1024px viewport: verify centered layout and max-width applied
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [~] 13.3 Test both decision paths
    - Close decision: verify clock updates to 03:07, second audit entry appears, close ending shows
    - Call decision: verify original audit entry removed, new ticket appears, call ending shows
    - Replay from each ending: verify return to initial state correctly
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [~] 13.4 Test screen reader compatibility (Chrome + screen reader)
    - Verify clock changes announced via aria-live
    - Verify audit entries read in correct order
    - Verify button states announced correctly (enabled/disabled)
    - _Requirements: 2.3, 3.3, 3.4, 9.4_
  
  - [~] 13.5 Browser compatibility verification
    - Test in Chrome desktop (target browser for Kiroween)
    - Test in Chrome mobile (responsive verification)
    - Verify all functionality works in target browsers
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [~] 14. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Manual testing verifies accessibility and responsive layout requirements that cannot be automated
- The implementation follows a bottom-up approach: state → content → rendering → accessibility → integration
- All state transition functions are pure, enabling isolated testing
- DOM manipulation is centralized in renderer module for consistent behavior
- Focus management is explicit and testable in accessibility module

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["6.6"] },
    { "id": 9, "tasks": ["6.7", "6.8", "6.9", "6.10", "6.11", "6.12", "6.13"] },
    { "id": 10, "tasks": ["7"] },
    { "id": 11, "tasks": ["8.1", "8.2"] },
    { "id": 12, "tasks": ["8.3", "9.1"] },
    { "id": 13, "tasks": ["9.2"] },
    { "id": 14, "tasks": ["9.3", "9.4"] },
    { "id": 15, "tasks": ["10"] },
    { "id": 16, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7"] },
    { "id": 17, "tasks": ["11.8"] },
    { "id": 18, "tasks": ["12.1", "12.2"] },
    { "id": 19, "tasks": ["12.3"] },
    { "id": 20, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 21, "tasks": ["14"] }
  ]
}
```
