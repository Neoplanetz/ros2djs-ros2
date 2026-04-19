import { describe, it, expect } from 'vitest';

function FakeShape(_graphics) {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeGraphics() { this.commands = []; }
FakeGraphics.getRGB = function() { return '#000000'; };
['clear', 'setStrokeStyle', 'beginStroke', 'beginFill', 'moveTo', 'lineTo',
  'endFill', 'endStroke', 'drawRect'].forEach(function(n) {
    FakeGraphics.prototype[n] = function() { this.commands.push(n); return this; };
  });

globalThis.createjs = {
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Container: function() {},
  Stage: function() {},
  Bitmap: function() {},
  Ticker: { framerate: 30, addEventListener: function() {} },
};
globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/models/TraceShape.js');
const TraceShape = globalThis.ROS2D.TraceShape;

function pose(x, y) { return { position: { x: x, y: y } }; }

describe('ROS2D.TraceShape', () => {
  it('constructs with default options', () => {
    const t = new TraceShape({});
    expect(t).toBeDefined();
    expect(t.strokeSize).toBe(3);
    expect(t.poses).toEqual([]);
  });

  it('renders an initial stroke even before any pose is added', () => {
    const t = new TraceShape({ strokeSize: 0.1 });
    // _render() must have been called from the constructor:
    // clear + setStrokeStyle + beginStroke + endStroke
    expect(t.graphics.commands).toContain('setStrokeStyle');
    expect(t.graphics.commands).toContain('beginStroke');
  });

  it('addPose accumulates line segments incrementally', () => {
    const t = new TraceShape({ minDist: 0.01 });
    t.addPose(pose(0, 0));
    t.addPose(pose(1, 0));
    t.addPose(pose(1, 1));
    expect(t.poses).toHaveLength(3);
    expect(t.graphics.commands.filter(c => c === 'lineTo').length).toBeGreaterThanOrEqual(2);
  });

  it('respects minDist: near-duplicate poses are skipped', () => {
    const t = new TraceShape({ minDist: 0.1 });
    t.addPose(pose(0, 0));
    t.addPose(pose(0.001, 0.001)); // below minDist^2
    expect(t.poses).toHaveLength(1);
  });

  it('addPose re-renders via _render so moveTo/lineTo stay inside a fresh stroke context', () => {
    const t = new TraceShape({ minDist: 0.01 });
    t.addPose(pose(0, 0));
    t.addPose(pose(1, 0));
    t.addPose(pose(2, 0));
    // Each accepted addPose must go through _render (= one clear +
    // setStrokeStyle + beginStroke + moveTo/lineTo + endStroke). Without
    // this, incremental moveTo/lineTo land after the ctor's endStroke
    // and render invisibly. One clear from the ctor + one per addPose.
    const clears = t.graphics.commands.filter(c => c === 'clear');
    expect(clears.length).toBe(4);
    // Every re-render closes with endStroke so the NEXT addPose starts
    // from a clean stroke state.
    expect(t.graphics.commands[t.graphics.commands.length - 1]).toBe('endStroke');
  });

  it('addPose skipped by minDist does NOT trigger a redraw', () => {
    const t = new TraceShape({ minDist: 1 });
    t.addPose(pose(0, 0));
    const clearsAfterFirst = t.graphics.commands.filter(c => c === 'clear').length;
    t.addPose(pose(0.1, 0.1)); // below minDist^2 = 1
    const clearsAfterRejected = t.graphics.commands.filter(c => c === 'clear').length;
    expect(clearsAfterRejected).toBe(clearsAfterFirst);
  });

  it('popFront redraws starting from the new front with a moveTo', () => {
    const t = new TraceShape({ minDist: 0.01, maxPoses: 0 });
    t.addPose(pose(0, 0));
    t.addPose(pose(1, 1));
    t.addPose(pose(2, 2));

    const clearsBefore = t.graphics.commands.filter(c => c === 'clear').length;
    t.popFront();
    const afterCmds = t.graphics.commands;

    expect(t.poses).toHaveLength(2);
    // popFront must go through _render -> clear + setStrokeStyle + moveTo
    expect(afterCmds.filter(c => c === 'clear').length).toBe(clearsBefore + 1);
    // After the last clear there must be a moveTo before any lineTo (fixes
    // the prior bug where popFront emitted lineTo without a moveTo).
    const lastClear = afterCmds.lastIndexOf('clear');
    const tail = afterCmds.slice(lastClear);
    const moveIdx = tail.indexOf('moveTo');
    const lineIdx = tail.indexOf('lineTo');
    expect(moveIdx).toBeGreaterThanOrEqual(0);
    expect(moveIdx).toBeLessThan(lineIdx);
  });

  it('redraw() re-applies current strokeSize (dynamic thickness)', () => {
    const t = new TraceShape({ minDist: 0.01, strokeSize: 0.05 });
    t.addPose(pose(0, 0));
    t.addPose(pose(1, 1));

    const initialCount = t.graphics.commands.length;
    t.strokeSize = 0.2;
    t.redraw();
    // redraw() must issue clear + setStrokeStyle at least once more.
    const after = t.graphics.commands;
    expect(after.length).toBeGreaterThan(initialCount);
    expect(after.lastIndexOf('setStrokeStyle')).toBeGreaterThan(initialCount - 1);
  });

  it('maxPoses trims the oldest pose when exceeded', () => {
    const t = new TraceShape({ minDist: 0.001, maxPoses: 2 });
    t.addPose(pose(0, 0));
    t.addPose(pose(1, 0));
    t.addPose(pose(2, 0));
    expect(t.poses).toHaveLength(2);
    expect(t.poses[0].position.x).toBe(1);
  });
});
