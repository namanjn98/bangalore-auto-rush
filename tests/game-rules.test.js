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

assert.equal(typeof hooks.shouldAllowDoubleSpawn, 'function');
assert.equal(hooks.shouldAllowDoubleSpawn(59999), false);
assert.equal(hooks.shouldAllowDoubleSpawn(60000), true);

assert.equal(typeof hooks.getHornChargeAfterAction, 'function');
assert.equal(hooks.getHornChargeAfterAction(0, 'jump'), 0.14);
assert.equal(hooks.getHornChargeAfterAction(0.9, 'brake'), 1);
assert.equal(hooks.getHornChargeAfterAction(0.2, 'tap'), 0.24);
assert.equal(hooks.getHornChargeAfterAction(0.2, 'unknown'), 0.2);

console.log('game-rules tests passed');
