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

// Stub NavigationArrow so we can inspect x/y/rotation assignments.
globalThis.ROS2D.NavigationArrow = function FakeArrow(opts) {
  this.opts = opts;
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
};
globalThis.ROS2D.NavigationArrow.prototype.__proto__ = FakeShape.prototype;

// SceneNode uses ROSLIB.Pose; stub it.
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
await import('../../src/clients/PoseStampedClient.js');
const PoseStampedClient = globalThis.ROS2D.PoseStampedClient;

beforeEach(() => { fake.topics.length = 0; });

describe('ROS2D.PoseStampedClient', () => {
  it('subscribes to /pose as geometry_msgs/PoseStamped by default', () => {
    const c = new PoseStampedClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/pose');
    expect(topic.messageType).toBe('geometry_msgs/PoseStamped');
    // Arrow starts hidden until first message.
    expect(c.arrow.visible).toBe(false);
  });

  it('maps pose.position.x/y (Y negated) and rotation from quaternion', () => {
    const root = new FakeContainer();
    const c = new PoseStampedClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ pose: { position: { x: 1, y: 2, z: 3 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } });
    expect(c.arrow.x).toBe(1);
    expect(c.arrow.y).toBe(-2);
    expect(c.arrow.rotation).toBe(0);
    expect(c.arrow.visible).toBe(true);
  });

  it('ignores malformed messages without a pose.position', () => {
    const c = new PoseStampedClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({}); // no pose
    expect(c.arrow.visible).toBe(false);
  });

  it('emits change on each valid message', () => {
    const c = new PoseStampedClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const onChange = vi.fn();
    c.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ pose: { position: { x: 0, y: 0 } } });
    topic.__emit({ pose: { position: { x: 1, y: 0 } } });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe detaches from topic and removes arrow', () => {
    const root = new FakeContainer();
    const c = new PoseStampedClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    c.unsubscribe();
    expect(topic._subs).toHaveLength(0);
    expect(root.children).not.toContain(c.arrow);
  });

  it('with tfClient: first message creates SceneNode wrapping the marker', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: {
        position: { x: 1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('map');
    expect(client.node.pose.position.x).toBe(1);
    expect(client.node.pose.position.y).toBe(2);
    expect(client.marker.x).toBe(0);
    expect(client.marker.y).toBe(0);
    expect(client.marker.visible).toBe(true);
  });

  it('with tfClient: subsequent messages call setPose, not recreate', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 1, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    const firstNode = client.node;
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 5, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    expect(client.node).toBe(firstNode);
    expect(client.node.pose.position.x).toBe(5);
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    topic.__emit({
      header: { frame_id: 'robot_0/map' },
      pose: { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    expect(client.node.frame_id).toBe('robot_0/map');
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('without tfClient: marker x/y set directly (unchanged)', () => {
    const client = new globalThis.ROS2D.PoseStampedClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(),
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({
      header: { frame_id: 'map' },
      pose: { position: { x: 7, y: 3, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
    });
    expect(client.marker.x).toBe(7);
    expect(client.marker.y).toBe(-3);
    expect(client.node).toBeFalsy();
  });
});
