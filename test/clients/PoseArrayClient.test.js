import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

function FakeShape() {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeContainer() { this.children = []; }
FakeContainer.prototype.addChild = function(c) { this.children.push(c); };
FakeContainer.prototype.removeChild = function(c) {
  const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
};
FakeContainer.prototype.removeAllChildren = function() { this.children.length = 0; };

globalThis.createjs = {
  Shape: FakeShape, Container: FakeContainer,
  Graphics: class { static getRGB() { return '#000'; } },
  Stage: class {}, Bitmap: class {},
  Ticker: { framerate: 30, addEventListener() {} },
};
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

globalThis.ROS2D.NavigationArrow = function FakeArrow(opts) {
  this.opts = opts;
  this.x = 0; this.y = 0; this.rotation = 0;
};
globalThis.ROS2D.NavigationArrow.prototype.__proto__ = FakeShape.prototype;

await import('../../src/clients/PoseArrayClient.js');
const PoseArrayClient = globalThis.ROS2D.PoseArrayClient;

beforeEach(() => { fake.topics.length = 0; });

function pa(poses) { return { poses: poses }; }
function pose(x, y) { return { position: { x: x, y: y }, orientation: { x: 0, y: 0, z: 0, w: 1 } }; }

describe('ROS2D.PoseArrayClient', () => {
  it('subscribes to /particlecloud as geometry_msgs/PoseArray by default', () => {
    new PoseArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/particlecloud');
    expect(topic.messageType).toBe('geometry_msgs/PoseArray');
  });

  it('creates one NavigationArrow per pose with negated Y', () => {
    const root = new FakeContainer();
    const c = new PoseArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(pa([pose(0, 0), pose(1, 2), pose(-1, -3)]));
    expect(c.container.children).toHaveLength(3);
    expect(c.container.children[1].x).toBe(1);
    expect(c.container.children[1].y).toBe(-2);
    expect(c.container.children[2].x).toBe(-1);
    expect(c.container.children[2].y).toBe(3);
  });

  it('replaces previous arrows on every message (no accumulation)', () => {
    const c = new PoseArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(pa([pose(0, 0), pose(1, 1)]));
    expect(c.container.children).toHaveLength(2);
    topic.__emit(pa([pose(2, 2)]));
    expect(c.container.children).toHaveLength(1);
    expect(c.container.children[0].x).toBe(2);
  });

  it('emits change on each message, including empty PoseArray', () => {
    const c = new PoseArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const onChange = vi.fn();
    c.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(pa([]));
    topic.__emit(pa([pose(0, 0)]));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe clears arrows and detaches from topic', () => {
    const root = new FakeContainer();
    const c = new PoseArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(pa([pose(0, 0), pose(1, 1)]));
    c.unsubscribe();
    expect(topic._subs).toHaveLength(0);
    expect(c.container.children).toHaveLength(0);
    expect(root.children).not.toContain(c.container);
  });
});
