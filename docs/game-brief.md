# Game brief | Night Shift Help Desk

**Design goal:** Make the player doubt ordinary workplace software before introducing anything visibly supernatural. The interface is how the story happens. That makes Costume Contest a better fit than adding unrelated spooky decoration.

## First case: Closed in seven minutes

- **Scenario:** One fictional employee reports that a workstation powered on by itself at 03:00.
- **Clue:** The dashboard clock reads 03:00, but opening the audit trail reveals a 03:07 closure under the player’s own analyst name. The log looks legitimate at first glance. Keep both timestamps and the actor readable together or within one tap.
- **Decision:** **Close as resolved** (trust the existing entry), or **Keep open and call the requester** (challenge the existing entry). Both are actions inside the fiction; the game performs no real call or network action.
- **Consequences:** Closing quietly makes the dashboard jump to 03:07 and adds a second closure under your name. Calling makes the recorded closure vanish, then the queue rings with a ticket from your own extension. Those are candidate lines to tune in playtest, not promises for later cases.
- **Loop:** Read the ticket → inspect the log → decide → see the result → replay. Target 60–90 seconds for a first-time player, with no enforced timer.

## Interface and tone

Dark, understated internal service desk. Clear ticket detail, audit trail, and user actions. Let a timestamp change or a single unexpected audit row carry the scare. No gore, jump scares, fast flashes, or audio-only clues. Text and icons should communicate meaning without color. Use English UI for the first build; keep player-facing copy in one place so it can be revised later.

## What is not in v0.1

No cases 2–3, account, backend, multiplayer, branching dialogue tree, save system, 3D scenes, real company logos, real endpoints, or paid services. Audio and extra polish come after both paths are fun and understandable. Final entry target, if this slice works: three fictional cases in roughly 3–5 minutes total.
