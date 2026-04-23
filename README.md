# ros2-web2d

A web-based 2D visualization library **for ROS 2**. Renders
occupancy grids, markers, paths, poses, odometry, and laser scans
onto an [EaselJS](https://createjs.com/easeljs) stage, driven by
[roslibjs](https://github.com/RobotWebTools/roslibjs) over rosbridge.

> ROS 2 only. ROS 1 (`roscpp`/`rospy`) installations are not supported —
> the library targets rosbridge v2 topic types (e.g.
> `nav_msgs/msg/OccupancyGrid`, `geometry_msgs/msg/PoseStamped`). Use
> the original [ros2djs](https://github.com/RobotWebTools/ros2djs) if
> you are on ROS 1.

```js
import { Viewer, OccupancyGridClient } from 'ros2-web2d';
import ROSLIB from 'roslib';

const ros    = new ROSLIB.Ros({ url: 'ws://localhost:9090' });
const viewer = new Viewer({ divID: 'map', width: 800, height: 600 });

new OccupancyGridClient({ ros, rootObject: viewer.scene });
```

## Features

- **TF-aware rendering** — every client accepts an optional
  `tfClient` and wraps its output in a `SceneNode` that subscribes
  to the message's `header.frame_id`. Multi-robot deployments with
  mixed frames (e.g. `/robot_0/map`, `/robot_1/odom`) render
  correctly side-by-side. Without `tfClient`, clients behave exactly
  as in 1.2.x.
- **Map rendering** — `OccupancyGridClient` for live
  `nav_msgs/OccupancyGrid` streams, `ImageMapClient` for
  `map_server`-style `map.yaml` + `.pgm` / `.png` / `.svg` assets
  (the YAML and PGM loaders run entirely in the browser).
- **Navigation overlays** — `PathClient`, `PoseStampedClient`,
  `OdometryClient`, `PoseArrayClient`, all share the same TF path
  and compose cleanly on one viewer.
- **Markers** — `MarkerArrayClient` honors the ADD / MODIFY /
  DELETE / DELETEALL actions, per-marker lifetimes, and the ten
  marker primitives that project meaningfully into 2D.
- **Sensors** — `LaserScanClient` renders `sensor_msgs/LaserScan`
  as 2D points, with optional sampling and range filters.
- **Mouse controls** — a drop-in
  [`enableViewerMouseControls`](./examples/src/lib/ros2dHelpers.js)
  helper in the example studio wires left-drag pan, right-drag
  rotate, and wheel zoom to any `Viewer`.
- **Modern build** — ES modules, Rollup bundles (CJS / ESM /
  IIFE), TypeScript declarations, and a vitest suite with 156
  tests at the time of writing.

## Install

```bash
npm install ros2-web2d
```

Peer-installed alongside [`roslib`](https://github.com/RobotWebTools/roslibjs)
`^2.x` and `createjs` / `easeljs`.

### ESM

```js
import { Viewer, OccupancyGridClient } from 'ros2-web2d';
```

### CommonJS

```js
const { Viewer, OccupancyGridClient } = require('ros2-web2d');
```

### Browser IIFE

```html
<script src="https://cdn.jsdelivr.net/npm/easeljs@1/lib/easeljs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/roslib@2"></script>
<script src="https://cdn.jsdelivr.net/npm/ros2-web2d@1.3.2/build/ros2d.min.js"></script>
<script>
  const viewer = new ROS2D.Viewer({ divID: 'map', width: 640, height: 480 });
</script>
```

## TF-aware rendering

Every client that used to ignore `header.frame_id` now accepts an
optional `tfClient`. On first message for a given `frame_id`, the
client creates a `ROS2D.SceneNode` that subscribes to TF, stays
hidden until the first transform arrives, and then composes the
message's pose into the configured `fixedFrame`.

```js
import { PoseStampedClient, OdometryClient, PathClient } from 'ros2d';

const tfClient = new ROSLIB.ROS2TFClient({
  ros,
  fixedFrame: 'map',
  angularThres: 0.01,
  transThres: 0.01,
  rate: 10.0,
});

new PoseStampedClient({ ros, topic: '/goal_pose',  rootObject: viewer.scene, tfClient });
new OdometryClient   ({ ros, topic: '/odom',       rootObject: viewer.scene, tfClient });
new PathClient       ({ ros, topic: '/plan',       rootObject: viewer.scene, tfClient });
```

All four overlays converge into the same fixed frame without the
caller touching coordinate math. `SceneNode` owns the single Y-negate
on the TF path, so child display objects keep using ROS coordinates.

Multi-robot arrays work the same way — `MarkerArrayClient` picks up
each marker's own `header.frame_id`, so a single `MarkerArray` mixing
`/robot_0/odom` and `/robot_1/odom` frames renders each robot at its
own TF position.

## Client reference

| Client | Topic type | Notes |
|--------|------------|-------|
| `OccupancyGridClient` | `nav_msgs/OccupancyGrid` | Continuous or one-shot; `tfClient` wraps the grid in a `SceneNode` |
| `ImageMapClient` | (none) | Loads `map.yaml` + image asset directly; supports `.png` / `.svg` / `.pgm` |
| `MarkerArrayClient` | `visualization_msgs/MarkerArray` | Supports ADD / MODIFY / DELETE / DELETEALL and lifetimes |
| `PathClient` | `nav_msgs/Path` | Draws the path through `PathShape` |
| `PoseStampedClient` | `geometry_msgs/PoseStamped` | Default arrow via `NavigationArrow`; pass `shape` to override |
| `OdometryClient` | `nav_msgs/Odometry` | Same arrow surface as `PoseStampedClient`; extracts `pose.pose` |
| `PoseArrayClient` | `geometry_msgs/PoseArray` | Rebuilds every message; useful for AMCL particle clouds |
| `LaserScanClient` | `sensor_msgs/LaserScan` | 2D hit points with optional `sampleStep` / `maxRange` |

Shared options on ROS-driven clients: `ros`, `topic`, `rootObject`,
`tfClient`.

## Example studio

`examples/` ships a Vite + React app that exercises every client
end-to-end against a running rosbridge.

```bash
cd examples
npm install
npm run dev    # → http://localhost:5173
```

Demos included:

- **OccupancyGridClient** — live `/map` with one-shot auto-fit
- **ImageMapClient** — bundled `sample_map.pgm` + YAML, no ROS needed
- **MarkerArrayClient** — TF-aware marker overlays
- **LaserScanClient** — `/scan` with a toggleable TF client
- **Navigation Overlays** — `path + pose + odom + particlecloud`
  composed together

`examples/src/lib/ros2dHelpers.js` also exports reusable pieces —
`enableViewerMouseControls`, `createInitialMapViewFitter`,
`fitMapView`, `addMetricBackdrop` — that any app can drop into its
own `Viewer` code.

## Development

```bash
npm install
npm run build      # prebuild (transpile) + rollup + tsc
npm test           # vitest
npm run lint       # eslint via grunt
```

### Source pipeline

```
src/                 single source of truth (ES5 global-namespace)
  ↓  grunt transpile
src-esm/             auto-generated ES modules (gitignored — do not edit)
  ↓  rollup
build/
  ros2d.cjs.js       CommonJS
  ros2d.esm.js       ES module
  ros2d.min.js       IIFE for browser <script>
  types/             TypeScript declarations (tsc)
```

Edit files in `src/` only. The `prebuild` hook regenerates
`src-esm/` automatically, and `npm run check:transpile` acts as a
CI guardrail against hand-edited `src-esm/` commits.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Full pipeline: prebuild + rollup + tsc |
| `npm test` | Run the vitest suite |
| `npm run lint` | ESLint via grunt |
| `npm run transpile` | Regenerate `src-esm/` with debug output |
| `npm run check:transpile` | Regenerate + assert no diff |
| `npm run doc` | Rebuild JSDoc |

See [CHANGELOG.md](./CHANGELOG.md) for per-release notes.

## Origin

This project started as a fork of
[RobotWebTools/ros2djs](https://github.com/RobotWebTools/ros2djs) and
has since diverged into an independent, **ROS 2-only** library. The
upstream project predates ROS 2 and has been unmaintained since 2022;
`ros2-web2d` picks up the 2D-visualization role with a rebuilt TF
integration, modern Rollup/ES module pipeline, a Vite + React example
studio, and a test surface spanning 156 vitest cases plus a Playwright
smoke suite. ROS 1 support is intentionally dropped.

## License

BSD-3-Clause. Original work © Robert Bosch LLC, Willow Garage Inc.,
Worcester Polytechnic Institute, and Yujin Robot. See
[LICENSE](./LICENSE) for details.
