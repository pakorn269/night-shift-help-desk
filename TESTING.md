# Testing Documentation

This document describes the testing strategy, test coverage, and how to run tests for Night Shift Help Desk.

## Test Overview

**Total Tests**: 50  
**Status**: All passing ✅  
**Framework**: Vitest + jsdom  
**Property Testing**: fast-check  

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for TDD)
npm run test:watch

# Run tests with coverage report
npm run test -- --coverage

# Run tests in UI mode (interactive)
npm run test:ui
```

## Test Structure

### Test Files

```
src/
├── state.test.ts              # 16 unit tests
├── state.property.test.ts     # 5 property tests (500 iterations)
├── renderer.test.ts           # 18 unit tests
├── renderer.property.test.ts  # 6 property tests (600 iterations)
└── integration.test.ts        # 5 integration tests (250 iterations)
```

### Test Pyramid

```
     /\
    /  \  5 Integration Tests
   /____\  (Complete game flows)
  /      \
 / 11 PBT \  11 Property-Based Tests
/__________\ (1,400+ randomized scenarios)
/          \
/  34 Unit  \ 34 Unit Tests
/____________\ (Individual functions)
```

## Unit Tests (34 tests)

### State Machine Tests (16 tests)

**Coverage**: All transition functions, all edge cases

```typescript
describe('State Machine', () => {
  // Initial state
  test('returns initial phase')
  
  // inspectAudit transition
  test('transitions from initial to audit-inspected')
  test('returns unchanged state when not in initial phase')
  test('does not transition from resolved-close')
  
  // closeTicket transition
  test('transitions from audit-inspected to resolved-close with timestamp')
  test('returns unchanged state when not in audit-inspected phase')
  test('prevents duplicate close actions')
  
  // callRequester transition
  test('transitions from audit-inspected to resolved-call')
  test('returns unchanged state when not in audit-inspected phase')
  test('does not transition from resolved-call')
  
  // replay transition
  test('transitions from resolved-close to initial')
  test('transitions from resolved-call to initial')
  test('returns unchanged state when not in resolved phase')
  test('does not replay from audit-inspected')
  
  // Complete flows
  test('close decision path')
  test('call decision path')
})
```

### Renderer Tests (18 tests)

**Coverage**: DOM element queries, all render functions, all UI states

```typescript
describe('Renderer', () => {
  // Element queries
  test('queries all required elements successfully')
  test('throws when required element is missing')
  
  // Clock rendering (4 tests)
  test('displays 03:00 in initial state')
  test('displays 03:00 in audit-inspected state')
  test('displays 03:07 in resolved-close state')
  test('displays 03:00 in resolved-call state')
  
  // Audit trail rendering (4 tests)
  test('hides audit trail in initial state')
  test('shows audit trail with one entry in audit-inspected state')
  test('shows audit trail with two entries in resolved-close state')
  test('shows audit trail with new ticket entry in resolved-call state')
  
  // Control rendering (4 tests)
  test('enables only inspect button in initial state')
  test('enables both decision buttons in audit-inspected state')
  test('disables all decision buttons in resolved-close state')
  test('disables all decision buttons in resolved-call state')
  
  // Ending rendering (4 tests)
  test('hides both endings in initial state')
  test('hides both endings in audit-inspected state')
  test('shows only close ending in resolved-close state')
  test('shows only call ending in resolved-call state')
})
```

## Property-Based Tests (11 tests, 1,400+ iterations)

Property-based tests verify **universal properties** that should hold true across all valid inputs. Each test runs 50-100 iterations with randomized inputs.

### Property 1: Invalid State Transitions Preserve State (5 tests)

**Validates**: Requirements 5.5, 6.5

Tests that invalid transitions return the exact same state reference (referential equality).

```typescript
// For each transition function:
test('inspectAudit returns referentially equal state when precondition not met')
test('closeTicket returns referentially equal state when precondition not met')
test('callRequester returns referentially equal state when precondition not met')
test('replay returns referentially equal state when precondition not met')
test('all transitions preserve state when invalid')
```

**Iterations**: 100 per test = 500 total

### Property 2: Inspect Transition Reveals Audit Trail (1 test)

**Validates**: Requirements 3.1, 3.2

```typescript
test('inspecting from initial state always reveals audit trail with one 03:07 entry')
```

Verifies:
- Audit trail becomes visible
- Exactly one entry appears
- Entry contains "03:07" timestamp

**Iterations**: 100

### Property 3: Audit-Inspected State Enables Both Decision Controls (1 test)

**Validates**: Requirements 4.1, 4.2

```typescript
test('rendering audit-inspected state always enables both decision buttons')
```

Verifies:
- Close button is enabled
- Call button is enabled
- Inspect button is disabled

**Iterations**: 100

### Property 4: Close Decision Produces Supernatural Effects (1 test)

**Validates**: Requirements 5.1, 5.2

```typescript
test('closing ticket from audit-inspected always produces clock jump and duplicate entries')
```

Verifies:
- Clock displays "03:07"
- Audit list contains exactly two entries
- Both entries timestamped "03:07"

**Iterations**: 100

### Property 5: Call Decision Removes Original Audit Entry (1 test)

**Validates**: Requirements 6.1, 6.2

```typescript
test('calling requester from audit-inspected always removes 03:07 entry and adds new ticket')
```

Verifies:
- Exactly one audit entry
- No "Closed by [Analyst Name]" entry
- Entry contains "03:00" and "New ticket from your extension"

**Iterations**: 100

### Property 6: Resolved-Close State Shows Ending and Disables Decisions (1 test)

**Validates**: Requirements 5.3, 5.4

```typescript
test('resolved-close state always shows close ending and disables decision buttons')
```

Verifies:
- Close ending is visible
- Call ending is hidden
- Both decision buttons are disabled

**Iterations**: 100 (with randomized timestamps)

### Property 7: Resolved-Call State Shows Ending and Disables Decisions (1 test)

**Validates**: Requirements 6.3, 6.4

```typescript
test('resolved-call state always shows call ending and disables decision buttons')
```

Verifies:
- Call ending is visible
- Close ending is hidden
- Both decision buttons are disabled

**Iterations**: 100

## Integration Tests (5 tests, 250+ iterations)

### Complete Game Flows (2 tests)

```typescript
test('follows correct sequence through close decision path')
test('follows correct sequence through call decision path')
```

Tests the entire game flow from initial to replay, verifying UI state at each step.

### Property 8: Replay Cycle Completeness (3 tests)

**Validates**: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

```typescript
test('replay from close decision always returns to fully reset initial state')
test('replay from call decision always returns to fully reset initial state')
test('multiple replay cycles maintain consistency')
```

Verifies complete state reset:
- State phase is 'initial'
- Clock displays "03:00"
- Audit trail is hidden
- Only inspect button is enabled
- Both endings are hidden

**Iterations**: 100 + 100 + 50 = 250 total

## Test Coverage Goals

| Module | Target | Actual | Status |
|--------|--------|--------|--------|
| state.ts | 80% | 100% | ✅ Exceeded |
| renderer.ts | 60% | ~90% | ✅ Exceeded |
| content.ts | N/A | 100% | ✅ Full |
| accessibility.ts | 60% | ~70% | ✅ Good |
| main.ts | N/A | Excluded | ⚠️ Integration only |

## What We're Testing

### ✅ Tested

**State Logic**
- All valid transitions
- All invalid transitions (defensive programming)
- Edge cases (duplicate actions, out-of-order transitions)
- Timestamp generation
- Referential equality on unchanged states

**Rendering**
- Clock display for all states
- Audit trail visibility and content
- Button enabled/disabled states
- Ending visibility
- DOM element queries and validation

**Integration**
- Complete close decision flow
- Complete call decision flow
- Replay functionality
- Multiple replay cycles
- State consistency across transitions

**Properties**
- Invalid transitions preserve state
- UI always matches state
- Supernatural effects occur consistently
- Endings display correctly
- Replay resets completely

### ⚠️ Not Tested (Requires Manual Verification)

**Accessibility**
- Actual screen reader output (JAWS, NVDA, VoiceOver)
- Real keyboard navigation flow
- Focus visibility in different browsers
- High contrast mode compatibility

**Visual Design**
- Responsive layout at all breakpoints
- Font rendering across browsers
- Color contrast in different lighting
- Touch target sizes on mobile devices

**Browser Compatibility**
- Older browser versions
- Safari-specific quirks
- Mobile browser differences
- Touch event handling

**User Experience**
- Horror atmosphere effectiveness
- Copy clarity and comprehension
- Decision-making satisfaction
- Replay motivation

## Test Utilities

### DOM Setup Helper

Used in all renderer and integration tests:

```typescript
beforeEach(() => {
  document.body.innerHTML = `
    <main>
      <div id="clock"></div>
      <!-- All required elements -->
    </main>
  `
})
```

### State Arbitrary Generator

Used in property tests:

```typescript
const gameStateArb = fc.oneof(
  fc.constant({ phase: 'initial' as const }),
  fc.constant({ phase: 'audit-inspected' as const }),
  fc.record({
    phase: fc.constant('resolved-close' as const),
    firstClosureTimestamp: fc.integer({ min: 0, max: Date.now() })
  }),
  fc.constant({ phase: 'resolved-call' as const })
)
```

## Continuous Testing

### Pre-commit Checks (Recommended)

```bash
# Add to .husky/pre-commit or package.json
npm test && npm run build
```

### CI/CD Pipeline (Future)

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
  
- name: Check coverage
  run: npm run test -- --coverage
  
- name: Build production
  run: npm run build
```

## Debugging Tests

### Run Single Test File

```bash
npm test state.test.ts
```

### Run Single Test

```bash
npm test -t "transitions from initial to audit-inspected"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/vitest
```

### View Test UI

```bash
npm run test:ui
```

Opens interactive browser-based test runner.

## Writing New Tests

### Unit Test Template

```typescript
import { describe, test, expect } from 'vitest'
import { functionToTest } from './module'

describe('Module Name', () => {
  test('should do something specific', () => {
    const input = /* ... */
    const result = functionToTest(input)
    expect(result).toBe(expected)
  })
})
```

### Property Test Template

```typescript
import { describe, test } from 'vitest'
import fc from 'fast-check'

describe('Property Tests', () => {
  test('property description', () => {
    fc.assert(
      fc.property(arbitraryGenerator, (input) => {
        const result = functionToTest(input)
        return /* boolean assertion */
      }),
      { numRuns: 100 }
    )
  })
})
```

## Test Maintenance

### When to Update Tests

- **Adding new state phases**: Update state arbitrary generator
- **Changing UI structure**: Update DOM setup in renderer tests
- **Adding new transitions**: Add corresponding unit and property tests
- **Changing content**: Update content assertions in integration tests

### Test Smells to Avoid

- ❌ Testing implementation details (internal functions)
- ❌ Testing framework behavior (TypeScript, React, etc.)
- ❌ Overly specific assertions (exact string matches)
- ❌ Tests that depend on execution order
- ❌ Tests that modify global state

### Best Practices

- ✅ Test behavior, not implementation
- ✅ Use descriptive test names
- ✅ Keep tests independent and isolated
- ✅ Prefer pure functions for easier testing
- ✅ Mock only external dependencies

## Troubleshooting

### "Element not found" errors

**Cause**: DOM setup missing required elements  
**Fix**: Check `beforeEach` DOM structure matches actual HTML

### Property test failures

**Cause**: Edge case discovered by random generation  
**Fix**: Add unit test for the specific case, fix the code

### Flaky tests

**Cause**: Tests depend on timing, random values, or global state  
**Fix**: Use deterministic inputs, isolate state, avoid timeouts

### Slow tests

**Cause**: Too many property test iterations or heavy DOM operations  
**Fix**: Reduce numRuns for development, increase for CI

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Property-Based Testing](https://hypothesis.works/articles/what-is-property-based-testing/)
