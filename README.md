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

## Development

```bash
npm install
npm run build      # prebuild (transpile) + rollup + tsc
npm test           # vitest (22 tests)
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
