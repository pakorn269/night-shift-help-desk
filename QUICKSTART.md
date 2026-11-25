# Quick Start Guide

Get Night Shift Help Desk running in under 5 minutes.

## Prerequisites

- **Node.js**: v18+ (or any version that supports ES2020)
- **npm**: v8+ (comes with Node.js)
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

## Installation

```bash
# Clone or navigate to the project
cd night-shift-help-desk

# Install dependencies
npm install
```

**Installation time**: ~30 seconds

## Running the Game

### Development Server

```bash
npm run dev
```

**Output:**
```
  VITE v8.3.8  ready in 204 ms
  ➜  Local:   http://localhost:5173/
```

**Open in browser**: http://localhost:5173/

**Features:**
- Hot module replacement (instant updates)
- Source maps for debugging
- Fast refresh on file changes

### Production Build

```bash
npm run build
```

**Output:**
```
dist/
├── index.html          1.82 kB
├── assets/
│   ├── index-*.css     3.59 kB
│   └── index-*.js      6.03 kB
```

**Preview production build:**
```bash
npm run preview
```

## Running Tests

### All Tests

```bash
npm test
```

**Output:**
```
✓ src/state.test.ts (16 tests) 4ms
✓ src/state.property.test.ts (5 tests) 8ms
✓ src/renderer.test.ts (18 tests) 41ms
✓ src/renderer.property.test.ts (6 tests) 74ms
✓ src/integration.test.ts (5 tests) 51ms

Test Files  5 passed (5)
Tests  50 passed (50)
```

**Test time**: ~2 seconds

### Watch Mode (for TDD)

```bash
npm run test:watch
```

Automatically re-runs tests when files change.

## Project Structure

```
night-shift-help-desk/
├── src/                    # Source code
│   ├── main.ts            # Entry point
│   ├── state.ts           # State machine
│   ├── renderer.ts        # UI rendering
│   ├── content.ts         # Game copy
│   ├── accessibility.ts   # Focus/keyboard
│   ├── style.css          # Styles
│   └── *.test.ts          # Test files
├── index.html             # HTML template
├── dist/                  # Production build (generated)
├── docs/                  # Game design docs
├── .kiro/                 # Kiro specs
└── package.json           # Dependencies & scripts
```

## Playing the Game

### Game Flow

1. **Read the ticket** about a workstation that powered on by itself at 03:00
2. **Inspect Audit Trail** button reveals the impossible clue
3. **Notice the timestamp**: Someone closed this ticket at 03:07... but it's still 03:00
4. **Make a decision**:
   - **Close as Resolved**: Trust the audit log
   - **Call Requester**: Challenge the impossible timestamp
5. **Experience consequences** (each path has supernatural effects)
6. **Replay** to explore the other path

### Keyboard Controls

- **Tab**: Navigate between buttons
- **Enter/Space**: Activate focused button
- **Shift+Tab**: Navigate backwards

### Decision Paths

**Close Decision:**
- Clock jumps to 03:07
- Second closure entry appears (also at 03:07, also your name)
- You don't remember closing it twice...

**Call Decision:**
- Original audit entry vanishes
- New ticket appears from your own extension
- Description is empty except for timestamp: 03:07

## Development Workflow

### Making Changes

1. **Edit source files** in `src/`
2. **See changes instantly** in browser (HMR)
3. **Run tests** to verify behavior
4. **Build production** when ready

### Common Tasks

**Add new content:**
```typescript
// src/content.ts
export const ticket = {
  title: 'New Title',
  description: 'New description',
  // ...
} as const
```

**Add new state:**
```typescript
// src/state.ts
export type GameState =
  | { phase: 'initial' }
  | { phase: 'new-phase' }  // Add here
  | // ...
```

**Update styles:**
```css
/* src/style.css */
.ticket {
  /* Mobile-first styles */
}

@media (min-width: 768px) {
  .ticket {
    /* Tablet styles */
  }
}
```

## Troubleshooting

### Port 5173 already in use

**Solution:**
```bash
# Kill the process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill
```

Or change the port:
```bash
npm run dev -- --port 3000
```

### Tests failing

**Check:**
1. Run `npm install` again
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check Node version: `node --version` (should be v18+)

### Build errors

**TypeScript errors:**
```bash
# Check types without building
npx tsc --noEmit
```

**Clear cache:**
```bash
rm -rf dist node_modules/.vite
npm run build
```

### Browser not updating

**Hard refresh:**
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

## Configuration Files

### package.json

Defines dependencies and scripts:
- `dev`: Start development server
- `build`: Production build
- `test`: Run test suite
- `preview`: Preview production build

### tsconfig.json

TypeScript configuration:
- Strict mode enabled
- ES2020 target
- DOM types included

### vitest.config.ts

Test configuration:
- jsdom environment (browser simulation)
- Global test APIs
- Coverage settings

### index.html

HTML template with:
- Semantic structure
- Accessibility attributes
- Vite script injection point

## Next Steps

### Manual Testing

- [ ] Test keyboard navigation
- [ ] Test on mobile device (or DevTools mobile mode)
- [ ] Test with screen reader
- [ ] Verify both decision paths
- [ ] Check responsive breakpoints (360px, 768px, 1024px)

### Customization

- **Change theme colors**: Edit CSS custom properties in `style.css`
- **Add new tickets**: Create new content objects in `content.ts`
- **Add animations**: Add CSS transitions in `style.css`
- **Add sound effects**: Import and play audio in event handlers

### Deployment

**Static Hosting Options:**
- Netlify: Drag & drop `dist/` folder
- Vercel: Connect GitHub repo
- GitHub Pages: Push `dist/` to gh-pages branch
- Cloudflare Pages: Connect GitHub repo

**Example Netlify Deploy:**
```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

## Learning Resources

### Understanding the Code

1. **Start with**: `src/main.ts` (entry point)
2. **Then read**: `src/state.ts` (game logic)
3. **Then read**: `src/renderer.ts` (UI updates)
4. **For details**: See `IMPLEMENTATION.md`

### Key Concepts

**State Machine Pattern:**
- State transitions are pure functions
- Invalid transitions return unchanged state
- TypeScript enforces valid states at compile time

**Unidirectional Data Flow:**
```
User Input → State Transition → Render → Focus Management
```

**Discriminated Unions:**
```typescript
type GameState = 
  | { phase: 'initial' }
  | { phase: 'audit-inspected' }
  // TypeScript narrows type based on phase
```

## Support

### Documentation

- `README.md` - Project overview
- `IMPLEMENTATION.md` - Technical architecture
- `TESTING.md` - Test strategy and coverage
- `.kiro/specs/` - Design documents and task breakdown

### File an Issue

Found a bug? Have a question?

1. Check existing documentation
2. Search for similar issues
3. Create new issue with:
   - What you expected
   - What actually happened
   - Steps to reproduce
   - Your environment (OS, browser, Node version)

## Tips & Tricks

### Faster Development

**Use watch mode for tests:**
```bash
npm run test:watch
```

**Use test UI for debugging:**
```bash
npm run test:ui
```

**Check specific test file:**
```bash
npm test state.test.ts
```

### Debugging

**Browser DevTools:**
- `F12` to open DevTools
- Use Sources tab to set breakpoints
- Use Console to inspect state

**VS Code Debugging:**
1. Install "Vitest" extension
2. Click green play button next to tests
3. Set breakpoints in test files

### Performance

**Bundle analysis:**
```bash
npm run build -- --mode analyze
```

**Lighthouse audit:**
1. Open DevTools
2. Go to Lighthouse tab
3. Run audit

## Quick Reference

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:ui` | Interactive test UI |

### File Extensions

| Extension | Purpose |
|-----------|---------|
| `.ts` | TypeScript source |
| `.test.ts` | Test file |
| `.css` | Stylesheet |
| `.html` | HTML template |
| `.md` | Documentation |

### Key Directories

| Directory | Contents |
|-----------|----------|
| `src/` | Source code |
| `dist/` | Production build |
| `node_modules/` | Dependencies |
| `docs/` | Game design docs |
| `.kiro/` | Kiro specifications |

## Success Checklist

After running this quickstart, you should have:

- ✅ All dependencies installed
- ✅ Dev server running at http://localhost:5173/
- ✅ All 50 tests passing
- ✅ Production build created in `dist/`
- ✅ Game playable in browser
- ✅ Both decision paths working

**Time to first playthrough**: ~5 minutes

Happy coding! 🎮👻
