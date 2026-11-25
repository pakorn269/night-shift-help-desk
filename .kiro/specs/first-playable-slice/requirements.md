# Requirements Document

## Introduction

Night Shift Help Desk is a browser-based horror game for Kiroween 2026 Costume Contest. The first playable slice implements a single fictional help desk ticket with an impossible audit trail entry that creates doubt about ordinary workplace software. The player discovers an audit log entry timestamped seven minutes in the future, under their own analyst name, for a ticket they haven't closed yet. Two decision paths lead to distinct supernatural consequences.

## Glossary

- **Game**: The Night Shift Help Desk browser application
- **Ticket**: A fictional help desk case reporting a workstation that powered on by itself at 03:00
- **Audit_Trail**: A log display showing historical actions on the Ticket
- **Dashboard**: The main interface showing the Ticket, Audit_Trail, and game clock
- **Player**: The person using the Game
- **Decision**: A player choice to either close the Ticket or call the requester
- **Ending**: The consequence screen shown after a Decision is made
- **Replay**: An action that resets the Game to its initial state
- **Game_Clock**: A display showing the current in-game time
- **Analyst_Name**: The player's character name in the game fiction

## Requirements

### Requirement 1: Initialize Game State

**User Story:** As a player, I want the game to start with the initial ticket visible, so that I can begin investigating the case.

#### Acceptance Criteria

1. THE Game SHALL display the Ticket with a report that a workstation powered on at 03:00
2. THE Game SHALL display the Game_Clock showing 03:00
3. THE Game SHALL hide the Audit_Trail until the Player inspects it
4. THE Game SHALL hide both Ending screens
5. THE Game SHALL prevent the Player from making a Decision before inspecting the Audit_Trail

### Requirement 2: Display Ticket Information

**User Story:** As a player, I want to see clear ticket details, so that I understand the reported problem.

#### Acceptance Criteria

1. THE Game SHALL display ticket text stating a workstation powered on by itself at 03:00
2. THE Game SHALL provide a control to inspect the Audit_Trail
3. THE Game SHALL communicate all ticket information through text and icons without depending on color
4. WHEN the viewport width is 360 pixels, THE Game SHALL display all ticket information without clipping

### Requirement 3: Reveal Audit Trail

**User Story:** As a player, I want to inspect the audit trail, so that I can discover the impossible timestamp.

#### Acceptance Criteria

1. WHEN the Player activates the inspect control, THE Game SHALL display the Audit_Trail
2. THE Game SHALL display an audit entry showing the Ticket closed at 03:07 under the Analyst_Name
3. THE Game SHALL display the 03:07 timestamp and Analyst_Name together without requiring hover interaction
4. THE Game SHALL display the 03:07 timestamp and Analyst_Name together without requiring audio
5. THE Game SHALL communicate the audit entry information without depending on color

### Requirement 4: Present Decision Options

**User Story:** As a player, I want two distinct decision options, so that I can choose how to handle the impossible audit entry.

#### Acceptance Criteria

1. WHEN the Player has inspected the Audit_Trail, THE Game SHALL enable a control to close the Ticket as resolved
2. WHEN the Player has inspected the Audit_Trail, THE Game SHALL enable a control to keep the Ticket open and call the requester
3. THE Game SHALL provide keyboard navigation to both decision controls
4. THE Game SHALL display visible focus indicators on all decision controls

### Requirement 5: Execute Close Decision

**User Story:** As a player, I want to see what happens when I trust the existing audit entry, so that I experience the first ending.

#### Acceptance Criteria

1. WHEN the Player chooses to close the Ticket as resolved, THE Game SHALL update the Game_Clock to display 03:07
2. WHEN the Player chooses to close the Ticket as resolved, THE Game SHALL add a second closure entry in the Audit_Trail under the Analyst_Name
3. WHEN the Player chooses to close the Ticket as resolved, THE Game SHALL display the first Ending screen
4. WHEN the Player chooses to close the Ticket as resolved, THE Game SHALL hide the decision controls
5. IF the Player chooses to close the Ticket as resolved multiple times, THE Game SHALL execute the close action only once per game session

### Requirement 6: Execute Call Decision

**User Story:** As a player, I want to see what happens when I challenge the existing audit entry, so that I experience the second ending.

#### Acceptance Criteria

1. WHEN the Player chooses to call the requester, THE Game SHALL remove the 03:07 closure entry from the Audit_Trail
2. WHEN the Player chooses to call the requester, THE Game SHALL display a new ticket entry from the Player's own extension
3. WHEN the Player chooses to call the requester, THE Game SHALL display the second Ending screen
4. WHEN the Player chooses to call the requester, THE Game SHALL hide the decision controls
5. IF the Player chooses to call the requester multiple times, THE Game SHALL execute the call action only once per game session

### Requirement 7: Provide Distinct Endings

**User Story:** As a player, I want each decision to produce a visibly different outcome, so that my choice has clear consequences.

#### Acceptance Criteria

1. THE Game SHALL display different copy text for the first Ending compared to the second Ending
2. THE Game SHALL display different visual presentation for the first Ending compared to the second Ending
3. WHEN an Ending is displayed, THE Game SHALL provide a Replay control
4. THE Game SHALL communicate all Ending information through text and icons without depending on color

### Requirement 8: Reset Game State

**User Story:** As a player, I want to replay the game, so that I can experience the other decision path.

#### Acceptance Criteria

1. WHEN the Player activates the Replay control, THE Game SHALL hide the current Ending screen
2. WHEN the Player activates the Replay control, THE Game SHALL reset the Game_Clock to 03:00
3. WHEN the Player activates the Replay control, THE Game SHALL hide the Audit_Trail
4. WHEN the Player activates the Replay control, THE Game SHALL reset the Audit_Trail to show only the original 03:07 entry
5. WHEN the Player activates the Replay control, THE Game SHALL enable both decision controls
6. WHEN the Player activates the Replay control, THE Game SHALL reset all decision state to allow both paths to execute again

### Requirement 9: Support Keyboard Navigation

**User Story:** As a player who uses keyboard navigation, I want to operate all game controls with the keyboard, so that I can play without a mouse.

#### Acceptance Criteria

1. THE Game SHALL allow keyboard activation of the inspect Audit_Trail control
2. THE Game SHALL allow keyboard activation of both decision controls
3. THE Game SHALL allow keyboard activation of the Replay control
4. THE Game SHALL display visible focus indicators on all interactive controls
5. THE Game SHALL provide a logical tab order through all interactive controls

### Requirement 10: Support Narrow Viewports

**User Story:** As a player on a mobile device, I want the critical clue to remain visible on narrow screens, so that I can discover the impossible timestamp.

#### Acceptance Criteria

1. WHEN the viewport width is 360 pixels, THE Game SHALL display the 03:07 timestamp without clipping
2. WHEN the viewport width is 360 pixels, THE Game SHALL display the Analyst_Name without clipping
3. WHEN the viewport width is 360 pixels, THE Game SHALL display the Game_Clock without clipping
4. WHEN the viewport width is 360 pixels, THE Game SHALL display all decision controls without clipping

### Requirement 11: Build Production Artifact

**User Story:** As a developer, I want to build a production artifact, so that I can verify the game is ready for deployment.

#### Acceptance Criteria

1. WHEN the build command is executed, THE Game SHALL compile all TypeScript source files
2. WHEN the build command is executed, THE Game SHALL bundle all application assets
3. WHEN the build command is executed, THE Game SHALL output the production artifact to the dist directory
4. WHEN the build command is executed, THE Game SHALL complete without errors

### Requirement 12: Scaffold Application Structure

**User Story:** As a developer, I want a Vite + Vanilla TypeScript application structure, so that I have a foundation for implementing the game.

#### Acceptance Criteria

1. THE Game SHALL use Vite as the build tool
2. THE Game SHALL use TypeScript for all application logic
3. THE Game SHALL use HTML and CSS for all visual presentation
4. THE Game SHALL track the npm lockfile in version control
5. THE Game SHALL keep ticket content separate from state machine logic
6. THE Game SHALL implement state transitions for initial, audit inspected, resolved by close decision, resolved by call decision, and reset states
