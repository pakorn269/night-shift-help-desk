# First playable checklist

## Build

- [ ] Scaffold a static Vite + Vanilla TypeScript app using npm. Track the lockfile. No UI framework until there is a concrete reason.
- [ ] Keep ticket content separate from the small state machine. Initial state, audit inspected, resolved by choice A or B, reset.
- [ ] Keep assets local and import paths case-consistent. Use text and CSS for the first playable version.

## Accept

- [ ] Initial view shows the report and 03:00 but neither ending.
- [ ] Inspecting the audit trail makes 03:07 and the player’s name discoverable without relying on audio/color or requiring a hover.
- [ ] Both decisions produce visibly different outcomes, and neither fires twice.
- [ ] Replay resets audit visibility, decision state, copy, and clock.
- [ ] Test keyboard navigation, visible focus, and 360px-wide layout; no clipping of the critical clue.
- [ ] Test both endings and replay in Chrome. Add small automated tests for state transitions if the chosen setup supports them without extra infrastructure.
- [ ] Confirm `npm run build` succeeds. Record exact run commands, checks actually performed, and any unverified item. The expected build output is `dist/`.

## Later, not part of this build

Run the locked build on Linux CI before static deployment; verify the public demo from a signed-out browser. The [Kiroween rules](https://kiroween.devpost.com/rules) also require a public open-source GitHub repository containing `.kiro/`, a working app URL, and a public YouTube demo. Target under three minutes for the video. Retain genuine Kiro specs and keep a short record of how Kiro helped. Do not create or publish a remote until Pakorn asks.
