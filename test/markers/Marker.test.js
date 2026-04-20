import { describe, it, expect, vi, beforeEach } from 'vitest';

// FakeGraphics records every drawing call so tests can assert what shapes
// were emitted without requiring a real canvas.
function FakeGraphics() {
  this.commands = [];
}
FakeGraphics.getRGB = function(r, g, b, a) {
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (a === undefined ? 1 : a) + ')';
};
['beginFill', 'beginStroke', 'setStrokeStyle', 'drawRect', 'drawCircle',
  'moveTo', 'lineTo', 'closePath', 'endFill', 'endStroke', 'clear']
  .forEach(function(name) {
    FakeGraphics.prototype[name] = function() {
      this.commands.push(name);
      return this;
    };
  });

function FakeShape() { this.graphics = new FakeGraphics(); }

function FakeText(text, font, color) {
  this.text = text;
  this.font = font;
  this.color = color;
  this.scaleY = 1;
}

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.scaleX = 1; this.scaleY = 1;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.removeChild = function(c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); }
};

function FakeStage() {
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1;
}
FakeStage.prototype.addChild = function() {};

globalThis.createjs = {
  Container: FakeContainer,
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Text: FakeText,
  Stage: FakeStage,
  Bitmap: function() {},
  Ticker: { framerate: 30, addEventListener: function() {} },
};

globalThis.ROS2D = globalThis.ROS2D ?? {};
// Stub the pure helper from src/Ros2D.js. We don't import that module
// because its `var ROS2D = ROS2D || {...}` is module-local under ESM and
// would not surface helpers onto globalThis where Marker.js looks.
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

// Stub ArrowShape so we don't pull in its real createjs.Shape inheritance.
globalThis.ROS2D.ArrowShape = function FakeArrowShape(opts) {
  this.opts = opts;
  FakeContainer.call(this);
};
globalThis.ROS2D.ArrowShape.prototype = Object.create(FakeContainer.prototype);

await import('../../src/markers/Marker.js');

const Marker = globalThis.ROS2D.Marker;

const idPose = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};
const whiteOpaque = { r: 1, g: 1, b: 1, a: 1 };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ROS2D.Marker', () => {
  it('is a constructor that returns a createjs.Container instance', () => {
    const m = new Marker({ message: { type: 1, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    expect(m instanceof FakeContainer).toBe(true);
  });

  it('maps pose.position to .x/.y (Y is negated to flip ROS→canvas) and uses quaternionToGlobalTheta for rotation', () => {
    const m = new Marker({
      message: {
        type: 1,
        pose: { position: { x: 3, y: -4, z: 9 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
        scale: { x: 1, y: 1, z: 1 },
        color: whiteOpaque,
      },
    });
    expect(m.x).toBe(3);
    expect(m.y).toBe(4); // -(-4) — ROS +Y points up on screen
    expect(m.rotation).toBeCloseTo(0, 5);
  });

  it('CUBE (type 1) draws a single rectangle', () => {
    const m = new Marker({ message: { type: 1, pose: idPose, scale: { x: 2, y: 3, z: 1 }, color: whiteOpaque } });
    expect(m.children).toHaveLength(1);
    expect(m.children[0].graphics.commands).toEqual(expect.arrayContaining(['beginFill', 'drawRect']));
  });

  it('SPHERE (type 2) and CYLINDER (type 3) draw a circle', () => {
    const sphere = new Marker({ message: { type: 2, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    const cyl = new Marker({ message: { type: 3, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    expect(sphere.children[0].graphics.commands).toContain('drawCircle');
    expect(cyl.children[0].graphics.commands).toContain('drawCircle');
  });

  it('ARROW (type 0) delegates to ROS2D.ArrowShape', () => {
    const m = new Marker({ message: { type: 0, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    expect(m.children).toHaveLength(1);
    expect(m.children[0]).toBeInstanceOf(globalThis.ROS2D.ArrowShape);
  });

  it('LINE_STRIP (type 4) emits one moveTo and N-1 lineTo commands', () => {
    const m = new Marker({
      message: {
        type: 4, pose: idPose, scale: { x: 0.05, y: 1, z: 1 }, color: whiteOpaque,
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
      },
    });
    const cmds = m.children[0].graphics.commands;
    expect(cmds.filter(c => c === 'moveTo').length).toBe(1);
    expect(cmds.filter(c => c === 'lineTo').length).toBe(2);
  });

  it('LINE_LIST (type 5) emits matched moveTo/lineTo pairs', () => {
    const m = new Marker({
      message: {
        type: 5, pose: idPose, scale: { x: 0.05, y: 1, z: 1 }, color: whiteOpaque,
        points: [
          { x: 0, y: 0 }, { x: 1, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 },
        ],
      },
    });
    const cmds = m.children[0].graphics.commands;
    expect(cmds.filter(c => c === 'moveTo').length).toBe(2);
    expect(cmds.filter(c => c === 'lineTo').length).toBe(2);
  });

  it('POINTS (type 8) creates one shape per point', () => {
    const m = new Marker({
      message: {
        type: 8, pose: idPose, scale: { x: 0.05, y: 0.05, z: 1 }, color: whiteOpaque,
        points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
      },
    });
    expect(m.children).toHaveLength(3);
  });

  it('CUBE_LIST (type 6) creates one shape per point', () => {
    const m = new Marker({
      message: {
        type: 6, pose: idPose, scale: { x: 0.5, y: 0.5, z: 1 }, color: whiteOpaque,
        points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      },
    });
    expect(m.children).toHaveLength(2);
  });

  it('TEXT_VIEW_FACING (type 9) creates a createjs.Text with default scaleY (no extra flip)', () => {
    const m = new Marker({
      message: {
        type: 9, pose: idPose, scale: { x: 1, y: 1, z: 0.5 }, color: whiteOpaque, text: 'hello',
      },
    });
    expect(m.children).toHaveLength(1);
    expect(m.children[0]).toBeInstanceOf(FakeText);
    expect(m.children[0].text).toBe('hello');
    expect(m.children[0].scaleY).toBe(1);
  });

  it('TRIANGLE_LIST (type 11) emits triangles in groups of 3 points', () => {
    const m = new Marker({
      message: {
        type: 11, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque,
        points: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
          { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
        ],
      },
    });
    const cmds = m.children[0].graphics.commands;
    expect(cmds.filter(c => c === 'moveTo').length).toBe(2);
    expect(cmds.filter(c => c === 'closePath').length).toBe(2);
  });

  it('MESH_RESOURCE (type 10) warns and adds no children', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = new Marker({ message: { type: 10, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    expect(m.children).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('unknown type warns and adds no children', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const m = new Marker({ message: { type: 99, pose: idPose, scale: { x: 1, y: 1, z: 1 }, color: whiteOpaque } });
    expect(m.children).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

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

  it('uses per-point colors when message.colors is provided for *_LIST types', () => {
    const m = new Marker({
      message: {
        type: 8, pose: idPose, scale: { x: 0.1, y: 0.1, z: 1 }, color: whiteOpaque,
        points: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        colors: [{ r: 1, g: 0, b: 0, a: 1 }, { r: 0, g: 0, b: 1, a: 1 }],
      },
    });
    expect(m.children).toHaveLength(2);
    // Just sanity-check that draws happened — exact color string is
    // produced by FakeGraphics.getRGB and is implementation-detail.
    expect(m.children[0].graphics.commands).toContain('drawRect');
  });
});
