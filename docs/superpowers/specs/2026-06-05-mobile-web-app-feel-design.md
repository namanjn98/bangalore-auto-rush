# Auto Raja Core Mechanic And Mobile Web Feel Design

## Status

Ready for user review before implementation planning.

## Context

`Auto Raja: Bangalore Rush` is currently a static HTML5 canvas game with strong personality: Bangalore zones, custom synth audio, jump/brake obstacles, horn powers, visual overlays, and a dosa break cutscene. The current mechanic is overloaded: location changes, acid/visual traps, many similar obstacles, and ASDF superpowers compete for the player's attention before the base game feels understandable.

The next improvement should not add progression, 3D, or more systems on top of the current mechanic. The immediate goal is to make the first minute playable, readable, and satisfying, then make that cleaner experience feel like an instant mobile game app from a shared link.

The target sharing path is WhatsApp, Discord, and similar communication channels. A player should tap a link, arrive on the site, and start playing within seconds without feeling like they are navigating a traditional website.

## Goals

- Fix the current core mechanic before adding new systems.
- Make the first 60 seconds readable enough that a new player can understand the game and stay engaged.
- Make the cleaned-up game convenient and natural to play on mobile browsers.
- Preserve the existing game identity, visuals, audio, humor, and jump/brake survival premise.
- Keep the first screen small, interactive, and fast.
- Add real touch controls for the simplified action set.
- Make retrying and sharing a score fast after game over.
- Keep the implementation static and deployable as plain `index.html`, `style.css`, and `game.js`.

## Non-Goals

- No account system.
- No global leaderboard.
- No daily missions, unlock economy, streaks, or long-term progression.
- No full 3D rewrite.
- No four-button ASDF superpower layer in the first mobile pass.
- No acid-trip trap during the first minute.
- No dosa break interruption during the first minute.
- No build step or framework migration.
- No server dependency.

## User Experience

### Entry

On mobile, the start screen should feel like a lightweight game launch screen, not a landing page. It should show the game name, a compact one-line premise, and a clear tap-to-play button. Existing control explanations should be shortened or moved into contextual hints so the player is not asked to read before playing.

### Core Mechanic

The primary game loop should be understandable in a few seconds:

- Tap jump to clear low road hazards.
- Hold brake to safely handle people, vehicles, and stop-style obstacles.
- Use one horn/power button as an occasional rescue or score move.

The player should not need to understand ASDF, four power types, changing zones, acid mode, or cutscenes to enjoy the first minute.

### First-Minute Ramp

The first minute should be treated as the product's onboarding and engagement window:

- First 0-10 seconds: only one obvious obstacle type appears, with a clear jump or brake cue.
- First 10-30 seconds: introduce the second action type, still with clear spacing.
- First 30-60 seconds: mix jump and brake obstacles, but avoid stacked surprises and visual interruptions.
- After 60 seconds: optional location changes, higher speed, richer obstacle mix, and special moments can begin.

The target is not to make the game easy forever. The target is to make the first minute feel fair, readable, and worth replaying.

### Play

The canvas should scale to the available viewport without clipping important UI. The game should remain readable on phone viewports from 320 to 430 CSS pixels wide in portrait orientation. The player should have large thumb controls:

- Jump button.
- Brake button that supports press-and-hold.
- One horn/power button.

Keyboard controls must continue to work on desktop.

### Game Over

The game over screen should prioritize:

- Current score.
- Best score on this device.
- Fast retry.
- Share action.
- One short Bangalore-flavored line.

The screen should avoid lengthy explanation. Sharing should generate a short text payload suitable for WhatsApp, Discord, or copying manually.

## Technical Design

### Files

The change should stay within:

- `index.html` for minimal DOM additions and metadata.
- `style.css` for responsive layout, start/gameover polish, and touch controls.
- `game.js` for mechanic simplification, difficulty ramp, best-score persistence, share behavior, and touch event handling.

### Mechanic Simplification

The existing action model should be reduced from jump, brake, and four ASDF powers to a primary mobile model of jump, brake, and one horn/power action.

The implementation should either disable the ASDF power layer for the simplified mode or map it behind the single horn button. Desktop keyboard support may retain simple aliases, but the player-facing rules should not teach four powers in this pass.

The horn/power should be easy to explain and hard to misuse. A good default is a single "Horn Blast" that charges through clean driving and clears or protects against the next immediate mistake. If that proves too much for the first implementation, it is acceptable to ship with jump and brake only and leave horn as a nonessential sound/action button.

### Obstacle And Event Tuning

The obstacle set should be staged instead of dumped on the player:

- Use a small, visually distinct set for the first minute.
- Avoid multiple similar-looking hazards with different rules early.
- Avoid back-to-back hazards that require different inputs before the player has learned the controls.
- Keep action cue labels for early play and fade them later only if the mechanic is readable.
- Defer location changes, acid/Van Gogh mode, and the dosa break until after the first minute.

### Layout

Use responsive CSS so `#game-wrapper`, `#gameCanvas`, and overlays scale from the existing 800 by 380 game coordinate system to mobile viewport widths. Preserve the internal canvas resolution to avoid rewriting drawing logic.

Mobile should prefer an app-like vertical layout:

- Game canvas visible at the top.
- Compact horn/status UI below or overlayed without hiding obstacles.
- Touch controls at the bottom with stable dimensions.

Desktop can retain the current centered presentation.

### Touch Controls

`game.js` already attempts to bind touch IDs such as `touch-jump`, `touch-brake-down`, `touch-A`, `touch-S`, `touch-D`, and `touch-F`. The implementation should replace that with controls that match the simplified mechanic: jump, brake, and optional horn/power. Brake release must be reliable with `touchend`, `touchcancel`, `pointerup`, or an equivalent pointer-event path.

Controls should prevent page scrolling during play.

### Sharing

Use the Web Share API when available. Fall back to copying share text to the clipboard. The share text should include the score and the current page URL. The feature should work without a backend.

### Persistence

Use `localStorage` for best score only. Failure to access storage should not break the game.

### Audio

Keep audio initialization behind the existing user gesture. Starting the game from the mobile tap-to-play button should continue to satisfy browser audio restrictions.

## Testing

Manual verification should cover:

- Desktop start, keyboard play, retry.
- Mobile viewport start, touch jump, touch brake hold/release, optional horn button, retry.
- First-minute ramp starts simple, then introduces mixed obstacles gradually.
- Acid/Van Gogh mode, location changes, and dosa break do not interrupt the first minute.
- Best score persists after reload.
- Share uses Web Share where supported or clipboard fallback otherwise.
- Canvas and overlay text remain readable at narrow widths.
- No page scroll while actively playing.
- Portrait viewports at 320, 375, 390, and 430 CSS pixels wide.
- Desktop viewport at 800 CSS pixels wide or larger.

Automated tests are optional for this pass because the project currently has no test harness or build step. If implementation introduces pure helper functions for best-score or share-text formatting, those can be tested with a lightweight local script.

## Acceptance Criteria

- A player opening the game on a phone can start within one tap after page load.
- The game can be played using only simplified on-screen controls.
- A new player can understand the base mechanic without learning ASDF powers.
- The first minute avoids visual/event interruptions and overloaded obstacle variety.
- The UI fits common mobile widths without horizontal scrolling.
- Game over exposes retry and share actions immediately.
- Best score is displayed and stored locally.
- Desktop keyboard play still works.
- The project remains a static website with no required install step.

## Scope Check

This is a core-mechanic repair and mobile-web feel pass. It intentionally avoids retention systems, visual rewrites, and larger game design additions. The current game must become understandable and convenient before new systems are layered on top.
