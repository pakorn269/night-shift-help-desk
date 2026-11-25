# Night Shift Help Desk

A short browser horror game for Kiroween 2026, Costume Contest. You are the only analyst on the night shift. A workstation turned itself on at 03:00. Your audit log says you closed the ticket at 03:07. It is still 03:00.

**Status:** ✅ First playable slice complete! Ready for manual testing and browser verification.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Visit http://localhost:5173/

# Run tests (50 tests, all passing)
npm test

# Build for production
npm run build
```

## Implementation Status

### ✅ Completed Features
- **Core gameplay**: Finite state machine with 5 phases, 5 transitions
- **Two decision paths**: Close (supernatural time jump) or Call (reality shift)
- **Replay functionality**: Complete cycle with state reset
- **Responsive design**: Mobile-first (360px+), tablet, desktop
- **Dark theme**: High-contrast, horror atmosphere
- **Accessibility**: ARIA labels, keyboard navigation, focus management
- **Comprehensive testing**: 50 tests including property-based tests

### 📊 Test Coverage
- **Unit tests**: 34 tests for state machine and renderer
- **Property tests**: 11 tests validating correctness properties
- **Integration tests**: 5 tests for complete game flows
- **All tests passing**: 100% success rate

### 🎮 Game Flow
1. View support ticket (workstation powered on at 03:00)
2. Inspect audit trail (reveals impossible 03:07 closure timestamp)
3. Make a decision:
   - **Close ticket**: Clock jumps to 03:07, duplicate entries appear
   - **Call requester**: Original entry vanishes, new ticket from your extension appears
4. Replay to explore the other path

## Project Structure

```
src/
├── main.ts              # Application entry point, initialization
├── state.ts             # State machine (GameState type, transitions)
├── renderer.ts          # DOM manipulation and UI updates
├── content.ts           # Ticket and ending copy text
├── accessibility.ts     # Focus management, keyboard handlers
├── style.css            # Dark theme, responsive styles
└── *.test.ts            # Test suites (50 tests total)
```

## Technical Stack

- **Vite**: Build tool and dev server
- **TypeScript**: Strict mode, discriminated unions
- **Vitest + jsdom**: Testing framework with DOM environment
- **fast-check**: Property-based testing library
- **Vanilla JS**: No UI framework, direct DOM manipulation

## Documentation

- [Design Document](.kiro/specs/first-playable-slice/design.md) - Architecture, component design, data models
- [Implementation Plan](.kiro/specs/first-playable-slice/tasks.md) - Task breakdown and requirements
- [Game Brief](docs/game-brief.md) - Original concept and scope
- [First Playable Checklist](docs/first-playable.md) - Feature requirements

## Next Steps

### Manual Testing Checklist
- [ ] Keyboard navigation (Tab, Enter, Space)
- [ ] Screen reader compatibility (Chrome + NVDA/JAWS)
- [ ] Responsive layout (360px, 768px, 1024px viewports)
- [ ] Both decision paths (close and call)
- [ ] Browser compatibility (Chrome primary, mobile Chrome)

### Future Enhancements
- Additional support tickets (cases 2-3)
- Deployment to static hosting
- Visual polish and animations
- Sound effects and ambient audio
