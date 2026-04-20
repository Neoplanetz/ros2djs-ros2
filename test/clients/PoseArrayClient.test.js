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

  it('with tfClient: first message creates outer SceneNode wrapping the container', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      poses: [
        { position: { x: 1, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      ],
    });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    // The arrow inside the SceneNode's container keeps ROS y (not negated).
    const arrow = client.container.children[0];
    expect(arrow.x).toBe(1);
    expect(arrow.y).toBe(2);
  });

  it('without tfClient: arrows still use -y (unchanged)', () => {
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      poses: [
        { position: { x: 1, y: 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      ],
    });
    const arrow = client.container.children[0];
    expect(arrow.x).toBe(1);
    expect(arrow.y).toBe(-2);
    expect(client.node).toBeFalsy();
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    topic.__emit({ header: { frame_id: 'robot_0/map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('with tfClient: unsubscribe detaches from TF', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
  });
});
