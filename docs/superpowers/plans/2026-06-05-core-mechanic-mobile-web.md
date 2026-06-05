# Core Mechanic Mobile Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Auto Raja's current game mechanic understandable for the first minute and playable from a shared mobile web link.

**Architecture:** Keep the static HTML/CSS/JS structure. Add small testable rule helpers inside `game.js`, wire them into obstacle spawning and timed events, then update the DOM/CSS/input layer for a simplified mobile control set. The first implementation pass uses jump, brake, and one charged Horn Blast instead of the four ASDF powers.

**Tech Stack:** Plain HTML, CSS, browser canvas, browser Web Audio, browser `localStorage`, Web Share API, Node built-in `assert`/`vm` for lightweight helper tests, `python3 -m http.server` for manual browser verification.

---

## File Structure

- Modify `game.js`: add first-minute rule helpers, test exports, staged obstacle spawning, delayed special events, single Horn Blast, best-score storage, share behavior, and pointer-safe touch controls.
- Modify `index.html`: simplify start copy, replace ASDF horn UI with one Horn Blast button, add mobile touch controls, add best-score/share elements to game over, add mobile metadata.
- Modify `style.css`: make the wrapper responsive, keep the canvas readable, restyle start/gameover screens, and add large mobile thumb controls.
- Create `tests/game-rules.test.js`: Node test harness for pure rule helpers exported from `game.js`.

## Task 1: Add Test Harness For First-Minute Rules

**Files:**
- Create: `tests/game-rules.test.js`
- Modify: `game.js`
- Test: `tests/game-rules.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/game-rules.test.js` with this content:

```js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeClassList() {
  const classes = new Set();
  return {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name),
    toggle: (name, force) => {
      if (force === undefined) {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      }
      if (force) classes.add(name);
      else classes.delete(name);
      return force;
    }
  };
}

function makeElement(id) {
  return {
    id,
    checked: false,
    textContent: '',
    style: {},
    classList: makeClassList(),
    addEventListener() {},
    removeEventListener() {},
    appendChild() {}
  };
}

function loadHooks() {
  const elements = new Map();
  const document = {
    body: makeElement('body'),
    fonts: { ready: { then() {} } },
    createElement(tag) {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              drawImage() {},
              getImageData() { return { data: new Uint8ClampedArray(800 * 380 * 4) }; },
              createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; },
              putImageData() {}
            };
          }
        };
      }
      return makeElement(tag);
    },
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    }
  };

  const context = {
    console,
    document,
    window: {},
    module: { exports: {} },
    exports: {},
    setTimeout() { return 1; },
    clearTimeout() {},
    performance: { now() { return 0; } },
    Uint8ClampedArray
  };
  context.globalThis = context;
  context.window = context;

  const code = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
  vm.runInNewContext(code, context, { filename: 'game.js' });
  return context.module.exports;
}

const hooks = loadHooks();

assert.equal(typeof hooks.getRunPhase, 'function');
assert.equal(typeof hooks.getObstacleWeightsForElapsed, 'function');
assert.equal(typeof hooks.shouldAllowSpecialEvents, 'function');

assert.equal(hooks.getRunPhase(0), 'jump_intro');
assert.equal(hooks.getRunPhase(9999), 'jump_intro');
assert.equal(hooks.getRunPhase(10000), 'brake_intro');
assert.equal(hooks.getRunPhase(29999), 'brake_intro');
assert.equal(hooks.getRunPhase(30000), 'mixed_intro');
assert.equal(hooks.getRunPhase(59999), 'mixed_intro');
assert.equal(hooks.getRunPhase(60000), 'full_game');

assert.deepEqual(hooks.getObstacleWeightsForElapsed(0, { pothole: 3, pedestrian: 3, it_bus: 2 }), {
  pothole: 1
});
assert.deepEqual(hooks.getObstacleWeightsForElapsed(15000, { pothole: 3, pedestrian: 3, it_bus: 2 }), {
  pothole: 2,
  pedestrian: 1
});
assert.deepEqual(hooks.getObstacleWeightsForElapsed(45000, { pothole: 3, pedestrian: 3, traffic_cone: 2, it_bus: 2 }), {
  pothole: 3,
  pedestrian: 2,
  traffic_cone: 1
});
assert.deepEqual(hooks.getObstacleWeightsForElapsed(61000, { pothole: 3, pedestrian: 3, it_bus: 2 }), {
  pothole: 3,
  pedestrian: 3,
  it_bus: 2
});

assert.equal(hooks.shouldAllowSpecialEvents(59999), false);
assert.equal(hooks.shouldAllowSpecialEvents(60000), true);

console.log('game-rules tests passed');
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/game-rules.test.js
```

Expected: FAIL with an assertion showing `hooks.getRunPhase` is not a function.

- [ ] **Step 3: Add first-minute rule helpers and test exports**

In `game.js`, replace the constants block at the top:

```js
const ACID_INTERVAL = 20000;
const ACID_DURATION = 5000;
const ZONE_DURATION = 30000;
const SETTINGS = { animeMode: false, overlayStyle: 'acid' };
```

with:

```js
const ACID_INTERVAL = 20000;
const ACID_DURATION = 5000;
const ZONE_DURATION = 30000;
const FIRST_MINUTE_MS = 60000;
const DOSA_BREAK_AT_MS = 95000;
const SETTINGS = { animeMode: false, overlayStyle: 'acid' };

const RunRules = {
  getRunPhase(elapsed) {
    if (elapsed < 10000) return 'jump_intro';
    if (elapsed < 30000) return 'brake_intro';
    if (elapsed < FIRST_MINUTE_MS) return 'mixed_intro';
    return 'full_game';
  },

  shouldAllowSpecialEvents(elapsed) {
    return elapsed >= FIRST_MINUTE_MS;
  },

  getObstacleWeightsForElapsed(elapsed, zoneWeights) {
    const phase = this.getRunPhase(elapsed);
    if (phase === 'jump_intro') return { pothole: 1 };
    if (phase === 'brake_intro') return { pothole: 2, pedestrian: 1 };
    if (phase === 'mixed_intro') return { pothole: 3, pedestrian: 2, traffic_cone: 1 };
    return { ...zoneWeights };
  }
};
```

At the bottom of `game.js`, replace:

```js
document.fonts.ready.then(() => Game.init());
```

with:

```js
const AutoRajaTestHooks = {
  getRunPhase: elapsed => RunRules.getRunPhase(elapsed),
  getObstacleWeightsForElapsed: (elapsed, zoneWeights) => RunRules.getObstacleWeightsForElapsed(elapsed, zoneWeights),
  shouldAllowSpecialEvents: elapsed => RunRules.shouldAllowSpecialEvents(elapsed)
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutoRajaTestHooks;
}

document.fonts.ready.then(() => Game.init());
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 5: Commit**

Run:

```bash
git add game.js tests/game-rules.test.js
git commit -m "test: add first minute rule coverage"
```

Expected: commit succeeds.

## Task 2: Wire First-Minute Rules Into Gameplay

**Files:**
- Modify: `game.js`
- Test: `tests/game-rules.test.js`

- [ ] **Step 1: Add failing tests for double-spawn and event gating**

In `tests/game-rules.test.js`, add these assertions before the final `console.log`:

```js
assert.equal(typeof hooks.shouldAllowDoubleSpawn, 'function');
assert.equal(hooks.shouldAllowDoubleSpawn(59999), false);
assert.equal(hooks.shouldAllowDoubleSpawn(60000), true);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/game-rules.test.js
```

Expected: FAIL with an assertion showing `hooks.shouldAllowDoubleSpawn` is not a function.

- [ ] **Step 3: Implement the rule helper**

In `game.js`, add this method inside `RunRules` after `shouldAllowSpecialEvents`:

```js
  shouldAllowDoubleSpawn(elapsed) {
    return elapsed >= FIRST_MINUTE_MS;
  },
```

In `AutoRajaTestHooks`, add this export after `shouldAllowSpecialEvents`:

```js
  shouldAllowDoubleSpawn: elapsed => RunRules.shouldAllowDoubleSpawn(elapsed)
```

The exported object should contain commas between every property:

```js
const AutoRajaTestHooks = {
  getRunPhase: elapsed => RunRules.getRunPhase(elapsed),
  getObstacleWeightsForElapsed: (elapsed, zoneWeights) => RunRules.getObstacleWeightsForElapsed(elapsed, zoneWeights),
  shouldAllowSpecialEvents: elapsed => RunRules.shouldAllowSpecialEvents(elapsed),
  shouldAllowDoubleSpawn: elapsed => RunRules.shouldAllowDoubleSpawn(elapsed)
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 5: Use staged obstacle weights in `Obstacles.spawn`**

In `game.js`, replace the first lines of `Obstacles.spawn()`:

```js
    let weights = {...this.ZONE_W[GS.zone]};
    if (GS.hornBar < 0.3) { delete weights.it_bus; delete weights.flood; }
    // don't stack same action type too close
    if (this.lastAction === 'jump') delete weights.pothole, delete weights.dog, delete weights.garbage;
```

with:

```js
    let weights = RunRules.getObstacleWeightsForElapsed(GS.elapsed, this.ZONE_W[GS.zone]);
    if (GS.hornBar < 0.3) { delete weights.it_bus; delete weights.flood; }
    if (RunRules.getRunPhase(GS.elapsed) === 'full_game' && this.lastAction === 'jump') {
      delete weights.pothole;
      delete weights.dog;
      delete weights.garbage;
    }
```

- [ ] **Step 6: Prevent early double-spawns**

In `Obstacles.update(dt)`, replace:

```js
      if (Math.random() < 0.18) setTimeout(() => { if (GS.alive) this.spawn(); }, 1000);
```

with:

```js
      if (RunRules.shouldAllowDoubleSpawn(GS.elapsed) && Math.random() < 0.18) {
        setTimeout(() => { if (GS.alive) this.spawn(); }, 1000);
      }
```

- [ ] **Step 7: Defer acid/Van Gogh until after the first minute**

At the start of `Acid.update(dt)`, immediately after the opening brace, add:

```js
    if (!RunRules.shouldAllowSpecialEvents(GS.elapsed)) {
      GS.acidCycleTimer = 0;
      GS.acidMode = false;
      this.intensity = 0;
      const warning = document.getElementById('acid-warning');
      warning.classList.add('hidden');
      warning.classList.remove('visible-warn');
      document.body.classList.remove('acid-mode', 'van-gogh-mode');
      return;
    }
```

- [ ] **Step 8: Defer zone changes until after the first minute**

In `Game.loop(ts)`, replace the zone cycling block:

```js
      GS.zoneTimer += GS.dt;
      if (GS.zoneTimer >= ZONE_DURATION) {
        GS.zoneTimer = 0;
        const prev = GS.zone;
        GS.zone = (GS.zone + 1) % 5;
        this.showZoneBanner();
        Audio.changeZone(GS.zone);
        Audio.sfx('zoneChange');
        // rain in park / MG road zones
        Audio.setRain(GS.zone <= 1 ? 0.6 : 0.1);
        // reset lastTime so audio/DOM work in this frame doesn't inflate next dt
        GS.lastTime = performance.now();
      }
```

with:

```js
      if (RunRules.shouldAllowSpecialEvents(GS.elapsed)) {
        GS.zoneTimer += GS.dt;
        if (GS.zoneTimer >= ZONE_DURATION) {
          GS.zoneTimer = 0;
          GS.zone = (GS.zone + 1) % 5;
          this.showZoneBanner();
          Audio.changeZone(GS.zone);
          Audio.sfx('zoneChange');
          Audio.setRain(GS.zone <= 1 ? 0.6 : 0.1);
          GS.lastTime = performance.now();
        }
      } else {
        GS.zoneTimer = 0;
      }
```

- [ ] **Step 9: Move dosa break later**

In `Game.loop(ts)`, replace:

```js
    // dosa break at 60s
    if (GS.alive && !GS.dosaBreakDone && !GS.dosaBreak && GS.elapsed >= 60000) {
      DosaBreak.start();
    }
```

with:

```js
    if (GS.alive && !GS.dosaBreakDone && !GS.dosaBreak && GS.elapsed >= DOSA_BREAK_AT_MS) {
      DosaBreak.start();
    }
```

- [ ] **Step 10: Run tests**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 11: Commit**

Run:

```bash
git add game.js tests/game-rules.test.js
git commit -m "feat: stage first minute gameplay"
```

Expected: commit succeeds.

## Task 3: Replace ASDF With One Horn Blast

**Files:**
- Modify: `game.js`
- Test: `tests/game-rules.test.js`

- [ ] **Step 1: Add failing tests for horn charge rules**

In `tests/game-rules.test.js`, add these assertions before the final `console.log`:

```js
assert.equal(typeof hooks.getHornChargeAfterAction, 'function');
assert.equal(hooks.getHornChargeAfterAction(0, 'jump'), 0.14);
assert.equal(hooks.getHornChargeAfterAction(0.9, 'brake'), 1);
assert.equal(hooks.getHornChargeAfterAction(0.2, 'tap'), 0.24);
assert.equal(hooks.getHornChargeAfterAction(0.2, 'unknown'), 0.2);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/game-rules.test.js
```

Expected: FAIL with an assertion showing `hooks.getHornChargeAfterAction` is not a function.

- [ ] **Step 3: Add horn charge helper**

In `game.js`, add this object after `RunRules`:

```js
const HornRules = {
  CHARGE: { jump: 0.14, brake: 0.10, tap: 0.04 },

  getHornChargeAfterAction(current, action) {
    const amount = this.CHARGE[action] || 0;
    return Math.min(1, Math.round((current + amount) * 100) / 100);
  }
};
```

In `AutoRajaTestHooks`, add:

```js
  getHornChargeAfterAction: (current, action) => HornRules.getHornChargeAfterAction(current, action)
```

The complete exported object should be:

```js
const AutoRajaTestHooks = {
  getRunPhase: elapsed => RunRules.getRunPhase(elapsed),
  getObstacleWeightsForElapsed: (elapsed, zoneWeights) => RunRules.getObstacleWeightsForElapsed(elapsed, zoneWeights),
  shouldAllowSpecialEvents: elapsed => RunRules.shouldAllowSpecialEvents(elapsed),
  shouldAllowDoubleSpawn: elapsed => RunRules.shouldAllowDoubleSpawn(elapsed),
  getHornChargeAfterAction: (current, action) => HornRules.getHornChargeAfterAction(current, action)
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 5: Route jump/brake charging through `HornRules`**

In `Player.jump()`, replace:

```js
      Horn.addCharge(0.25);
```

with:

```js
      Horn.addActionCharge('jump');
```

In `Game.bindInputs()`, replace the ArrowDown branch:

```js
      else if (e.code==='ArrowDown') { e.preventDefault(); Player.braking=true; Audio.sfx('brake'); Horn.addCharge(0.12); }
```

with:

```js
      else if (e.code==='ArrowDown') { e.preventDefault(); this.startBrake(); }
```

- [ ] **Step 6: Replace the Horn object**

In `game.js`, replace the current `const Horn = { ... };` object with:

```js
const Horn = {
  addActionCharge(action) {
    GS.hornBar = HornRules.getHornChargeAfterAction(GS.hornBar, action);
  },

  press() {
    Audio.horn('A');
    const el = document.getElementById('note-horn');
    if (el) { el.classList.add('pressed'); setTimeout(()=>el.classList.remove('pressed'), 90); }
    if (GS.hornBar >= 0.98 && !GS.activePower) {
      this._triggerBlast();
    } else {
      this.addActionCharge('tap');
    }
  },

  _triggerBlast() {
    Audio.sfx('combo');
    GS.hornBar = 0;
    Obstacles.clearAll();
    Particles.boom(CW/2, CH/2, '#FFD700', 24);
    Particles.sparkle(Player.x+28, Player.y+10);
    const pi = document.getElementById('power-indicator');
    pi.textContent = 'HORN BLAST!';
    pi.classList.remove('hidden');
    setTimeout(() => pi.classList.add('hidden'), 900);
  },

  update(dt) {
    GS.hornBar = Math.max(0, GS.hornBar - 0.0002);
    document.getElementById('horn-bar-fill').style.width = (GS.hornBar * 100) + '%';
    document.getElementById('speed-value').textContent = GS.speed.toFixed(1);
    document.getElementById('score-value').textContent = GS.score;
  }
};
```

- [ ] **Step 7: Add brake helper methods to `Game`**

Inside the `Game` object, after `showZoneBanner()`, add:

```js
  startBrake() {
    if (!GS.alive || Player.braking) return;
    Player.braking = true;
    Audio.sfx('brake');
    Horn.addActionCharge('brake');
  },

  stopBrake() {
    Player.braking = false;
  },
```

- [ ] **Step 8: Map keyboard horn aliases to one horn action**

In `Game.bindInputs()`, replace:

```js
      else if (e.code==='KeyA') Horn.press('A');
      else if (e.code==='KeyS') Horn.press('S');
      else if (e.code==='KeyD') Horn.press('D');
      else if (e.code==='KeyF') Horn.press('F');
```

with:

```js
      else if (e.code==='KeyH'||e.code==='KeyA'||e.code==='KeyS'||e.code==='KeyD'||e.code==='KeyF') Horn.press();
```

In the keyup listener, replace:

```js
      if (e.code==='ArrowDown') Player.braking = false;
```

with:

```js
      if (e.code==='ArrowDown') this.stopBrake();
```

- [ ] **Step 9: Run tests**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 10: Commit**

Run:

```bash
git add game.js tests/game-rules.test.js
git commit -m "feat: simplify horn power"
```

Expected: commit succeeds.

## Task 4: Update HTML For Mobile Entry, Controls, And Game Over

**Files:**
- Modify: `game.js`
- Modify: `index.html`
- Test: manual browser verification

- [ ] **Step 1: Guard removed mode toggles and mark active play**

In `Game.start()`, replace:

```js
    document.getElementById('power-indicator').classList.add('hidden');
    document.getElementById('acid-warning').classList.add('hidden');
    SETTINGS.animeMode = document.getElementById('toggle-anime').checked;
    SETTINGS.overlayStyle = document.getElementById('toggle-overlay').checked ? 'vangogh' : 'acid';
    document.body.classList.remove('acid-mode', 'van-gogh-mode');
    document.body.classList.toggle('anime-mode', SETTINGS.animeMode);
```

with:

```js
    document.getElementById('power-indicator').classList.add('hidden');
    document.getElementById('acid-warning').classList.add('hidden');
    const animeToggle = document.getElementById('toggle-anime');
    const overlayToggle = document.getElementById('toggle-overlay');
    SETTINGS.animeMode = !!(animeToggle && animeToggle.checked);
    SETTINGS.overlayStyle = overlayToggle && overlayToggle.checked ? 'vangogh' : 'acid';
    document.body.classList.remove('acid-mode', 'van-gogh-mode');
    document.body.classList.add('game-active');
    document.body.classList.toggle('anime-mode', SETTINGS.animeMode);
```

In `Game.showGameOver()`, replace:

```js
    document.body.classList.remove('acid-mode', 'van-gogh-mode');
```

with:

```js
    document.body.classList.remove('acid-mode', 'van-gogh-mode', 'game-active');
```

In `Game.bindInputs()`, replace the two mode-toggle listener blocks:

```js
    document.getElementById('toggle-anime').addEventListener('change', function() {
      SETTINGS.animeMode = this.checked;
      document.body.classList.toggle('anime-mode', this.checked);
    });
    document.getElementById('toggle-overlay').addEventListener('change', function() {
      SETTINGS.overlayStyle = this.checked ? 'vangogh' : 'acid';
      document.getElementById('opt-acid').classList.toggle('opt-active', !this.checked);
      document.getElementById('opt-vg').classList.toggle('opt-active', this.checked);
    });
```

with:

```js
    const animeToggle = document.getElementById('toggle-anime');
    if (animeToggle) {
      animeToggle.addEventListener('change', function() {
        SETTINGS.animeMode = this.checked;
        document.body.classList.toggle('anime-mode', this.checked);
      });
    }
    const overlayToggle = document.getElementById('toggle-overlay');
    if (overlayToggle) {
      overlayToggle.addEventListener('change', function() {
        SETTINGS.overlayStyle = this.checked ? 'vangogh' : 'acid';
        const acidOpt = document.getElementById('opt-acid');
        const vgOpt = document.getElementById('opt-vg');
        if (acidOpt) acidOpt.classList.toggle('opt-active', !this.checked);
        if (vgOpt) vgOpt.classList.toggle('opt-active', this.checked);
      });
    }
```

- [ ] **Step 2: Add mobile metadata**

In `index.html`, after the viewport meta tag, add:

```html
  <meta name="theme-color" content="#0a0a1a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Auto Raja">
```

- [ ] **Step 3: Replace horn UI with one Horn Blast control**

Replace the current `#horn-bar-container` block with:

```html
    <div id="horn-bar-container">
      <div id="horn-status-row">
        <span id="horn-label">HORN BLAST</span>
        <span id="horn-help">charges as you drive</span>
      </div>
      <div id="horn-bar-track">
        <div id="horn-bar-fill"></div>
      </div>
      <button class="note-slot" id="note-horn" type="button">HORN</button>
    </div>
```

- [ ] **Step 4: Simplify the start screen**

Inside `#start-screen`, replace the `#start-story`, `#controls-box`, `#mode-toggles`, and start button block with:

```html
      <div id="start-story">
        Tap jump. Hold brake. Survive Bangalore traffic.
      </div>
      <div id="controls-box">
        <div>JUMP over road hazards</div>
        <div>BRAKE for people and vehicles</div>
        <div>HORN clears trouble when charged</div>
      </div>
      <button id="start-btn">TAP TO PLAY</button>
```

Leave `#start-title` and `#start-sub` unchanged.

- [ ] **Step 5: Replace the game-over screen contents**

Replace the current `#gameover-screen` block with:

```html
    <div id="gameover-screen" class="hidden">
      <div id="gameover-title">GAME OVER</div>
      <div id="gameover-score">SCORE: <span id="final-score">0</span></div>
      <div id="best-score-row">BEST: <span id="best-score">0</span></div>
      <div id="gameover-msg"></div>
      <div id="gameover-actions">
        <button id="retry-btn" type="button">PLAY AGAIN</button>
        <button id="share-btn" type="button">SHARE SCORE</button>
      </div>
      <div id="share-status" aria-live="polite"></div>
    </div>
```

- [ ] **Step 6: Add touch controls after game-over screen**

Add this block after `#gameover-screen` and before the closing `#game-wrapper` div:

```html
    <div id="touch-controls" aria-label="Mobile controls">
      <button id="touch-jump" class="touch-btn touch-primary" type="button">JUMP</button>
      <button id="touch-brake" class="touch-btn touch-primary" type="button">BRAKE</button>
      <button id="touch-horn" class="touch-btn touch-horn" type="button">HORN</button>
    </div>
```

- [ ] **Step 7: Commit**

Run:

```bash
git add game.js index.html
git commit -m "feat: simplify mobile game markup"
```

Expected: commit succeeds.

## Task 5: Add Responsive Mobile Styling

**Files:**
- Modify: `style.css`
- Test: manual browser verification

- [ ] **Step 1: Replace fixed page sizing rules**

In `style.css`, replace the `body`, `#game-wrapper`, `#gameCanvas`, and `#ui-overlay` rules near the top with:

```css
body {
  background: #0a0a1a;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100svh;
  font-family: 'Press Start 2P', monospace;
  overflow: hidden;
  touch-action: none;
}

#game-wrapper {
  --game-width: min(100vw, 800px);
  position: relative;
  width: var(--game-width);
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 40px rgba(255, 200, 50, 0.3);
  border: 2px solid #333;
  background: #111;
}

#gameCanvas {
  display: block;
  width: 100%;
  aspect-ratio: 800 / 380;
  height: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background: #1a1a2e;
}

#ui-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  aspect-ratio: 800 / 380;
  pointer-events: none;
  z-index: 10;
}
```

- [ ] **Step 2: Replace horn bar styles**

Replace the rules from `#horn-bar-container` through `.combo-hint` with:

```css
#horn-bar-container {
  background: #111;
  border-top: 3px solid #333;
  padding: 7px 10px 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px 10px;
  align-items: center;
}

#horn-status-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  grid-column: 1 / -1;
}

#horn-label {
  font-size: 7px;
  color: #FFD700;
}

#horn-help {
  font-size: 6px;
  color: #777;
}

#horn-bar-track {
  height: 12px;
  background: #222;
  border: 1px solid #444;
  border-radius: 2px;
  overflow: hidden;
}

#horn-bar-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #ff8800, #FFD700, #ffffff);
  transition: width 0.08s ease;
  box-shadow: 0 0 6px #FFD700;
}

.note-slot {
  min-width: 76px;
  min-height: 32px;
  border: 2px solid #FFD700;
  color: #FFD700;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  cursor: pointer;
  transition: transform 0.05s, background 0.05s, box-shadow 0.05s;
  user-select: none;
}

.note-slot.pressed {
  transform: scale(1.06);
  box-shadow: 0 0 12px currentColor;
  background: rgba(255,215,0,0.25);
}
```

- [ ] **Step 3: Update screen overlay sizing**

Replace `#start-screen, #gameover-screen` with:

```css
#start-screen, #gameover-screen {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  aspect-ratio: 800 / 380;
  min-height: 0;
  background: rgba(0,0,0,0.88);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 100;
  color: #fff;
  padding: 14px;
}
```

Add this after `#gameover-score`:

```css
#best-score-row {
  font-size: 9px;
  color: #88ffaa;
}

#gameover-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

#share-status {
  min-height: 12px;
  font-size: 6px;
  color: #88ffaa;
}
```

- [ ] **Step 4: Add touch control styles**

Append this block to the end of `style.css`:

```css
#touch-controls {
  display: none;
}

@media (max-width: 700px), (pointer: coarse) {
  body {
    align-items: flex-start;
    background: #050510;
  }

  #game-wrapper {
    --game-width: 100vw;
    min-height: 100svh;
    border: 0;
    box-shadow: none;
  }

  #start-title {
    font-size: clamp(22px, 8vw, 34px);
    letter-spacing: 2px;
  }

  #start-sub {
    font-size: clamp(9px, 3vw, 13px);
    letter-spacing: 3px;
  }

  #start-story {
    font-size: clamp(7px, 2.2vw, 10px);
    line-height: 1.8;
    max-width: 88vw;
  }

  #controls-box {
    font-size: clamp(6px, 2vw, 8px);
    line-height: 2;
    padding: 8px 10px;
    max-width: 88vw;
  }

  #speed-display,
  #score-display,
  #power-indicator {
    font-size: clamp(7px, 2vw, 9px);
  }

  #horn-bar-container {
    flex: 0 0 auto;
  }

  .game-active #touch-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 10px;
    background: #080812;
    border-top: 2px solid #2a2a35;
    touch-action: none;
  }

  .touch-btn {
    font-family: 'Press Start 2P', monospace;
    min-height: 72px;
    border: 2px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.08);
    color: #fff;
    font-size: clamp(10px, 3vw, 14px);
    box-shadow: none;
    border-radius: 8px;
    touch-action: none;
  }

  .touch-btn:active,
  .touch-btn.is-pressed {
    transform: scale(0.98);
    background: rgba(255,215,0,0.28);
    border-color: #FFD700;
  }

  .touch-horn {
    grid-column: 1 / -1;
    min-height: 54px;
    color: #111;
    background: #FFD700;
    border-color: #FFD700;
  }

  #gameover-actions {
    gap: 8px;
  }

  #gameover-actions button {
    font-size: clamp(7px, 2.2vw, 10px);
    padding: 10px 12px;
  }
}
```

- [ ] **Step 5: Commit**

Run:

```bash
git add style.css
git commit -m "feat: add responsive mobile controls styling"
```

Expected: commit succeeds.

## Task 6: Add Touch, Best Score, And Share Behavior

**Files:**
- Modify: `game.js`
- Test: `tests/game-rules.test.js`

- [ ] **Step 1: Add failing tests for share text**

In `tests/game-rules.test.js`, add these assertions before the final `console.log`:

```js
assert.equal(typeof hooks.formatShareText, 'function');
assert.equal(
  hooks.formatShareText(2140, 3000, 'https://example.com/auto-raja'),
  'I scored 2140 in Auto Raja: Bangalore Rush. Best on this phone: 3000. Beat me: https://example.com/auto-raja'
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node tests/game-rules.test.js
```

Expected: FAIL with an assertion showing `hooks.formatShareText` is not a function.

- [ ] **Step 3: Add score and share helpers**

In `game.js`, add this object after `HornRules`:

```js
const ScoreShare = {
  BEST_KEY: 'auto-raja-best-score',

  readBestScore() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(this.BEST_KEY);
      const parsed = Number.parseInt(raw || '0', 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (err) {
      return 0;
    }
  },

  saveBestScore(score) {
    const best = Math.max(this.readBestScore(), score);
    try {
      if (window.localStorage) window.localStorage.setItem(this.BEST_KEY, String(best));
    } catch (err) {
      return best;
    }
    return best;
  },

  formatShareText(score, best, url) {
    return `I scored ${score} in Auto Raja: Bangalore Rush. Best on this phone: ${best}. Beat me: ${url}`;
  }
};
```

In `AutoRajaTestHooks`, add:

```js
  formatShareText: (score, best, url) => ScoreShare.formatShareText(score, best, url)
```

The complete exported object should be:

```js
const AutoRajaTestHooks = {
  getRunPhase: elapsed => RunRules.getRunPhase(elapsed),
  getObstacleWeightsForElapsed: (elapsed, zoneWeights) => RunRules.getObstacleWeightsForElapsed(elapsed, zoneWeights),
  shouldAllowSpecialEvents: elapsed => RunRules.shouldAllowSpecialEvents(elapsed),
  shouldAllowDoubleSpawn: elapsed => RunRules.shouldAllowDoubleSpawn(elapsed),
  getHornChargeAfterAction: (current, action) => HornRules.getHornChargeAfterAction(current, action),
  formatShareText: (score, best, url) => ScoreShare.formatShareText(score, best, url)
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 5: Update game-over score display**

Replace `Game.showGameOver()` with:

```js
  showGameOver() {
    const msgs = [
      'Traffic got you bro.', 'Even Rajappa has limits.', 'The city wins today.',
      'Horn earlier next time.', 'Bangalore never sleeps... you just did.'
    ];
    const best = ScoreShare.saveBestScore(GS.score);
    document.getElementById('final-score').textContent = GS.score;
    document.getElementById('best-score').textContent = best;
    document.getElementById('gameover-msg').textContent = msgs[GS.score%msgs.length];
    document.getElementById('share-status').textContent = '';
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.body.classList.remove('acid-mode', 'van-gogh-mode', 'game-active');
  },
```

- [ ] **Step 6: Add share method to `Game`**

Inside the `Game` object, after `showGameOver()`, add:

```js
  async shareScore() {
    const best = ScoreShare.readBestScore();
    const url = window.location && window.location.href ? window.location.href : 'https://example.com';
    const text = ScoreShare.formatShareText(GS.score, best, url);
    const status = document.getElementById('share-status');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Auto Raja: Bangalore Rush', text, url });
        status.textContent = 'Shared.';
        return;
      }
      await navigator.clipboard.writeText(text);
      status.textContent = 'Score copied.';
    } catch (err) {
      status.textContent = text;
    }
  },
```

- [ ] **Step 7: Replace touch binding**

In `Game.bindInputs()`, replace the existing touch support block:

```js
    // touch support — on-screen buttons
    const touchMap = { 'touch-jump': ()=>Player.jump(), 'touch-brake-down': ()=>{ Player.braking=true; Audio.sfx('brake'); }, 'touch-A': ()=>Horn.press('A'), 'touch-S': ()=>Horn.press('S'), 'touch-D': ()=>Horn.press('D'), 'touch-F': ()=>Horn.press('F') };
    for (const [id, fn] of Object.entries(touchMap)) {
      const el = document.getElementById(id);
      if (el) { el.addEventListener('touchstart', e=>{ e.preventDefault(); if(GS.alive)fn(); }, {passive:false}); }
    }
```

with:

```js
    document.getElementById('note-horn').addEventListener('click', () => { if (GS.alive) Horn.press(); });
    document.getElementById('share-btn').addEventListener('click', () => this.shareScore());

    this.bindPressButton('touch-jump', () => Player.jump());
    this.bindPressButton('touch-horn', () => Horn.press());
    this.bindHoldButton('touch-brake', () => this.startBrake(), () => this.stopBrake());
```

Inside the `Game` object, after `stopBrake()`, add:

```js
  bindPressButton(id, onPress) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!GS.alive) return;
      el.classList.add('is-pressed');
      onPress();
    });
    el.addEventListener('pointerup', () => el.classList.remove('is-pressed'));
    el.addEventListener('pointercancel', () => el.classList.remove('is-pressed'));
    el.addEventListener('pointerleave', () => el.classList.remove('is-pressed'));
  },

  bindHoldButton(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const release = e => {
      if (e) e.preventDefault();
      el.classList.remove('is-pressed');
      onUp();
    };
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (!GS.alive) return;
      el.classList.add('is-pressed');
      onDown();
    });
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  },
```

- [ ] **Step 8: Run tests**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 9: Commit**

Run:

```bash
git add game.js tests/game-rules.test.js
git commit -m "feat: add mobile controls and score sharing"
```

Expected: commit succeeds.

## Task 7: Browser Verification And Final Tuning

**Files:**
- Modify: `game.js`, `index.html`, `style.css` only for fixes discovered during verification
- Test: local browser verification

- [ ] **Step 1: Run JavaScript tests**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 2: Start local static server**

Run:

```bash
python3 -m http.server 8000
```

Expected: server prints `Serving HTTP on :: port 8000` or `Serving HTTP on 0.0.0.0 port 8000`.

- [ ] **Step 3: Verify desktop**

Open `http://localhost:8000` in a desktop browser and verify:

- Start screen shows short copy and `TAP TO PLAY`.
- Keyboard Space or ArrowUp jumps.
- Keyboard ArrowDown brakes while held and releases on keyup.
- Keyboard H and A/S/D/F all trigger the same horn action.
- No ASDF instructions are visible.
- Game-over screen shows score, best score, retry, and share.

- [ ] **Step 4: Verify mobile widths**

In browser device emulation, test portrait widths `320`, `375`, `390`, and `430` CSS pixels. For each width verify:

- No horizontal scrolling.
- Canvas is visible and not cropped.
- Jump, Brake, and Horn controls are visible below the game.
- Touch/pointer Jump works.
- Touch/pointer Brake stays active while held and releases on pointerup.
- Touch/pointer Horn works.
- Start and game-over overlays fit without overlapping button text.

- [ ] **Step 5: Verify first-minute mechanic**

Play from a fresh run and verify:

- `0-10s`: only potholes appear.
- `10-30s`: potholes and pedestrians appear.
- `30-60s`: potholes, pedestrians, and traffic cones appear.
- Before `60s`: no zone banner, no acid/Van Gogh warning, no visual trap, no dosa break.
- After `60s`: richer events are allowed.

- [ ] **Step 6: Verify sharing**

On a browser with Web Share support, click `SHARE SCORE` and verify the native share sheet opens. On a desktop browser without Web Share support, click `SHARE SCORE` and verify the share text copies to clipboard or appears in `#share-status`.

- [ ] **Step 7: Apply fixes from verification**

If verification exposes a defect, make the smallest targeted edit in the owning file:

- `game.js` for behavior, timing, input, score, and share defects.
- `style.css` for layout, overlap, touch target, and responsive defects.
- `index.html` for missing or mismatched element IDs.

After each fix, rerun:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 8: Commit final verification fixes**

Run:

```bash
git status --short
git add game.js index.html style.css tests/game-rules.test.js
git commit -m "fix: polish mobile mechanic verification"
```

Expected: commit succeeds if files changed. If no files changed after verification, skip this commit.

## Task 8: Final Review

**Files:**
- Read: `docs/superpowers/specs/2026-06-05-mobile-web-app-feel-design.md`
- Read: `docs/superpowers/plans/2026-06-05-core-mechanic-mobile-web.md`
- Read: `game.js`, `index.html`, `style.css`

- [ ] **Step 1: Run final tests**

Run:

```bash
node tests/game-rules.test.js
```

Expected: PASS and prints `game-rules tests passed`.

- [ ] **Step 2: Check repository status**

Run:

```bash
git status --short --branch
```

Expected: clean branch or only intentional uncommitted local server artifacts.

- [ ] **Step 3: Compare against acceptance criteria**

Confirm each item is true:

- A player opening the game on a phone can start within one tap after page load.
- The game can be played using only Jump, Brake, and Horn.
- A new player can understand the base mechanic without learning ASDF powers.
- The first minute avoids visual/event interruptions and overloaded obstacle variety.
- The UI fits 320, 375, 390, and 430 CSS pixel portrait widths without horizontal scrolling.
- Game over exposes retry and share actions immediately.
- Best score is displayed and stored locally.
- Desktop keyboard play still works.
- The project remains a static website with no required install step.

- [ ] **Step 4: Commit plan execution completion note if changed**

If the plan checkboxes were updated during execution, run:

```bash
git add docs/superpowers/plans/2026-06-05-core-mechanic-mobile-web.md
git commit -m "docs: mark mobile mechanic plan progress"
```

Expected: commit succeeds if the plan file changed.
