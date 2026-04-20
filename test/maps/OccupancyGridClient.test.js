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

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.getChildIndex = function(c) { return this.children.indexOf(c); };
FakeContainer.prototype.removeChild = function(c) {
  const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
};
FakeContainer.prototype.addChildAt = function(c, i) { this.children.splice(i, 0, c); };

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
    this.pose = {
      position: msg.info.origin.position,
      orientation: msg.info.origin.orientation,
    };
  }
};
globalThis.ROS2D.OccupancyGrid.prototype.__proto__ = FakeBitmap.prototype;

globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };
globalThis.ROSLIB.Pose = function(options) {
  this.position = { x: options.position.x, y: options.position.y, z: options.position.z };
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
};

await import('../../src/visualization/SceneNode.js');
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

  function fakeMapMsg(frame) {
    return {
      header: { frame_id: frame },
      info: {
        width: 10, height: 10, resolution: 0.1,
        origin: {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
      data: new Array(100).fill(0),
    };
  }

  it('with tfClient: map message creates a SceneNode wrap at the map frame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf, continuous: true,
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
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf, continuous: true,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(fakeMapMsg('robot_0/map'));
    client.unsubscribe();
    expect(tf.__subscriberCount('robot_0/map')).toBe(0);
  });

  it('without tfClient: behavior unchanged (no node)', () => {
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OccupancyGridClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, continuous: true,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(fakeMapMsg('map'));
    expect(client.node).toBeFalsy();
  });
});
