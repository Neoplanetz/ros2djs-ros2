# TFClient Integration Across ros2djs Clients — Design

**Status:** approved for planning
**Date:** 2026-04-19
**Target release:** v1.3.0
**Scope:** introduce `ROS2D.SceneNode` and wire `tfClient` option into all 7 message-consuming components

---

## 1. Motivation

As of v1.2.0 all message-consuming components (`MarkerArrayClient`, `PathClient`, `PoseStampedClient`, `PoseArrayClient`, `OdometryClient`, `OccupancyGridClient`, plus the `Marker` shape itself) ignore `header.frame_id` and render directly in the `rootObject` coordinate frame. `MarkerArrayClient` already accepts a `tfClient` option but only emits a `console.warn`.

This works for single-robot, single-frame deployments, but the library is used in multi-robot environments where per-robot namespaced frames (`/robot_0/map`, `/robot_0/base_link`, …) coexist in the same viewer. Without a TF pipeline, such deployments cannot correctly overlay data from different frames.

**Goal:** let callers pass a `ROSLIB.TFClient` or `ROSLIB.ROS2TFClient` and have every client place its visuals according to `frame_id → fixed_frame` transforms, while preserving byte-for-byte the current behavior when no `tfClient` is provided.

## 2. Design Principles

1. **Opt-in.** Absence of `tfClient` on any client means current behavior, unchanged. No existing test is modified.
2. **Single Y-negate location.** ROS `+Y` → canvas `−Y` conversion happens in exactly one place on the TF path (the `SceneNode`). Non-TF paths keep their existing per-client Y-negate.
3. **Single math location.** TF × pose composition lives only in `SceneNode`. Clients orchestrate; `SceneNode` computes.
4. **Respect the library conventions** documented in `memory/project_followups.md`: ES5 (`ecmaVersion: 5`, no `let`/`const`/arrow/class), `createjs.X.call(this)` + `Object.setPrototypeOf(...)` inheritance, `src/` only, export from `es6-support/index.js`.
5. **Multi-frame by construction.** Different markers, topics, or messages may have different `frame_id` values; never assume one frame per viewer.

## 3. Architecture

```
ROS2D.SceneNode (new, public, extends createjs.Container)
  inputs:  { tfClient, frame_id, pose, object }
  behavior: subscribes to tfClient for frame_id; on each TF update
            composes tf × pose, applies Y-negate, writes x/y/rotation,
            sets visible=true after first transform.

Message-consuming clients (7)
  - tfClient absent  → existing code path, untouched.
  - tfClient present → wrap visual(s) in SceneNode, let it position them.

ROSLIB.TFClient / ROSLIB.ROS2TFClient
  Created by the caller. The library never constructs them.
  SceneNode depends only on BaseTFClient's subscribe/unsubscribe/fixedFrame.
```

### Boundaries

- `SceneNode` does not know about topics, message types, or what is being drawn.
- Clients do not know about Transform composition or Y-negate placement.
- The shared contract is: `frame_id: string` and `pose: geometry_msgs/Pose`.

## 4. SceneNode API

```js
/**
 * @constructor
 * @param {Object} options
 * @param {Object} options.tfClient   — ROSLIB.TFClient or ROSLIB.ROS2TFClient (required)
 * @param {string} options.frame_id   — TF frame this node lives in (required)
 * @param {Object} [options.pose]     — geometry_msgs/Pose inside frame_id. Defaults to identity.
 * @param {createjs.DisplayObject} [options.object] — child to add; may also be added later.
 */
ROS2D.SceneNode = function(options) { ... };

// Methods:
SceneNode.setPose(newPose);     // update local pose, re-apply cached TF immediately
SceneNode.setFrame(newFrameId); // unsubscribe old frame, subscribe new, reset visibility
SceneNode.unsubscribe();        // detach from TF; idempotent
```

### Lifecycle and visibility

- Construction: `this.visible = false`. Callback is registered with `tfClient.subscribe(frame_id, cb)` and the callback reference is retained on the instance so `BaseTFClient.unsubscribe(frame_id, cb)` works.
- First TF callback: compose, apply, set `visible = true`.
- `setFrame(newId)`: if `newId === this.frame_id` do nothing; otherwise unsubscribe old, clear `visible`, subscribe new.
- `setPose(newPose)`: update internal pose. `SceneNode` keeps its own latest-`Transform` field (populated by the subscribe callback); if that field is non-null, re-compose and re-apply immediately; otherwise just store the pose and wait for the next callback. This avoids reaching into `BaseTFClient` internals.
- `unsubscribe()`: calls `tfClient.unsubscribe(frame_id, cb)` and sets the callback reference to null. Safe to call twice.

### TF × Pose composition

```
1. localPose  = new ROSLIB.Pose(this.pose)          // clone
2. localPose.applyTransform(tf)                      // world-space pose (ROS coords)
3. this.x        =  localPose.position.x
   this.y        = -localPose.position.y             // Y-negate, only here
   this.rotation = ROS2D.quaternionToGlobalTheta(localPose.orientation)
4. this.visible  = true
```

This is the only place where Y-negate occurs on the TF path. All children of a `SceneNode` render in ROS coordinates with no negation.

### First-transform warning

On construction, start a one-shot 1 second timer (`setTimeout`). If the first TF callback has not arrived by then, emit `console.warn` *once*: `"ROS2D.SceneNode: no TF received yet for frame 'X' (fixedFrame=Y); node will remain hidden until a transform arrives"`. The first callback clears the timer. This surfaces `frame_id` typos without polluting steady-state logs.

### Error handling

- Missing `tfClient` or `frame_id` → throw (programmer error).
- NaN/invalid transform → `console.warn`, skip that update, keep previous visible state.
- `setPose(null)` → treat as identity.

## 5. Client Integration Patterns

All clients branch on `if (tfClient)`. The non-TF branch is the existing code; the TF branch follows these patterns.

### 5.1 Marker (`src/markers/Marker.js`)

Add `applyPose` option, default `true`. When `false`, the three trailing lines that set `this.x`, `this.y`, `this.rotation` are skipped. Child shape geometry (e.g. LINE_STRIP's `-points[i].y`) is unchanged — those negate the marker's own local frame into canvas space and remain correct when the outer SceneNode applies the Y-negate for the marker's pose.

Backward compatibility: callers that do not pass `applyPose` get `true` → identical behavior.

### 5.2 MarkerArrayClient (`src/markers/MarkerArrayClient.js`)

Replace the current `console.warn` stub with real integration. Per incoming marker:

```
shape = new ROS2D.Marker({ message: m, applyPose: false });
node  = new ROS2D.SceneNode({
  tfClient: this.tfClient,
  frame_id: m.header.frame_id,
  pose: m.pose,
  object: shape
});
rootObject.addChild(node);
this.markers[key] = { node, timer };
```

DELETE / DELETEALL: `node.unsubscribe()` then `rootObject.removeChild(node)`. `_clearAll()` iterates.

Per-marker subscription is correct for multi-frame arrays (e.g. markers from multiple robots). `BaseTFClient` deduplicates network subscriptions per frame.

### 5.3 PathClient, PoseStampedClient, OdometryClient, PoseArrayClient, OccupancyGridClient

These do not know `frame_id` at construction time. Pattern: **lazy SceneNode**.

```
onFirstMessage(message):
  if (tfClient && !this.node) {
    this.node = new ROS2D.SceneNode({
      tfClient, frame_id: message.header.frame_id,
      object: this.<managedContainerOrShape>
    });
    this.rootObject.addChild(this.node);
  } else if (this.node && this.node.frame_id !== message.header.frame_id) {
    this.node.setFrame(message.header.frame_id);
  }

  // PoseStamped / Odometry: extract pose, call this.node.setPose(pose)
  // Path / PoseArray / OccupancyGrid: update internal shape/container contents as today
```

### 5.4 Y-negate branching in PoseArrayClient

`_render` currently uses `arrow.y = -pose.position.y`. On the TF path the outer SceneNode applies the Y-negate, so the arrow must *not* negate:

```
if (this.tfClient) {
  arrow.y = pose.position.y;      // parent SceneNode negates
} else {
  arrow.y = -pose.position.y;     // existing behavior
}
```

This is the only Y-negate branch required. Other clients manage a single shape/container, so the Y-negate simply moves from the client to the SceneNode without conditional logic.

### 5.5 Client `unsubscribe()`

Every client's `unsubscribe()` additionally disposes its SceneNode(s): `this.node.unsubscribe()` where applicable, and for `MarkerArrayClient` a loop over `markers[*].node.unsubscribe()` inside `_clearAll()`.

## 6. Testing

### 6.1 Fake extension (`test/fakes/fakeRoslib.js`)

Add `FakeTFClient` with `subscribe(frameID, cb)`, `unsubscribe(frameID, cb)`, `fixedFrame`, and a test helper `__emit(frameID, transform)` that dispatches to all subscribers for that frame. Register it under `ROSLIB.TFClient` so existing `createFakeRoslib()` consumers get it for free.

### 6.2 New tests

- `test/visualization/SceneNode.test.js`
  - Initial `visible === false`.
  - First TF callback sets `visible === true` and composes correctly (`tf.translation.y = 1` → `node.y === -1`).
  - `setPose` applies cached TF immediately.
  - `setFrame` unsubscribes old, subscribes new, resets visibility.
  - `unsubscribe` is idempotent; subsequent TF emits are ignored.
  - Two SceneNodes on different frames do not cross-contaminate.

### 6.3 Updated tests

Each of the following gains TF-path cases without modifying existing ones:

- `test/markers/Marker.test.js` — `applyPose: false` leaves `x/y/rotation` untouched.
- `test/markers/MarkerArrayClient.test.js` — per-marker SceneNode creation; DELETE → `unsubscribe()`; `_clearAll` walks all.
- `test/clients/PathClient.test.js` — lazy SceneNode on first message; `setFrame` on frame change.
- `test/clients/PoseStampedClient.test.js` — lazy SceneNode, `setPose` on each message.
- `test/clients/OdometryClient.test.js` — lazy SceneNode, `setPose` on each message.
- `test/clients/PoseArrayClient.test.js` — TF path skips arrow Y-negate; non-TF path unchanged.
- `test/maps/OccupancyGridClient.test.js` — lazy SceneNode wrap; multi-robot `/robot_0/map` scenario.

Each updated file retains an explicit assertion confirming that when `tfClient` is not supplied the behavior is identical to v1.2.0.

### 6.4 Multi-frame integration test

One test instantiates a `FakeTFClient`, two `SceneNode`s (`map` and `robot_0/map`), emits distinct transforms per frame, and asserts the nodes land at different positions. Proves the multi-robot use case the design was motivated by.

## 7. Pipeline

Per project convention:

```
npx grunt transpile       # src/ → src-esm/ (do not edit src-esm by hand)
npx grunt lint            # ESLint ecmaVersion: 5
npm test                  # vitest
npm run build             # rollup + tsc
npm run check:transpile   # drift guard
```

All five must pass on every commit. The release commit bumps `src/Ros2D.js` `REVISION` and `package.json` `version` in lockstep.

## 8. Commit Plan

1. `feat(test): extend fakeRoslib with FakeTFClient`
2. `feat(visualization): add SceneNode with TF-aware positioning`
3. `feat(Marker): add applyPose option for external pose control`
4. `feat(MarkerArrayClient): integrate tfClient via SceneNode`
5. `feat(clients): integrate tfClient into Path/PoseStamped/Odometry/PoseArray`
6. `feat(OccupancyGridClient): integrate tfClient via SceneNode wrap`
7. `chore(release): v1.3.0 — TFClient integration across all clients`

User-confirmation gate immediately before step 7.

## 9. Backward Compatibility

- Every client accepts `tfClient` only as a new optional key. Omitting it yields byte-identical behavior to v1.2.0.
- `Marker`'s new `applyPose` option defaults to `true` (identity-preserving). No existing caller references this key.
- `MarkerArrayClient`'s prior `console.warn` stub is removed in favor of real behavior; callers who were passing `tfClient` now get the feature they asked for rather than a warning. No silent behavior regression: if they did not pass `tfClient`, nothing changes.
- Existing tests are not modified. Regression is proved by their continued passage without edits.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Double Y-negate from misuse inside a SceneNode subtree | JSDoc states "children render in ROS coordinates"; PoseArrayClient TF-path test asserts the non-negated value |
| Callback storm for 100+ markers in one frame | `BaseTFClient` deduplicates at the network layer; callback dispatch remains O(N) and writes only three numeric fields. Acceptable for v1. Reassess with real workload before optimizing |
| TF never arrives → permanently hidden visual | Intentional (Q1 decision). One-shot `console.warn` on first setPose-without-TF surfaces typo'd `frame_id` without log spam |
| roslib v1 vs v2 TFClient API divergence | Depend only on `BaseTFClient`'s public surface (`subscribe`, `unsubscribe`, `fixedFrame`), common to both |
| Client-level frame changes across messages | Handled by `setFrame`; clients compare before calling to avoid needless resubscribe |

## 11. Out of Scope for v1.3.0

- Example HTML modernization (tracked in `project_followups`, covered in the examples pass).
- Nested/hierarchical SceneNodes (ros3djs-style scene graph).
- Interactive markers and `GoalPosePublisher` (next session).
- CHANGELOG.md resumption (separate followup).
- tf2_web_republisher deployment documentation.

## 12. File Change Summary

**New (2):**
- `src/visualization/SceneNode.js`
- `test/visualization/SceneNode.test.js`

**Modified (9):**
- `src/markers/Marker.js`
- `src/markers/MarkerArrayClient.js`
- `src/clients/PathClient.js`
- `src/clients/PoseStampedClient.js`
- `src/clients/OdometryClient.js`
- `src/clients/PoseArrayClient.js`
- `src/maps/OccupancyGridClient.js`
- `es6-support/index.js` (add `SceneNode` export)
- `test/fakes/fakeRoslib.js` (add `FakeTFClient`)

Plus the `Ros2D.js` REVISION / `package.json` version bump at release time. `src-esm/` is regenerated by `grunt transpile`; do not edit by hand.
