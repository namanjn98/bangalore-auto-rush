# Auto Raja Mobile Web App Feel Design

## Status

Ready for user review before implementation planning.

## Context

`Auto Raja: Bangalore Rush` is currently a static HTML5 canvas game with strong personality: Bangalore zones, custom synth audio, jump/brake obstacles, horn powers, visual overlays, and a dosa break cutscene. The next improvement should not turn it into a larger progression game or a 3D rewrite. The immediate goal is to make a shared web link feel like an instant mobile game app.

The target sharing path is WhatsApp, Discord, and similar communication channels. A player should tap a link, arrive on the site, and start playing within seconds without feeling like they are navigating a traditional website.

## Goals

- Make the current game convenient and natural to play on mobile browsers.
- Preserve the existing game identity, visuals, audio, humor, and core mechanics.
- Keep the first screen small, interactive, and fast.
- Add real touch controls for jump, brake, and horn powers.
- Make retrying and sharing a score fast after game over.
- Keep the implementation static and deployable as plain `index.html`, `style.css`, and `game.js`.

## Non-Goals

- No account system.
- No global leaderboard.
- No daily missions, unlock economy, streaks, or long-term progression.
- No full 3D rewrite.
- No build step or framework migration.
- No server dependency.

## User Experience

### Entry

On mobile, the start screen should feel like a lightweight game launch screen, not a landing page. It should show the game name, a compact one-line premise, and a clear tap-to-play button. Existing control explanations should be shortened or moved into contextual hints so the player is not asked to read before playing.

### Play

The canvas should scale to the available viewport without clipping important UI. The game should remain readable on phone viewports from 320 to 430 CSS pixels wide in portrait orientation. The player should have large thumb controls:

- Jump button.
- Brake button that supports press-and-hold.
- Four horn buttons for A, S, D, and F powers.

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
- `game.js` for best-score persistence, share behavior, touch event handling, and any small tuning needed for mobile usability.

### Layout

Use responsive CSS so `#game-wrapper`, `#gameCanvas`, and overlays scale from the existing 800 by 380 game coordinate system to mobile viewport widths. Preserve the internal canvas resolution to avoid rewriting drawing logic.

Mobile should prefer an app-like vertical layout:

- Game canvas visible at the top.
- Compact horn/status UI below or overlayed without hiding obstacles.
- Touch controls at the bottom with stable dimensions.

Desktop can retain the current centered presentation.

### Touch Controls

`game.js` already attempts to bind touch IDs such as `touch-jump`, `touch-brake-down`, `touch-A`, `touch-S`, `touch-D`, and `touch-F`. The implementation should add matching DOM controls and make brake release reliable with `touchend`, `touchcancel`, `pointerup`, or an equivalent pointer-event path.

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
- Mobile viewport start, touch jump, touch brake hold/release, horn buttons, retry.
- Best score persists after reload.
- Share uses Web Share where supported or clipboard fallback otherwise.
- Canvas and overlay text remain readable at narrow widths.
- No page scroll while actively playing.
- Portrait viewports at 320, 375, 390, and 430 CSS pixels wide.
- Desktop viewport at 800 CSS pixels wide or larger.

Automated tests are optional for this pass because the project currently has no test harness or build step. If implementation introduces pure helper functions for best-score or share-text formatting, those can be tested with a lightweight local script.

## Acceptance Criteria

- A player opening the game on a phone can start within one tap after page load.
- The game can be played using only on-screen controls.
- The UI fits common mobile widths without horizontal scrolling.
- Game over exposes retry and share actions immediately.
- Best score is displayed and stored locally.
- Desktop keyboard play still works.
- The project remains a static website with no required install step.

## Scope Check

This is a convenience and mobile-web feel pass. It intentionally avoids retention systems and larger game design changes so the existing game remains recognizable and shippable quickly.
