# ros2djs-ros2

A 2D visualization library for ROS 2 web applications, built on [EaselJS](https://createjs.com/easeljs) and [roslibjs](https://github.com/RobotWebTools/roslibjs). Forked from [RobotWebTools/ros2djs](https://github.com/RobotWebTools/ros2djs).

## Background

The original `ros2djs` provided browser-based 2D visualization for ROS, but upstream development has stopped. This repository continues that work with a focus on ROS 2 compatibility: the build pipeline has been modernized (ES modules, Rollup, TypeScript declarations), the event system migrated from `eventemitter2` to `eventemitter3`, and the single-source transpile workflow restored so that `src/` is the only hand-edited source tree. Over time this project may transition into a fully independent package.

## Installation

```bash
npm install ros2d
```

Peer dependency: [`roslib`](https://github.com/RobotWebTools/roslibjs) `^2.0.0`.

### ESM

```js
import { Viewer, OccupancyGridClient } from 'ros2d';
```

### CommonJS

```js
const { Viewer, OccupancyGridClient } = require('ros2d');
```

### Browser (IIFE)

```html
<script src="path/to/ros2d.min.js"></script>
<script>
  var viewer = new ROS2D.Viewer({ /* ... */ });
</script>
```

## Quick Start

```js
import ROSLIB from 'roslib';
import { Viewer, OccupancyGridClient } from 'ros2d';

// Connect to rosbridge
const ros = new ROSLIB.Ros({ url: 'ws://localhost:9090' });

// Create a 2D viewer attached to a <div id="map">
const viewer = new Viewer({
  divID: 'map',
  width: 640,
  height: 480,
});

// Subscribe to an occupancy grid and render it
const gridClient = new OccupancyGridClient({
  ros,
  rootObject: viewer.scene,
});

gridClient.on('change', () => {
  viewer.scaleToDimensions(gridClient.currentGrid.width, gridClient.currentGrid.height);
  viewer.shift(gridClient.currentGrid.pose.position.x, gridClient.currentGrid.pose.position.y);
});
```

## Visualizing MarkerArray

`MarkerArrayClient` subscribes to a `visualization_msgs/MarkerArray` topic and renders each marker as a top-down 2D projection (Z is dropped). Markers are tracked by `namespace + id`, and the four standard actions — `ADD` (0), `MODIFY` (0), `DELETE` (2), `DELETEALL` (3) — are honored, along with positive `lifetime` values for automatic removal.

```js
import { Viewer, MarkerArrayClient } from 'ros2d';

const viewer = new Viewer({ divID: 'markers', width: 800, height: 600 });
const markerClient = new MarkerArrayClient({
  ros,
  topic: '/markers',
  rootObject: viewer.scene,
});
markerClient.on('change', () => { /* re-render hooks, etc. */ });
```

Supported marker types in the v1 implementation:

| Type | Constant | Notes |
|------|----------|-------|
| 0 | `ARROW` | Reuses `ROS2D.ArrowShape`, length = `scale.x` |
| 1 | `CUBE` | `scale.x` × `scale.y` rectangle |
| 2, 3 | `SPHERE`, `CYLINDER` | Circle of radius `scale.x / 2` |
| 4, 5 | `LINE_STRIP`, `LINE_LIST` | Stroke width = `scale.x` |
| 6, 7 | `CUBE_LIST`, `SPHERE_LIST` | One shape per point; per-point colors via `colors[]` |
| 8 | `POINTS` | Per-point colors supported |
| 9 | `TEXT_VIEW_FACING` | Font height = `scale.z` (meters) |
| 11 | `TRIANGLE_LIST` | Filled triangles in groups of 3 points |

`MESH_RESOURCE` (10) is not representable in 2D and is skipped with a console warning. `frame_id` / TF lookup is intentionally not performed in v1 — markers render in the `rootObject`'s coordinate frame, matching the convention used by `OccupancyGridClient`. The `tfClient` option slot is reserved for future TF-aware support.

## React Examples

The legacy static HTML demos have been replaced with a Vite + React example app under [`examples/`](./examples/README.md). The new example studio covers the current API surface:

- `OccupancyGridClient`
- `ImageMapClient`
- `MarkerArrayClient`
- `LaserScanClient`
- Navigation overlays (`PathClient`, `PoseStampedClient`, `OdometryClient`, `PoseArrayClient`)

Run it with:

```bash
cd examples
npm install
npm run dev
```

## Development

```bash
npm install
npm run build      # prebuild (transpile) + rollup + tsc
npm test           # vitest
npm run lint       # eslint via grunt
```

### Source pipeline

```
src/                 single source of truth (legacy global-namespace pattern)
  ↓  grunt transpile (prebuild hook: rimraf src-esm && grunt transpile)
src-esm/             auto-generated ES modules (gitignored — do not edit)
  ↓  rollup
build/
  ros2d.cjs.js       CommonJS
  ros2d.esm.js       ES module
  ros2d.min.js       IIFE (browser <script>)
  types/             TypeScript declarations (tsc)
```

Edit only files in `src/`. The `prebuild` hook regenerates `src-esm/` automatically before every build. A `check:transpile` CI guardrail ensures no hand-edited `src-esm/` files can be committed.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Full pipeline: prebuild + rollup + tsc |
| `npm test` | Run vitest test suite |
| `npm run lint` | ESLint via grunt |
| `npm run transpile` | Regenerate `src-esm/` with debug output |
| `npm run check:transpile` | CI guardrail: regenerate + assert no git diff |
| `npm run doc` | Rebuild JSDoc |

## Contributing

Issues and pull requests are welcome. Please run `npm run lint && npm test` before submitting.

## License

BSD-3-Clause. Based on original work by Robert Bosch LLC, Willow Garage Inc., Worcester Polytechnic Institute, and Yujin Robot. See [LICENSE](./LICENSE) for details.
