# React Examples

This directory contains a Vite + React example app for the current `ros2djs-ros2` API surface.

## Run

```bash
cd examples
npm install
npm run dev
```

Open `http://localhost:5173`.

## Notes

- The example app depends on the local package via `"ros2d": "file:.."`.
- Rebuild the root package after source changes so the example app picks up the latest `build/` output:

```bash
cd ..
npm run build
```

- The `ImageMapClient` demo ships with a local sample asset at `/sample-map.yaml`.
- The ROS-driven demos expect a running rosbridge websocket, usually `ws://localhost:9090`.

## Connecting a live ROS 2 stack

```bash
# Terminal 1 — rosbridge
ros2 launch rosbridge_server rosbridge_websocket_launch.xml

# Terminal 2 — something to observe, e.g. a static map + TF
ros2 run tf2_ros static_transform_publisher \
  --x 3 --y 2 --z 0 --roll 0 --pitch 0 --yaw 0 \
  --frame-id map --child-frame-id test_frame
ros2 topic pub /markers visualization_msgs/msg/MarkerArray \
  "{markers: [{header: {frame_id: 'test_frame'}, ns: 'demo', id: 1,
    type: 1, action: 0, pose: {position: {x: 0.0, y: 0.0, z: 0.0},
    orientation: {w: 1.0}}, scale: {x: 0.5, y: 0.5, z: 0.5},
    color: {r: 1.0, g: 0.2, b: 0.2, a: 1.0}}]}" -r 1
```

Open the `MarkerArrayClient` demo, toggle **Use TF** on in the Navigation Overlays demo, and change the static transform's `--x`/`--y` — the overlays follow when TF is enabled and stay put when it is off.
