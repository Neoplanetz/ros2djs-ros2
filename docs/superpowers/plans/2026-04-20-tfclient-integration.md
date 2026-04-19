# TFClient Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1.3.0 adding `ROS2D.SceneNode` and TF-aware `tfClient` integration across all 7 message-consuming components, preserving v1.2.1 behavior byte-for-byte when `tfClient` is omitted.

**Architecture:** Introduce a new public `ROS2D.SceneNode` (extends `createjs.Container`) that owns the single TF × pose composition and Y-negate location. Each client branches on `if (tfClient)` — the new branch wraps its visual(s) in a SceneNode; the old branch is untouched.

**Tech Stack:** ES5 (ESLint `ecmaVersion: 5`; no `let`/`const`/arrow/class/template-literal/`Map`/`Set`), `createjs-module` for display objects, `roslib@^2.1.0` for `BaseTFClient`/`Pose.applyTransform`, `vitest@^4` for tests, Grunt `transpile`/`lint` + Rollup build. Commit flow requires `npx grunt transpile` to regenerate `src-esm/` before every `check:transpile`.

**Reference spec:** `docs/superpowers/specs/2026-04-19-tfclient-integration-design.md`

---

## Conventions to follow in every task

1. **Edit `src/` only** — `src-esm/` is transpile output. Running `npx grunt transpile` syncs it.
2. **ES5 syntax** — `var` only, no arrow functions, no classes, no `let`/`const`, no template literals, no `Map`/`Set`. Use `Object.prototype.hasOwnProperty.call(obj, key)` over `obj.hasOwnProperty(key)`.
3. **Inheritance pattern** (used across the library): `createjs.X.call(this); … Object.setPrototypeOf(ROS2D.Foo.prototype, createjs.X.prototype);` at the end of the file.
4. **No external module imports inside `src/*.js`** — the transpiler only auto-injects `EventEmitter`, `ROSLIB`, and `createjs`.
5. **ROS coordinates inside a SceneNode subtree** — children render with `y` positive (no negate). The Y-negate happens exactly once on the SceneNode.
6. **Verification pipeline** — after every task that touches `src/`:
   ```
   npx grunt transpile       # sync src-esm/
   npx grunt lint            # ES5 enforcement
   npm test                  # vitest
   npm run check:transpile   # drift guard
   ```
   `npm run build` only on tasks that change public exports (Tasks 2, 14) and at release (Task 15).
7. **Commit messages** — `feat(<area>): <imperative>` or `test(<area>): …`. Include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.
8. **Do not modify existing tests** — only add new cases. Exceptions are called out explicitly (one test removal in Task 7).

---

## File Structure

**Files to create:**
- `test/visualization/SceneNode.test.js`

**Files to rewrite (existing is dead ros3djs port):**
- `src/visualization/SceneNode.js`

**Files to modify:**
- `test/fakes/fakeRoslib.js` — add `FakeTFClient`
- `es6-support/index.js` — uncomment `./visualization/SceneNode` export
- `src/markers/Marker.js` — `applyPose` option
- `src/markers/MarkerArrayClient.js` — real `tfClient` integration
- `src/clients/PathClient.js` — lazy SceneNode
- `src/clients/PoseStampedClient.js` — lazy SceneNode + `setPose`
- `src/clients/OdometryClient.js` — lazy SceneNode + `setPose`
- `src/clients/PoseArrayClient.js` — lazy SceneNode + Y-negate branch
- `src/maps/OccupancyGridClient.js` — lazy SceneNode wrap
- `test/markers/Marker.test.js` — add `applyPose` cases
- `test/markers/MarkerArrayClient.test.js` — replace "warn" test with real integration cases
- `test/clients/PathClient.test.js` — add TF path cases
- `test/clients/PoseStampedClient.test.js` — add TF path cases
- `test/clients/OdometryClient.test.js` — add TF path cases
- `test/clients/PoseArrayClient.test.js` — add TF path cases (Y-negate branch)
- `test/maps/OccupancyGridClient.test.js` — add TF path case (multi-robot `/robot_0/map`)
- `src/Ros2D.js` — REVISION bump (release)
- `package.json` — version bump (release)

---

## Task 1: Extend fakeRoslib with FakeTFClient

**Files:**
- Modify: `test/fakes/fakeRoslib.js`

**Why:** All subsequent tests consume `ROSLIB.TFClient` through this fake. Land the infrastructure first so every later task can import it.

- [ ] **Step 1: Read current `test/fakes/fakeRoslib.js`** — confirm it exports `createFakeRoslib()` returning `{ ROSLIB, topics, services, publishedByTopic }`.

- [ ] **Step 2: Add `FakeTFClient` inside `createFakeRoslib`**

Add just before the `const ROSLIB = { ... }` block:

```js
  class FakeTFClient {
    constructor(opts) {
      this.opts = opts || {};
      this.fixedFrame = this.opts.fixedFrame || 'base_link';
      // frameID -> array of callbacks
      this._subs = new Map();
    }
    subscribe(frameID, cb) {
      if (!this._subs.has(frameID)) { this._subs.set(frameID, []); }
      this._subs.get(frameID).push(cb);
    }
    unsubscribe(frameID, cb) {
      const arr = this._subs.get(frameID);
      if (!arr) { return; }
      const i = arr.indexOf(cb);
      if (i >= 0) { arr.splice(i, 1); }
    }
    // Test helper: dispatch a Transform to every subscriber of frameID.
    __emit(frameID, transform) {
      const arr = this._subs.get(frameID);
      if (!arr) { return; }
      // Copy so callbacks that unsubscribe during dispatch are safe.
      arr.slice().forEach((cb) => cb(transform));
    }
    // Test helper: count live subscribers on a frame.
    __subscriberCount(frameID) {
      const arr = this._subs.get(frameID);
      return arr ? arr.length : 0;
    }
  }
```

Then extend the `ROSLIB` literal to expose it:

```js
  const ROSLIB = {
    Ros: FakeRos,
    Topic: FakeTopic,
    Service: FakeService,
    TFClient: FakeTFClient,
    ROS2TFClient: FakeTFClient,
  };
```

(`ROS2TFClient` points at the same class because the contract our code depends on — `subscribe`/`unsubscribe`/`fixedFrame` — is identical between `TFClient` and `ROS2TFClient`.)

- [ ] **Step 3: Return `FakeTFClient` so tests can instantiate it directly**

Change the final `return`:

```js
  return { ROSLIB, topics, services, publishedByTopic, FakeTFClient };
```

- [ ] **Step 4: Run the existing test suite to confirm no regressions**

Run: `npm test`
Expected: all current tests pass (the fake is a superset; no existing test reads `FakeTFClient`).

- [ ] **Step 5: Commit**

```bash
git add test/fakes/fakeRoslib.js
git commit -m "$(cat <<'EOF'
test(fakes): add FakeTFClient to fakeRoslib

Provides subscribe/unsubscribe/fixedFrame contract plus __emit and
__subscriberCount helpers so upcoming SceneNode + tfClient tests can
drive TF transforms without real roslib.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SceneNode — constructor, TF subscription, visibility

**Files:**
- Test: `test/visualization/SceneNode.test.js` (create)
- Implement: `src/visualization/SceneNode.js` (rewrite — current file is dead ros3djs code using `THREE.Object3D`)
- Export: `es6-support/index.js` (uncomment existing commented-out line)

**Why:** Establish the minimal SceneNode that subscribes on construction, stays hidden until first TF, and composes the transform correctly. `setPose` / `setFrame` / `unsubscribe` come in Tasks 3–4.

- [ ] **Step 1: Create the failing test file**

Create `test/visualization/SceneNode.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventEmitter from 'eventemitter3';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';

const fake = createFakeRoslib();

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
  this.scaleX = 1; this.scaleY = 1;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.removeChild = function(c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); }
};

globalThis.createjs = { Container: FakeContainer };
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
// Match the sign convention used by the real Ros2D helper so tests can
// reason about rotation independently of quaternion internals.
globalThis.ROS2D.quaternionToGlobalTheta = function(q) {
  // return yaw in degrees, negated for canvas clockwise-positive rotation.
  var siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  var cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return -Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;
};

await import('../../src/visualization/SceneNode.js');

const SceneNode = globalThis.ROS2D.SceneNode;
const identityPose = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};
const identityTransform = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};

afterEach(() => { vi.useRealTimers(); });

describe('ROS2D.SceneNode', () => {
  it('is hidden on construction until the first TF callback arrives', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    expect(node.visible).toBe(false);
  });

  it('subscribes to the given frame on construction', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    new SceneNode({ tfClient: tf, frame_id: 'base_link' });
    expect(tf.__subscriberCount('base_link')).toBe(1);
  });

  it('becomes visible after the first TF callback', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    tf.__emit('base_link', identityTransform);
    expect(node.visible).toBe(true);
  });

  it('applies Y-negate exactly once (translation y=1 => node.y=-1)', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    tf.__emit('base_link', {
      translation: { x: 2, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(node.x).toBe(2);
    expect(node.y).toBe(-1);
    expect(node.rotation).toBe(0);
  });

  it('attaches options.object as a child', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const child = { __stub: true };
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', object: child });
    expect(node.children).toContain(child);
  });

  it('throws if tfClient is missing', () => {
    expect(() => new SceneNode({ frame_id: 'base_link' })).toThrow(/tfClient/);
  });

  it('throws if frame_id is missing', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    expect(() => new SceneNode({ tfClient: tf })).toThrow(/frame_id/);
  });

  it('composes pose + transform (translation only) correctly', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({
      tfClient: tf,
      frame_id: 'base_link',
      pose: {
        position: { x: 1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    tf.__emit('base_link', {
      translation: { x: 10, y: 20, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    // pose.position + tf.translation = (11, 22, 0). Y negated for canvas.
    expect(node.x).toBe(11);
    expect(node.y).toBe(-22);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: fails importing `src/visualization/SceneNode.js` because the current file uses `THREE.Object3D` which the test's `globalThis` does not provide, or fails at `new SceneNode(...)`.

- [ ] **Step 3: Rewrite `src/visualization/SceneNode.js`**

Replace the entire file with:

```js
/**
 * @fileOverview
 * A createjs.Container whose position/orientation is driven by a
 * ROSLIB.TFClient (or ROSLIB.ROS2TFClient). On construction the node
 * subscribes to tfClient for the given frame_id and stays hidden until
 * the first TF callback arrives. Each callback composes TF x pose and
 * writes the result into this.x/.y/.rotation. The Y-negate that maps ROS
 * +Y up to canvas +Y down happens here, and here only, on the TF path.
 *
 * All child display objects of a SceneNode should therefore be laid out
 * in ROS coordinates (no y negation).
 *
 * @constructor
 * @param options
 *   * tfClient (required) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
 *   * frame_id (required) - the TF frame this node lives in
 *   * pose (optional)     - geometry_msgs/Pose within frame_id. Default identity.
 *   * object (optional)   - a createjs.DisplayObject to add as a child
 */
ROS2D.SceneNode = function(options) {
  createjs.Container.call(this);
  options = options || {};
  if (!options.tfClient) {
    throw new Error('ROS2D.SceneNode: options.tfClient is required');
  }
  if (!options.frame_id) {
    throw new Error('ROS2D.SceneNode: options.frame_id is required');
  }
  var that = this;

  this.tfClient = options.tfClient;
  this.frame_id = options.frame_id;
  this.pose = options.pose || {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  };

  // Latest TF cached by our own callback; no reliance on BaseTFClient internals.
  this._latestTf = null;

  this.visible = false;

  if (options.object) {
    this.addChild(options.object);
  }

  this._onTF = function(transform) {
    that._latestTf = transform;
    that._applyLatest();
    that.visible = true;
  };

  this.tfClient.subscribe(this.frame_id, this._onTF);
};

/**
 * Compose this.pose with this._latestTf and write the result to x/y/rotation.
 * Y is negated here and here only so children render in ROS coordinates.
 * @private
 */
ROS2D.SceneNode.prototype._applyLatest = function() {
  if (!this._latestTf) {
    return;
  }
  // Clone pose to avoid mutating user-supplied objects. ROSLIB.Pose.applyTransform
  // does the 3D composition; we then map to 2D canvas.
  var p = new ROSLIB.Pose({
    position: {
      x: this.pose.position.x,
      y: this.pose.position.y,
      z: this.pose.position.z
    },
    orientation: {
      x: this.pose.orientation.x,
      y: this.pose.orientation.y,
      z: this.pose.orientation.z,
      w: this.pose.orientation.w
    }
  });
  p.applyTransform(this._latestTf);
  this.x = p.position.x;
  this.y = -p.position.y;
  this.rotation = ROS2D.quaternionToGlobalTheta(p.orientation);
};

Object.setPrototypeOf(ROS2D.SceneNode.prototype, createjs.Container.prototype);
```

- [ ] **Step 4: Add minimal `ROSLIB.Pose` stub to the test file**

The test does not pull real `roslibjs`, so extend the `globalThis.ROSLIB` assignment in the test. Insert after the existing `globalThis.ROSLIB = fake.ROSLIB;` line:

```js
// Minimal ROSLIB.Pose stub: stores fields and does transform composition
// equivalent to the real roslibjs implementation (translation add + rotation
// composition). Only used inside SceneNode._applyLatest.
globalThis.ROSLIB.Pose = function(options) {
  this.position = {
    x: options.position.x, y: options.position.y, z: options.position.z
  };
  this.orientation = {
    x: options.orientation.x, y: options.orientation.y,
    z: options.orientation.z, w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  // Rotate position by tf.rotation, then add tf.translation.
  var q = tf.rotation;
  var p = this.position;
  var ix =  q.w * p.x + q.y * p.z - q.z * p.y;
  var iy =  q.w * p.y + q.z * p.x - q.x * p.z;
  var iz =  q.w * p.z + q.x * p.y - q.y * p.x;
  var iw = -q.x * p.x - q.y * p.y - q.z * p.z;
  this.position = {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
  };
  this.position.x += tf.translation.x;
  this.position.y += tf.translation.y;
  this.position.z += tf.translation.z;
  // Compose orientation: tf.rotation * this.orientation.
  var r = tf.rotation;
  var o = this.orientation;
  this.orientation = {
    x: r.x * o.w + r.y * o.z - r.z * o.y + r.w * o.x,
    y:-r.x * o.z + r.y * o.w + r.z * o.x + r.w * o.y,
    z: r.x * o.y - r.y * o.x + r.z * o.w + r.w * o.z,
    w:-r.x * o.x - r.y * o.y - r.z * o.z + r.w * o.w
  };
};
```

- [ ] **Step 5: Run the test; it should pass**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: all 8 tests pass.

- [ ] **Step 6: Enable the export in `es6-support/index.js`**

Change line 34 from:

```js
// export * from './visualization/SceneNode'
```

to:

```js
export * from './visualization/SceneNode'
```

(Leave the other two commented lines — `LaserScan`, `Points` — alone. They are separate dead-code items not in scope.)

- [ ] **Step 7: Run the pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

All four must succeed.

- [ ] **Step 8: Commit**

```bash
git add src/visualization/SceneNode.js src-esm/visualization/SceneNode.js \
        test/visualization/SceneNode.test.js es6-support/index.js
git commit -m "$(cat <<'EOF'
feat(visualization): add ROS2D.SceneNode with TF-aware positioning

Replaces the dead ros3djs port (THREE.Object3D-based, never exported)
with a createjs.Container subclass that subscribes to a TFClient on
construction, stays hidden until the first transform arrives, and
owns the single Y-negate location on the TF render path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SceneNode.setPose — re-apply cached TF immediately

**Files:**
- Modify: `src/visualization/SceneNode.js`
- Modify: `test/visualization/SceneNode.test.js`

- [ ] **Step 1: Add failing tests**

Append inside the `describe('ROS2D.SceneNode', ...)` block:

```js
  it('setPose with no cached TF stores pose and stays hidden', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link' });
    node.setPose({
      position: { x: 5, y: 6, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(node.visible).toBe(false);
    expect(node.x).toBe(0); // unchanged
  });

  it('setPose with a cached TF re-applies immediately', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    tf.__emit('base_link', {
      translation: { x: 10, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(node.x).toBe(10);
    node.setPose({
      position: { x: 1, y: 2, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    });
    // pose.x + tf.translation.x = 11; pose.y negated = -2
    expect(node.x).toBe(11);
    expect(node.y).toBe(-2);
  });

  it('setPose(null) is treated as identity', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({
      tfClient: tf,
      frame_id: 'base_link',
      pose: { position: { x: 5, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    tf.__emit('base_link', {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    node.setPose(null);
    expect(node.x).toBe(0);
    expect(node.y).toBe(-0);
  });
```

- [ ] **Step 2: Run tests; they fail**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: new tests fail (`node.setPose is not a function`).

- [ ] **Step 3: Implement `setPose`**

Add before the final `Object.setPrototypeOf(...)` in `src/visualization/SceneNode.js`:

```js
/**
 * Update the local pose within frame_id. If a TF is already cached the
 * result is composed and applied immediately; otherwise the node waits
 * for the next TF callback.
 *
 * @param newPose - geometry_msgs/Pose or null (treated as identity)
 */
ROS2D.SceneNode.prototype.setPose = function(newPose) {
  if (newPose) {
    this.pose = {
      position: {
        x: newPose.position.x, y: newPose.position.y, z: newPose.position.z
      },
      orientation: {
        x: newPose.orientation.x, y: newPose.orientation.y,
        z: newPose.orientation.z, w: newPose.orientation.w
      }
    };
  } else {
    this.pose = {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 }
    };
  }
  if (this._latestTf) {
    this._applyLatest();
  }
};
```

- [ ] **Step 4: Run tests; they pass**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: all 11 tests pass.

- [ ] **Step 5: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 6: Commit**

```bash
git add src/visualization/SceneNode.js src-esm/visualization/SceneNode.js \
        test/visualization/SceneNode.test.js
git commit -m "$(cat <<'EOF'
feat(SceneNode): add setPose for cached-TF re-application

Callers driving high-frequency topics (Odometry, PoseStamped) now
reposition a long-lived SceneNode via setPose rather than recreating it
each message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: SceneNode.setFrame, unsubscribe, first-TF warning timer

**Files:**
- Modify: `src/visualization/SceneNode.js`
- Modify: `test/visualization/SceneNode.test.js`

- [ ] **Step 1: Add failing tests**

Append inside the existing `describe` block:

```js
  it('setFrame unsubscribes old frame and subscribes new one', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'old' });
    expect(tf.__subscriberCount('old')).toBe(1);
    node.setFrame('new');
    expect(tf.__subscriberCount('old')).toBe(0);
    expect(tf.__subscriberCount('new')).toBe(1);
    expect(node.frame_id).toBe('new');
  });

  it('setFrame resets visibility until the next TF arrives', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'old' });
    tf.__emit('old', identityTransform);
    expect(node.visible).toBe(true);
    node.setFrame('new');
    expect(node.visible).toBe(false);
    tf.__emit('new', identityTransform);
    expect(node.visible).toBe(true);
  });

  it('setFrame with the same frame is a no-op', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'same' });
    tf.__emit('same', identityTransform);
    const before = tf.__subscriberCount('same');
    node.setFrame('same');
    expect(tf.__subscriberCount('same')).toBe(before);
    expect(node.visible).toBe(true); // visibility preserved
  });

  it('unsubscribe detaches from TF and ignores later emits', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'f', pose: identityPose });
    node.unsubscribe();
    expect(tf.__subscriberCount('f')).toBe(0);
    tf.__emit('f', {
      translation: { x: 99, y: 99, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(node.x).toBe(0); // never updated
    expect(node.visible).toBe(false);
  });

  it('unsubscribe is idempotent', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'f' });
    node.unsubscribe();
    expect(() => node.unsubscribe()).not.toThrow();
  });

  it('warns once if no TF arrives within 1 second', () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    new SceneNode({ tfClient: tf, frame_id: 'missing' });
    vi.advanceTimersByTime(1001);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/missing/);
  });

  it('does not warn when a TF arrives before the timer fires', () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    new SceneNode({ tfClient: tf, frame_id: 'ok' });
    vi.advanceTimersByTime(500);
    tf.__emit('ok', identityTransform);
    vi.advanceTimersByTime(1000);
    expect(warn).not.toHaveBeenCalled();
  });

  it('two SceneNodes on different frames do not cross-contaminate', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const a = new SceneNode({ tfClient: tf, frame_id: 'map', pose: identityPose });
    const b = new SceneNode({ tfClient: tf, frame_id: 'robot_0/map', pose: identityPose });
    tf.__emit('map', {
      translation: { x: 1, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    tf.__emit('robot_0/map', {
      translation: { x: 5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(a.x).toBe(1);
    expect(b.x).toBe(5);
  });
```

- [ ] **Step 2: Run tests; they fail**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: 8 new failures.

- [ ] **Step 3: Implement `setFrame`, `unsubscribe`, warning timer**

In `src/visualization/SceneNode.js`:

a) Inside the constructor, **after** `this.tfClient.subscribe(this.frame_id, this._onTF);`, add:

```js
  // One-shot warning timer to surface frame_id typos without log spam.
  this._warnTimer = setTimeout(function() {
    if (!that._latestTf) {
      console.warn(
        'ROS2D.SceneNode: no TF received yet for frame \'' + that.frame_id +
        '\' (fixedFrame=' + (that.tfClient.fixedFrame || '?') +
        '); node will remain hidden until a transform arrives'
      );
    }
    that._warnTimer = null;
  }, 1000);
```

b) Inside `this._onTF`, as the first line (before `that._latestTf = transform;`), clear the timer:

```js
    if (that._warnTimer) { clearTimeout(that._warnTimer); that._warnTimer = null; }
```

c) Add `setFrame` and `unsubscribe` before the final `Object.setPrototypeOf`:

```js
/**
 * Change the TF frame this node tracks. Unsubscribes from the old frame,
 * subscribes to the new one, and hides the node until the next TF arrives.
 * A no-op if newFrameId equals the current frame.
 *
 * @param newFrameId - the new TF frame id
 */
ROS2D.SceneNode.prototype.setFrame = function(newFrameId) {
  if (newFrameId === this.frame_id) { return; }
  if (this._onTF) {
    this.tfClient.unsubscribe(this.frame_id, this._onTF);
  }
  this.frame_id = newFrameId;
  this._latestTf = null;
  this.visible = false;
  this.tfClient.subscribe(this.frame_id, this._onTF);
};

/**
 * Detach from TF. Safe to call multiple times.
 */
ROS2D.SceneNode.prototype.unsubscribe = function() {
  if (this._warnTimer) { clearTimeout(this._warnTimer); this._warnTimer = null; }
  if (this._onTF) {
    this.tfClient.unsubscribe(this.frame_id, this._onTF);
    this._onTF = null;
  }
};
```

- [ ] **Step 4: Run tests; they pass**

Run: `npx vitest run test/visualization/SceneNode.test.js`
Expected: all 19 SceneNode tests pass.

- [ ] **Step 5: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 6: Commit**

```bash
git add src/visualization/SceneNode.js src-esm/visualization/SceneNode.js \
        test/visualization/SceneNode.test.js
git commit -m "$(cat <<'EOF'
feat(SceneNode): add setFrame, unsubscribe, first-TF warning timer

Enables clients to swap a node's frame mid-session, propagate their own
unsubscribe() cleanly, and surface frame_id typos via a one-shot
1-second console.warn instead of silently staying hidden.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Marker.applyPose option

**Files:**
- Modify: `src/markers/Marker.js`
- Modify: `test/markers/Marker.test.js`

- [ ] **Step 1: Add failing tests** to `test/markers/Marker.test.js`

Find the existing `describe('ROS2D.Marker', ...)` block and append:

```js
  it('with applyPose:true (default) sets x/y/rotation from message.pose', () => {
    const m = new Marker({
      message: {
        type: 1, action: 0, ns: '', id: 0,
        header: { frame_id: 'map' },
        pose: {
          position: { x: 3, y: 4, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        scale: { x: 1, y: 1, z: 1 },
        color: { r: 1, g: 1, b: 1, a: 1 },
      },
    });
    expect(m.x).toBe(3);
    expect(m.y).toBe(-4);
  });

  it('with applyPose:false leaves x/y/rotation at container defaults', () => {
    const m = new Marker({
      applyPose: false,
      message: {
        type: 1, action: 0, ns: '', id: 0,
        header: { frame_id: 'map' },
        pose: {
          position: { x: 3, y: 4, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
        scale: { x: 1, y: 1, z: 1 },
        color: { r: 1, g: 1, b: 1, a: 1 },
      },
    });
    expect(m.x).toBe(0);
    expect(m.y).toBe(0);
    expect(m.rotation).toBe(0);
  });
```

- [ ] **Step 2: Run tests; the applyPose:false case fails**

Run: `npx vitest run test/markers/Marker.test.js`
Expected: the new case fails (`m.x` is 3, not 0) because `Marker.js` always sets x/y/rotation.

- [ ] **Step 3: Implement `applyPose` option in `src/markers/Marker.js`**

Find the three-line block at the end of the constructor:

```js
  this.x = pose.position.x;
  this.y = -pose.position.y;
  this.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation);
```

Wrap it:

```js
  // Default true: preserve v1.2 behavior. MarkerArrayClient passes false
  // when the marker is wrapped in a ROS2D.SceneNode that positions it.
  var applyPose = options.applyPose !== false;
  if (applyPose) {
    this.x = pose.position.x;
    this.y = -pose.position.y;
    this.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation);
  }
```

Also update the JSDoc `@param options` block at the top of the file to document `options.applyPose`:

```
 *   * applyPose (optional, default true) - when false the marker does not
 *       set its own x/y/rotation; the caller (typically ROS2D.SceneNode)
 *       positions the marker externally
```

- [ ] **Step 4: Run tests; they pass**

Run: `npx vitest run test/markers/Marker.test.js`
Expected: all Marker tests pass.

- [ ] **Step 5: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 6: Commit**

```bash
git add src/markers/Marker.js src-esm/markers/Marker.js test/markers/Marker.test.js
git commit -m "$(cat <<'EOF'
feat(Marker): add applyPose option for external pose control

Default true preserves v1.2 behavior. MarkerArrayClient will pass
false when wrapping the marker in a ROS2D.SceneNode so the SceneNode
owns positioning.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: MarkerArrayClient — tfClient integration

**Files:**
- Modify: `src/markers/MarkerArrayClient.js`
- Modify: `test/markers/MarkerArrayClient.test.js`

**Why this task is larger:** this is the only client where the new behavior replaces an existing stub rather than adding to an inert path.

- [ ] **Step 1: Update the test file's `globalThis` block** (the file already defines `FakeContainer`, fake `createjs`, etc.) to also pull the SceneNode module.

Near the top, just before `await import('../../src/markers/Marker.js');`, add:

```js
// SceneNode uses ROSLIB.Pose; stub it the same way SceneNode.test does.
globalThis.ROSLIB.Pose = function(options) {
  this.position = {
    x: options.position.x, y: options.position.y, z: options.position.z
  };
  this.orientation = {
    x: options.orientation.x, y: options.orientation.y,
    z: options.orientation.z, w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  this.position = {
    x: this.position.x + tf.translation.x,
    y: this.position.y + tf.translation.y,
    z: this.position.z + tf.translation.z,
  };
  // Orientation composition not needed for these tests (tf rotation = identity).
};

await import('../../src/visualization/SceneNode.js');
```

(The full quaternion math is not exercised by these tests — identity rotations throughout — so an abbreviated `applyTransform` is sufficient here. The full version lives in `SceneNode.test.js`.)

- [ ] **Step 2: Replace the existing "warns when tfClient supplied" test**

Delete lines 101-105 (the `it('warns when tfClient option is supplied …')` block). Replace with:

```js
  it('with tfClient: each ADD creates a SceneNode wrapping a Marker({applyPose:false})', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(root.children).toHaveLength(1);
    // The child is the SceneNode; the Marker is inside it.
    const node = root.children[0];
    expect(node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(node.frame_id).toBe('map');
    expect(client.markers['a:1']).toBeDefined();
    expect(tf.__subscriberCount('map')).toBe(1);
  });

  it('with tfClient: DELETE unsubscribes the SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(tf.__subscriberCount('map')).toBe(1);
    topic.__emit({ markers: [cubeMsg('a', 1, 2)] }); // DELETE
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(client.markers['a:1']).toBeUndefined();
  });

  it('with tfClient: DELETEALL unsubscribes every SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('b', 2, 0)] });
    expect(tf.__subscriberCount('map')).toBe(2);
    topic.__emit({ markers: [cubeMsg('', 0, 3)] }); // DELETEALL
    expect(tf.__subscriberCount('map')).toBe(0);
  });

  it('with tfClient: unsubscribe() drops all SceneNode subscriptions', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('b', 2, 0)] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(root.children).toHaveLength(0);
  });

  it('with tfClient: multi-frame markers subscribe separately', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    const m1 = cubeMsg('a', 1, 0); m1.header.frame_id = 'map';
    const m2 = cubeMsg('b', 2, 0); m2.header.frame_id = 'robot_0/map';
    topic.__emit({ markers: [m1, m2] });
    expect(tf.__subscriberCount('map')).toBe(1);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('without tfClient: existing rootObject-frame behavior is unchanged', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    // No SceneNode wrapping — the direct child is a Marker.
    const child = root.children[0];
    expect(child).not.toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.markers['a:1']).toBeDefined();
  });
```

- [ ] **Step 3: Run tests; they fail**

Run: `npx vitest run test/markers/MarkerArrayClient.test.js`
Expected: 6 new failures plus no current regressions.

- [ ] **Step 4: Rewrite `_handleMarker` and remove the warn stub in `src/markers/MarkerArrayClient.js`**

Delete this block in the constructor:

```js
  if (options.tfClient) {
    console.warn(
      'ROS2D.MarkerArrayClient: tfClient option is reserved but not yet implemented; frame_id will be ignored.'
    );
  }
```

Add `this.tfClient = options.tfClient || null;` near the other field inits.

Replace the ADD/MODIFY body of `_handleMarker` (the block starting at `this._removeMarker(key);` after the `// ADD or MODIFY` comment). The full new `_handleMarker` body:

```js
ROS2D.MarkerArrayClient.prototype._handleMarker = function(m) {
  // DELETEALL
  if (m.action === 3) {
    this._clearAll();
    return;
  }
  var key = (m.ns || '') + ':' + m.id;
  // DELETE
  if (m.action === 2) {
    this._removeMarker(key);
    return;
  }
  // ADD or MODIFY
  this._removeMarker(key);
  var child;
  var sceneNode = null;
  if (this.tfClient) {
    var shape = new ROS2D.Marker({ message: m, applyPose: false });
    sceneNode = new ROS2D.SceneNode({
      tfClient: this.tfClient,
      frame_id: (m.header && m.header.frame_id) || '',
      pose: m.pose,
      object: shape
    });
    child = sceneNode;
  } else {
    child = new ROS2D.Marker({ message: m });
  }
  this.rootObject.addChild(child);
  var entry = { obj: child, node: sceneNode, timer: null };
  var lifeSec = (m.lifetime && m.lifetime.sec) || 0;
  var lifeNs = (m.lifetime && m.lifetime.nanosec) || 0;
  if (lifeSec > 0 || lifeNs > 0) {
    var ms = lifeSec * 1000 + lifeNs / 1e6;
    var that = this;
    entry.timer = setTimeout(function() {
      if (that.markers[key] === entry) {
        that._removeMarker(key);
        that.emit('change');
      }
    }, ms);
  }
  this.markers[key] = entry;
};
```

Update `_removeMarker` and `_clearAll` to unsubscribe when a SceneNode is present:

```js
ROS2D.MarkerArrayClient.prototype._removeMarker = function(key) {
  var entry = this.markers[key];
  if (!entry) { return; }
  if (entry.timer) { clearTimeout(entry.timer); }
  if (entry.node) { entry.node.unsubscribe(); }
  this.rootObject.removeChild(entry.obj);
  delete this.markers[key];
};

ROS2D.MarkerArrayClient.prototype._clearAll = function() {
  for (var k in this.markers) {
    if (Object.prototype.hasOwnProperty.call(this.markers, k)) {
      var entry = this.markers[k];
      if (entry.timer) { clearTimeout(entry.timer); }
      if (entry.node) { entry.node.unsubscribe(); }
      this.rootObject.removeChild(entry.obj);
    }
  }
  this.markers = {};
};
```

Update the file header JSDoc to reflect that `tfClient` is now implemented.

- [ ] **Step 5: Run tests; they pass**

Run: `npx vitest run test/markers/MarkerArrayClient.test.js`
Expected: all pass.

- [ ] **Step 6: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 7: Commit**

```bash
git add src/markers/MarkerArrayClient.js src-esm/markers/MarkerArrayClient.js \
        test/markers/MarkerArrayClient.test.js
git commit -m "$(cat <<'EOF'
feat(MarkerArrayClient): integrate tfClient via SceneNode

Replaces the v1.2 warn stub with real per-marker SceneNode wrapping.
Each marker subscribes on its own header.frame_id so multi-robot arrays
with mixed frames (e.g. /robot_0/map) render correctly. DELETE,
DELETEALL, and unsubscribe() all propagate to SceneNode.unsubscribe().

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: PathClient — lazy SceneNode

**Files:**
- Modify: `src/clients/PathClient.js`
- Modify: `test/clients/PathClient.test.js`

- [ ] **Step 1: Update the test file's `globalThis` block** to include `SceneNode` and the ROSLIB.Pose stub.

At the top of `test/clients/PathClient.test.js`, just before the existing `await import('../../src/clients/PathClient.js');` line (or its equivalent; adjust if the file uses a different import pattern), add the same ROSLIB.Pose stub and `await import('../../src/visualization/SceneNode.js');` pattern used in Task 6 Step 1. Also stub `ROS2D.PathShape` as a FakeContainer-derived constructor if not already present.

Examine the existing file first to see how it sets up the globals. The goal is: by the time `PathClient.js` is imported, `globalThis.ROS2D.SceneNode` exists and `globalThis.ROSLIB.Pose` is a working stub.

- [ ] **Step 2: Add failing tests**

Append inside the existing `describe('ROS2D.PathClient', ...)` block:

```js
  it('with tfClient: first message creates a SceneNode wrapping pathShape', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    // Before any message the SceneNode does not exist yet.
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('map');
    // pathShape is inside the SceneNode, not directly on rootObject.
    expect(root.children).toContain(client.node);
    expect(root.children).not.toContain(client.pathShape);
  });

  it('with tfClient: frame_id change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(1);
    topic.__emit({ header: { frame_id: 'robot_0/map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
    expect(client.node.frame_id).toBe('robot_0/map');
  });

  it('with tfClient: unsubscribe() detaches from TF', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
  });

  it('without tfClient: pathShape is added directly to rootObject (unchanged)', () => {
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    expect(root.children).toContain(client.pathShape);
    expect(client.node).toBeFalsy();
  });
```

- [ ] **Step 3: Run tests; they fail**

Run: `npx vitest run test/clients/PathClient.test.js`
Expected: 4 new failures.

- [ ] **Step 4: Implement in `src/clients/PathClient.js`**

Full rewritten constructor and `unsubscribe`:

```js
ROS2D.PathClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/path';
  this.rootObject = options.rootObject || new createjs.Container();
  this.tfClient = options.tfClient || null;

  this.pathShape = new ROS2D.PathShape({
    strokeSize: options.strokeSize,
    strokeColor: options.strokeColor
  });
  this.node = null;

  if (!this.tfClient) {
    // Default path: attach pathShape directly, as in v1.2.
    this.rootObject.addChild(this.pathShape);
  }

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'nav_msgs/Path'
  });

  this.rosTopic.subscribe(function(message) {
    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.pathShape
        });
        that.rootObject.addChild(that.node);
      } else if (that.node.frame_id !== frame) {
        that.node.setFrame(frame);
      }
    }
    that.pathShape.setPath(message);
    that.emit('change');
  });
};

ROS2D.PathClient.prototype.unsubscribe = function() {
  if (this.rosTopic) { this.rosTopic.unsubscribe(); }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.pathShape && this.rootObject) {
    this.rootObject.removeChild(this.pathShape);
  }
};
```

- [ ] **Step 5: Run tests; they pass**

Run: `npx vitest run test/clients/PathClient.test.js`
Expected: all pass.

- [ ] **Step 6: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 7: Commit**

```bash
git add src/clients/PathClient.js src-esm/clients/PathClient.js \
        test/clients/PathClient.test.js
git commit -m "$(cat <<'EOF'
feat(PathClient): integrate tfClient via lazy SceneNode

First message creates a SceneNode from message.header.frame_id. Frame
changes across messages propagate through setFrame. No tfClient =
existing direct-attach path unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: PoseStampedClient — lazy SceneNode + setPose

**Files:**
- Modify: `src/clients/PoseStampedClient.js`
- Modify: `test/clients/PoseStampedClient.test.js`

- [ ] **Step 1: Extend the test file's `globalThis` block** the same way Task 7 did: add ROSLIB.Pose stub and import `../../src/visualization/SceneNode.js` before importing `PoseStampedClient.js`.

- [ ] **Step 2: Add failing tests**

Append inside the existing `describe('ROS2D.PoseStampedClient', ...)` block:

```js
  it('with tfClient: first message creates SceneNode wrapping the marker', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: {
        position: { x: 1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('map');
    expect(client.node.pose.position.x).toBe(1);
    expect(client.node.pose.position.y).toBe(2);
    // The marker itself stays at origin; SceneNode does positioning.
    expect(client.marker.x).toBe(0);
    expect(client.marker.y).toBe(0);
  });

  it('with tfClient: subsequent messages call setPose, not recreate', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: {
        position: { x: 1, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    const firstNode = client.node;
    topic.__emit({
      header: { frame_id: 'map' },
      pose: {
        position: { x: 5, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    expect(client.node).toBe(firstNode);
    expect(client.node.pose.position.x).toBe(5);
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    topic.__emit({
      header: { frame_id: 'robot_0/map' },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    expect(client.node.frame_id).toBe('robot_0/map');
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('without tfClient: marker x/y set directly (unchanged)', () => {
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(),
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 7, y: 3, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    expect(client.marker.x).toBe(7);
    expect(client.marker.y).toBe(-3);
    expect(client.node).toBeFalsy();
  });
```

- [ ] **Step 3: Run tests; they fail**

Run: `npx vitest run test/clients/PoseStampedClient.test.js`

- [ ] **Step 4: Modify `src/clients/PoseStampedClient.js`**

Inside the constructor, before `this.rosTopic = new ROSLIB.Topic(...)`, add field inits:

```js
  this.tfClient = options.tfClient || null;
  this.node = null;
```

Branch the existing `rootObject.addChild(this.marker);` line:

```js
  if (!this.tfClient) {
    this.rootObject.addChild(this.marker);
  }
  // tfClient path: we add the SceneNode on first message instead.
```

Replace the subscribe body:

```js
  this.rosTopic.subscribe(function(message) {
    var pose = message && message.pose;
    if (!pose || !pose.position) { return; }
    if (that.tfClient) {
      var frame = (message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          pose: pose,
          object: that.marker
        });
        that.rootObject.addChild(that.node);
      } else {
        if (that.node.frame_id !== frame) { that.node.setFrame(frame); }
        that.node.setPose(pose);
      }
      // Marker stays at origin; SceneNode positions it.
    } else {
      that.marker.x = pose.position.x;
      that.marker.y = -pose.position.y;
      that.marker.rotation = ROS2D.quaternionToGlobalTheta(
        pose.orientation || { x: 0, y: 0, z: 0, w: 1 }
      );
      that.marker.visible = true;
    }
    that.emit('change');
  });
```

Update `unsubscribe` to unsubscribe the node and remove the right child:

```js
ROS2D.PoseStampedClient.prototype.unsubscribe = function() {
  if (this.rosTopic) { this.rosTopic.unsubscribe(); }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.marker && this.rootObject) {
    this.rootObject.removeChild(this.marker);
  }
};
```

- [ ] **Step 5: Run tests; they pass**

Run: `npx vitest run test/clients/PoseStampedClient.test.js`

- [ ] **Step 6: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 7: Commit**

```bash
git add src/clients/PoseStampedClient.js src-esm/clients/PoseStampedClient.js \
        test/clients/PoseStampedClient.test.js
git commit -m "$(cat <<'EOF'
feat(PoseStampedClient): integrate tfClient via lazy SceneNode

Long-lived SceneNode per client; setPose on each message, setFrame on
frame changes. No tfClient = existing direct-marker path unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: OdometryClient — lazy SceneNode + setPose

**Files:**
- Modify: `src/clients/OdometryClient.js`
- Modify: `test/clients/OdometryClient.test.js`

Identical pattern to Task 8. The only difference is that `nav_msgs/Odometry` nests `pose` one level deeper — `message.pose.pose` is the `geometry_msgs/Pose`.

- [ ] **Step 1: Extend test file globals** (same as Task 8 Step 1).

- [ ] **Step 2: Add failing tests** — clone Task 8 Step 2 tests and adjust messages:

```js
function odomMsg(frame, x, y) {
  return {
    header: { frame_id: frame },
    pose: {
      pose: {
        position: { x: x, y: y, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      covariance: new Array(36).fill(0),
    },
  };
}
```

Then the four tests:

```js
  it('with tfClient: first message creates SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 1, 2));
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('odom');
    expect(client.node.pose.position.y).toBe(2);
    expect(client.marker.x).toBe(0);
  });

  it('with tfClient: subsequent messages call setPose', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 1, 0));
    const first = client.node;
    topic.__emit(odomMsg('odom', 9, 0));
    expect(client.node).toBe(first);
    expect(client.node.pose.position.x).toBe(9);
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 0, 0));
    topic.__emit(odomMsg('robot_0/odom', 0, 0));
    expect(tf.__subscriberCount('odom')).toBe(0);
    expect(tf.__subscriberCount('robot_0/odom')).toBe(1);
  });

  it('without tfClient: marker x/y set directly (unchanged)', () => {
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(),
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 7, 3));
    expect(client.marker.x).toBe(7);
    expect(client.marker.y).toBe(-3);
    expect(client.node).toBeFalsy();
  });
```

- [ ] **Step 3: Run; fail.** `npx vitest run test/clients/OdometryClient.test.js`

- [ ] **Step 4: Modify `src/clients/OdometryClient.js`**

Same structural changes as PoseStampedClient (Task 8 Step 4). In the subscribe callback, extract the pose one level deeper:

```js
  this.rosTopic.subscribe(function(message) {
    var pose = message && message.pose && message.pose.pose;
    if (!pose || !pose.position) { return; }
    if (that.tfClient) {
      var frame = (message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          pose: pose,
          object: that.marker
        });
        that.rootObject.addChild(that.node);
      } else {
        if (that.node.frame_id !== frame) { that.node.setFrame(frame); }
        that.node.setPose(pose);
      }
    } else {
      that.marker.x = pose.position.x;
      that.marker.y = -pose.position.y;
      that.marker.rotation = ROS2D.quaternionToGlobalTheta(
        pose.orientation || { x: 0, y: 0, z: 0, w: 1 }
      );
      that.marker.visible = true;
    }
    that.emit('change');
  });
```

Add the same field inits (`this.tfClient`, `this.node`), branch the initial `addChild`, and update `unsubscribe` in the same shape as PoseStampedClient.

- [ ] **Step 5: Run; pass.** `npx vitest run test/clients/OdometryClient.test.js`

- [ ] **Step 6: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 7: Commit**

```bash
git add src/clients/OdometryClient.js src-esm/clients/OdometryClient.js \
        test/clients/OdometryClient.test.js
git commit -m "$(cat <<'EOF'
feat(OdometryClient): integrate tfClient via lazy SceneNode

Same lazy + setPose pattern as PoseStampedClient; extracts
message.pose.pose for the geometry_msgs/Pose. No tfClient = unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: PoseArrayClient — lazy SceneNode + Y-negate branch

**Files:**
- Modify: `src/clients/PoseArrayClient.js`
- Modify: `test/clients/PoseArrayClient.test.js`

**Special note:** PoseArrayClient is the only client with a Y-negate branch. On the TF path, child arrows must NOT negate their y because the outer SceneNode does it.

- [ ] **Step 1: Extend test globals** as in Task 7/8/9.

- [ ] **Step 2: Add failing tests**

```js
  it('with tfClient: first message creates outer SceneNode wrapping the container', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      poses: [
        { position: { x: 1, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      ],
    });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    // The arrow inside the SceneNode's container keeps ROS y (not negated).
    const arrow = client.container.children[0];
    expect(arrow.x).toBe(1);
    expect(arrow.y).toBe(2);          // ROS y, not -y
  });

  it('without tfClient: arrows still use -y (unchanged)', () => {
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      poses: [
        { position: { x: 1, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      ],
    });
    const arrow = client.container.children[0];
    expect(arrow.x).toBe(1);
    expect(arrow.y).toBe(-2);
    expect(client.node).toBeFalsy();
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    topic.__emit({ header: { frame_id: 'robot_0/map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('with tfClient: unsubscribe detaches from TF', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
  });
```

- [ ] **Step 3: Fail.** `npx vitest run test/clients/PoseArrayClient.test.js`

- [ ] **Step 4: Modify `src/clients/PoseArrayClient.js`**

Add field inits:

```js
  this.tfClient = options.tfClient || null;
  this.node = null;
```

Change the initial `this.rootObject.addChild(this.container);` to:

```js
  if (!this.tfClient) {
    this.rootObject.addChild(this.container);
  }
```

Modify the subscribe to wrap the container lazily and pass the frame to `_render`:

```js
  this.rosTopic.subscribe(function(message) {
    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.container
        });
        that.rootObject.addChild(that.node);
      } else if (that.node.frame_id !== frame) {
        that.node.setFrame(frame);
      }
    }
    that._render(message);
    that.emit('change');
  });
```

Modify `_render` to branch Y-negate:

```js
ROS2D.PoseArrayClient.prototype._render = function(message) {
  this._clearContainer();
  var poses = (message && message.poses) || [];
  var negateY = !this.tfClient; // SceneNode handles negation on TF path
  for (var i = 0; i < poses.length; i++) {
    var pose = poses[i];
    if (!pose || !pose.position) { continue; }
    var arrow = new ROS2D.NavigationArrow(this._arrowOptions);
    arrow.x = pose.position.x;
    arrow.y = negateY ? -pose.position.y : pose.position.y;
    arrow.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation || { x: 0, y: 0, z: 0, w: 1 });
    this.container.addChild(arrow);
  }
};
```

Update `unsubscribe`:

```js
ROS2D.PoseArrayClient.prototype.unsubscribe = function() {
  if (this.rosTopic) { this.rosTopic.unsubscribe(); }
  this._clearContainer();
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.container && this.rootObject) {
    this.rootObject.removeChild(this.container);
  }
};
```

- [ ] **Step 5: Pass.** `npx vitest run test/clients/PoseArrayClient.test.js`

- [ ] **Step 6: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 7: Commit**

```bash
git add src/clients/PoseArrayClient.js src-esm/clients/PoseArrayClient.js \
        test/clients/PoseArrayClient.test.js
git commit -m "$(cat <<'EOF'
feat(PoseArrayClient): integrate tfClient via lazy SceneNode

Wraps the managed container in a SceneNode on first message. On the TF
path child arrows use ROS y without negation (SceneNode owns the
negate). Without tfClient: existing -y behavior preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: OccupancyGridClient — lazy SceneNode wrap (multi-robot map)

**Files:**
- Modify: `src/maps/OccupancyGridClient.js`
- Modify: `test/maps/OccupancyGridClient.test.js`

**Why:** multi-robot deployments publish `/robot_0/map` etc. in a per-robot frame. Wrapping the OccupancyGrid in a SceneNode lets them overlay correctly.

- [ ] **Step 1: Extend test globals** as in prior tasks.

- [ ] **Step 2: Read `src/maps/OccupancyGridClient.js`** to understand the current shape. It is the continuous-map variant that rebuilds an `ROS2D.OccupancyGrid` on each message and swaps it in under `rootObject`. The wrap applies to whichever object the client currently `addChild`s to `rootObject`.

- [ ] **Step 3: Add failing tests**

```js
  it('with tfClient: map message creates a SceneNode wrap at the map frame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(fakeMapMsg('robot_0/map'));
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('robot_0/map');
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('with tfClient: unsubscribe detaches from TF', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(fakeMapMsg('robot_0/map'));
    client.unsubscribe();
    expect(tf.__subscriberCount('robot_0/map')).toBe(0);
  });

  it('without tfClient: behavior unchanged', () => {
    // existing assertions remain; this case confirms client.node is absent.
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(fakeMapMsg('map'));
    expect(client.node).toBeFalsy();
  });
```

`fakeMapMsg(frame)` should match the message shape the current tests already synthesize. Read the existing `OccupancyGridClient.test.js` helpers and reuse them; do not reinvent.

- [ ] **Step 4: Fail.** `npx vitest run test/maps/OccupancyGridClient.test.js`

- [ ] **Step 5: Modify `src/maps/OccupancyGridClient.js`**

Add `this.tfClient = options.tfClient || null;` and `this.node = null;` near the top.

Find the point in the message callback where the current occupancy grid is added as a child of `this.rootObject`. Replace that add with:

```js
    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.currentGrid
        });
        that.rootObject.addChild(that.node);
      } else {
        // Current grid was replaced — swap the child under the SceneNode.
        if (that.node.frame_id !== frame) { that.node.setFrame(frame); }
        // Replace the lone child under the SceneNode with the new grid.
        while (that.node.children.length > 0) {
          that.node.removeChild(that.node.children[0]);
        }
        that.node.addChild(that.currentGrid);
      }
    } else {
      that.rootObject.addChild(that.currentGrid);
    }
```

(Adjust local variable names — `that.currentGrid` vs whatever the current file calls it — based on what the file actually uses.)

Update `unsubscribe` (if it exists; otherwise add one that mirrors the other clients):

```js
ROS2D.OccupancyGridClient.prototype.unsubscribe = function() {
  if (this.rosTopic) { this.rosTopic.unsubscribe(); }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  }
};
```

- [ ] **Step 6: Pass.** `npx vitest run test/maps/OccupancyGridClient.test.js`

- [ ] **Step 7: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 8: Commit**

```bash
git add src/maps/OccupancyGridClient.js src-esm/maps/OccupancyGridClient.js \
        test/maps/OccupancyGridClient.test.js
git commit -m "$(cat <<'EOF'
feat(OccupancyGridClient): integrate tfClient via lazy SceneNode wrap

Lets multi-robot deployments publish maps in per-robot frames (e.g.
/robot_0/map) and have them overlay correctly via TF. No tfClient =
unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Multi-frame integration test

**Files:**
- Create: `test/visualization/MultiFrame.integration.test.js`

**Why:** prove the motivating multi-robot use case end-to-end. Two SceneNodes, different frames, different transforms, independent results.

- [ ] **Step 1: Write the test**

```js
import { describe, it, expect } from 'vitest';
import EventEmitter from 'eventemitter3';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';

const fake = createFakeRoslib();

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.removeChild = function(c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); }
};

globalThis.createjs = { Container: FakeContainer };
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

// Same simplified Pose stub used in client tests.
globalThis.ROSLIB.Pose = function(options) {
  this.position = { x: options.position.x, y: options.position.y, z: options.position.z };
  this.orientation = {
    x: options.orientation.x, y: options.orientation.y,
    z: options.orientation.z, w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  this.position.x += tf.translation.x;
  this.position.y += tf.translation.y;
  this.position.z += tf.translation.z;
};

await import('../../src/visualization/SceneNode.js');
const { SceneNode } = { SceneNode: globalThis.ROS2D.SceneNode };

describe('SceneNode multi-frame integration', () => {
  it('two nodes on different frames remain independent under distinct transforms', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'world' });
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    const a = new SceneNode({
      tfClient: tf, frame_id: 'map',
      pose: { position: { x: 1, y: 1, z: 0 }, orientation: identity },
    });
    const b = new SceneNode({
      tfClient: tf, frame_id: 'robot_0/map',
      pose: { position: { x: 1, y: 1, z: 0 }, orientation: identity },
    });

    tf.__emit('map', {
      translation: { x: 10, y: 0, z: 0 }, rotation: identity,
    });
    tf.__emit('robot_0/map', {
      translation: { x: 100, y: 0, z: 0 }, rotation: identity,
    });

    expect(a.x).toBe(11); expect(a.y).toBe(-1);
    expect(b.x).toBe(101); expect(b.y).toBe(-1);

    // Re-emit only one frame; the other must not move.
    tf.__emit('map', { translation: { x: 20, y: 0, z: 0 }, rotation: identity });
    expect(a.x).toBe(21);
    expect(b.x).toBe(101);
  });
});
```

- [ ] **Step 2: Run it; it should pass without further source changes**

Run: `npx vitest run test/visualization/MultiFrame.integration.test.js`

- [ ] **Step 3: Pipeline**

```
npx grunt transpile
npx grunt lint
npm test
npm run check:transpile
```

- [ ] **Step 4: Commit**

```bash
git add test/visualization/MultiFrame.integration.test.js
git commit -m "$(cat <<'EOF'
test(SceneNode): add multi-frame integration test

Proves two SceneNodes on distinct frames (map vs robot_0/map) track
independent transforms without cross-contamination — the core
multi-robot scenario motivating this feature.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Full-pipeline verification + rollup build smoke test

**Files:** none modified; verification only.

- [ ] **Step 1: Run the complete pipeline fresh**

```
npx grunt transpile
npx grunt lint
npm test
npm run build
npm run check:transpile
```

All five must succeed with zero warnings.

- [ ] **Step 2: Inspect build output**

```
ls -la build/
```

Expected: `ros2d.cjs.js`, `ros2d.esm.js`, `types/`.

- [ ] **Step 3: Confirm SceneNode is exported from the built ESM bundle**

Run:

```
node -e "import('./build/ros2d.esm.js').then(m => console.log(Object.keys(m).filter(k => k === 'SceneNode' || k === 'ROS2D')))"
```

Expected: output includes `SceneNode`. If the library publishes only a namespaced `ROS2D`, the check becomes `Object.keys(m.ROS2D)` including `'SceneNode'`.

- [ ] **Step 4: No commit** — this task is pure verification.

---

## Task 14: Release v1.3.0 — version bump

**Files:**
- Modify: `src/Ros2D.js`
- Modify: `package.json`

- [ ] **Step 1: Bump `src/Ros2D.js` REVISION**

Change:

```js
  REVISION : '1.2.0'
```

to:

```js
  REVISION : '1.3.0'
```

(Note: `package.json` version is currently `1.2.1` for the TraceShape hotfix, but `Ros2D.js` REVISION skipped that patch. Going to 1.3.0 aligns them.)

- [ ] **Step 2: Bump `package.json`**

Change:

```json
  "version": "1.2.1",
```

to:

```json
  "version": "1.3.0",
```

- [ ] **Step 3: Run the complete pipeline one more time**

```
npx grunt transpile
npx grunt lint
npm test
npm run build
npm run check:transpile
```

All must succeed.

- [ ] **Step 4: Pause for user confirmation before committing the release bump**

Before committing, ask the user: "Ready to commit v1.3.0 release bump and push?" Do not proceed without explicit approval.

- [ ] **Step 5: On approval, commit**

```bash
git add src/Ros2D.js src-esm/Ros2D.js package.json
git commit -m "$(cat <<'EOF'
chore(release): v1.3.0 — TFClient integration across all clients

Introduces ROS2D.SceneNode and wires tfClient support into MarkerArray,
Path, PoseStamped, PoseArray, Odometry, and OccupancyGrid clients.
Preserves v1.2 behavior byte-for-byte when tfClient is omitted.

See docs/superpowers/specs/2026-04-19-tfclient-integration-design.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Push and tag (only on user approval)**

```
git tag v1.3.0
git push origin main
git push origin v1.3.0
```

---

## Self-Review (done during plan authoring)

- Every spec section 4–5 API (`tfClient`, `frame_id`, `pose`, `object`, `setPose`, `setFrame`, `unsubscribe`, visibility policy, Y-negate placement, first-TF warning) has a dedicated task step.
- Every client in spec section 5 (Marker, MarkerArrayClient, PathClient, PoseStampedClient, OdometryClient, PoseArrayClient, OccupancyGridClient) has its own task with TDD-sized steps.
- Every commit item in spec section 8 maps to a plan task (with two client commits split across Tasks 7–11 for finer review).
- Regression guard (spec section 9) satisfied: every client task has an explicit "without tfClient" test case.
- Multi-robot motivation (spec section 1 + memory) covered by per-marker frame tests (Task 6), frame-change tests (Tasks 7–11), and Task 12's integration test.
- Type consistency: `frame_id` (underscore form) used throughout, matching the ROS message field. `tfClient` (camel) for the option. `SceneNode.frame_id` public field, `SceneNode._latestTf` private.
- No placeholders; every code block is complete.

---

## Execution Handoff

Plan complete and ready to commit to `docs/superpowers/plans/2026-04-20-tfclient-integration.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration. Uses `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
