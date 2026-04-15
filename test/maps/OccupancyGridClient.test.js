import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

vi.mock('roslib', () => fake.ROSLIB);
vi.mock('createjs-module', () => ({
  default: {
    Container: class {},
    Shape: class {},
    Bitmap: class {},
    Graphics: class {
      static getRGB() { return '#000000'; }
      setStrokeStyle() { return this; }
      beginStroke() { return this; }
      beginFill() { return this; }
      moveTo() { return this; }
      lineTo() { return this; }
      endFill() { return this; }
      endStroke() { return this; }
    },
    Stage: class {
      globalToRos() {}
      rosToGlobal() {}
      rosQuaternionToGlobalTheta() {}
    },
  },
  Container: class {},
  Shape: class {},
  Bitmap: class {},
  Graphics: class {
    static getRGB() { return '#000000'; }
    setStrokeStyle() { return this; }
    beginStroke() { return this; }
    beginFill() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    endFill() { return this; }
    endStroke() { return this; }
  },
}));

// Set up globals the source scripts rely on (they use bare globals, not require()).
globalThis.ROSLIB = fake.ROSLIB;

// Minimal createjs mock with all classes referenced by OccupancyGrid, Grid, and OccupancyGridClient.
class FakeGraphics {
  static getRGB() { return '#000000'; }
  setStrokeStyle() { return this; }
  beginStroke() { return this; }
  beginFill() { return this; }
  moveTo() { return this; }
  lineTo() { return this; }
  endFill() { return this; }
  endStroke() { return this; }
}

class FakeBitmap {
  constructor(_canvas) {
    this.x = 0;
    this.y = 0;
    this.scaleX = 1;
    this.scaleY = 1;
  }
}

class FakeShape {
  constructor(_graphics) {}
}

class FakeContainer {
  constructor() {}
  addChild() {}
  getChildIndex() { return -1; }
  removeChild() {}
  addChildAt() {}
}

globalThis.createjs = {
  Graphics: FakeGraphics,
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.EventEmitter = EventEmitter;

// Stub a minimal ROS2D global the source attaches itself to.
globalThis.ROS2D = globalThis.ROS2D ?? {};

// Pre-populate ROS2D.Grid and ROS2D.OccupancyGrid so OccupancyGridClient can
// construct them. These are defined in separate source files that we don't
// import here.
globalThis.ROS2D.Grid = function FakeGrid(_options) {};
globalThis.ROS2D.Grid.prototype.__proto__ = FakeShape.prototype;

globalThis.ROS2D.OccupancyGrid = function FakeOccupancyGrid(options) {
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
  const msg = options.message;
  if (msg && msg.info) {
    this.width = msg.info.width * msg.info.resolution;
    this.height = msg.info.height * msg.info.resolution;
    this.pose = new fake.ROSLIB.Pose({
      position: msg.info.origin.position,
      orientation: msg.info.origin.orientation,
    });
  }
};
globalThis.ROS2D.OccupancyGrid.prototype.__proto__ = FakeBitmap.prototype;

await import('../../src/maps/OccupancyGridClient.js');

describe('OccupancyGridClient (baseline, v1 API)', () => {
  beforeEach(() => {
    fake.topics.length = 0;
  });

  it('subscribes to the configured topic with messageType nav_msgs/OccupancyGrid', () => {
    const rootObject = { addChild: vi.fn(), getChildIndex: () => -1, removeChild: vi.fn() };
    new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject,
      topic: '/map',
    });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/map');
    expect(topic.messageType).toBe('nav_msgs/OccupancyGrid');
  });

  it('emits "change" after a message arrives', () => {
    const rootObject = {
      addChild: vi.fn(),
      getChildIndex: () => 0,
      removeChild: vi.fn(),
      addChildAt: vi.fn(),
    };
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject,
      topic: '/map',
      continuous: true,
    });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ info: { width: 10, height: 10, resolution: 0.1, origin: { position: { x: 0, y: 0 }, orientation: {} } }, data: new Array(100).fill(0) });
    expect(onChange).toHaveBeenCalledOnce();
  });
});
