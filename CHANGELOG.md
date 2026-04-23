# Changelog

All notable changes to this project are documented here.
The project follows [Semantic Versioning](https://semver.org/).

## [1.3.2] — 2026-04-23

### Changed

- **`RotateView`** reworked to pivot around the drag-start point and map
  horizontal drag distance to degrees linearly via a new
  `options.degreesPerPixel` (default `0.35`). The previous
  atan2-from-stage-origin model produced unpredictable rotation once
  the viewer had been shifted or zoomed. The undocumented
  `startAngle` internal field was removed; public signatures
  (`startRotate`, `rotate`) are unchanged.

### Added

- **`ImageMapClient` PGM support** — `.pgm` URLs are now decoded in the
  browser (P5 binary and P2 ASCII, 8/16-bit), so a `map_server`-style
  `map.yaml + map.pgm` pair works without pre-converting to PNG.
- **Example studio helpers** (`examples/src/lib/ros2dHelpers.js`):
  `enableViewerMouseControls` (left-drag pan / right-drag rotate /
  wheel zoom) and `createInitialMapViewFitter` (one-shot auto-fit that
  preserves user pan/zoom on subsequent map messages).

## [1.3.1] — 2026-04-22

Patch release over 1.3.0: the 1.3.0 bundle crashed in the browser
because several ES6-class constructors referenced `this` before their
`super()` call. Fixing the transpile/source ordering unblocks every
Shape-extending renderer.

### Fixed

- **Shape-extending classes** (`NavigationArrow`, `ArrowShape`,
  `PathShape`, `TraceShape`, and the new `LaserScanShape`) now hoist
  the parent-constructor call to the top of the constructor so the
  transpiled ES6 class emits `super()` before any `this` reference.
  Before this, loading `ros2d.min.js` from a CDN crashed with
  "Must call super constructor in derived class" on first instantiation.
- **`PoseStampedClient` / `OdometryClient`** set `marker.visible = true`
  on the `tfClient` path; previously the wrapped arrow inherited its
  startup `visible = false` and stayed hidden forever inside an
  otherwise-visible `SceneNode`.
- **`NavigationImage`** pulse animation binds `this` inside the Ticker
  callback (was writing `scaleX` / `scaleY` onto the Ticker object).
- **`PathShape`** guards an empty `poses` array that previously threw
  at `path.poses[0]`.

### Added

- **`ImageMapClient` YAML loader** — `options.yaml` fetches a
  `map_server`-style YAML, parses `image` / `resolution` / `origin`,
  and loads the referenced asset. Legacy
  `{image, width, height, ...}` inputs keep working.
- **`LaserScanClient` + `LaserScanShape`** replace the dead ros3djs
  `LaserScan` / `Points` ports that never ran in 2D. The client
  subscribes to `sensor_msgs/LaserScan` and wires the shape into
  `rootObject` with optional `tfClient`.
- **Vite + React example studio** (`examples/`) — a single-page app
  covering every client: OccupancyGrid, ImageMap, MarkerArray,
  LaserScan, and the navigation overlay stack.

### Changed

- `PathShape` draw logic deduplicated into a private `_drawPath`
  helper; constructor and `setPath` now share the same path.

## [1.3.0] — 2026-04-21

Introduces **TF-aware rendering** across every client via a new
`ROS2D.SceneNode`. Every client gains an optional `tfClient` slot;
when omitted, behavior is byte-for-byte identical to 1.2.x.

### Added

- **`ROS2D.SceneNode`** — a `createjs.Container` subclass that
  subscribes to a `ROSLIB.TFClient` (or `ROSLIB.ROS2TFClient`) on
  construction, stays hidden until the first transform arrives, and
  owns the single Y-negate on the TF render path. Methods:
  `setPose(pose)`, `setFrame(frameId)`, `unsubscribe()`. Emits a
  one-shot `console.warn` after 1 s without a transform to surface
  `frame_id` typos.
- **`tfClient` option** on `MarkerArrayClient`, `PathClient`,
  `PoseStampedClient`, `OdometryClient`, `PoseArrayClient`, and
  `OccupancyGridClient`. Each marker / overlay is wrapped in its own
  `SceneNode` keyed on the message's `header.frame_id`, so
  multi-robot deployments with mixed frames (e.g. `/robot_0/map`,
  `/robot_1/odom`) render correctly.
- **`Marker.applyPose`** option (default `true`). `MarkerArrayClient`
  passes `false` so the marker sits at the origin while the wrapping
  `SceneNode` handles positioning.
- **Multi-frame integration test** — two `SceneNode` instances on
  different frames remain independent under distinct transforms.

### Compatibility

- No `tfClient` → every client renders exactly as in 1.2.x.
- Test suite grows from 74 → 130 tests across 16 files.

## Earlier history

Versions prior to 1.3.0 exist only as git tags (`v1.0.0` through
`v1.2.1`). For context on the pre-fork codebase, see the upstream
project at [RobotWebTools/ros2djs](https://github.com/RobotWebTools/ros2djs).
