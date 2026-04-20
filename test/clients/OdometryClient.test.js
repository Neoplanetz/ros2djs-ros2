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
await import('../../src/clients/OdometryClient.js');
const OdometryClient = globalThis.ROS2D.OdometryClient;

beforeEach(() => { fake.topics.length = 0; });

function odom(x, y) {
  return {
    pose: {
      pose: { position: { x: x, y: y }, orientation: { x: 0, y: 0, z: 0, w: 1 } },
      covariance: new Array(36).fill(0),
    },
    twist: { twist: {}, covariance: new Array(36).fill(0) },
  };
}

function odomMsg(frame, x, y) {
  return {
    header: { frame_id: frame },
    pose: {
      pose: {
        position: { x: x, y: y, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
      covariance: new Array(36).fill(0),
    },
  };
}

describe('ROS2D.OdometryClient', () => {
  it('subscribes to /odom as nav_msgs/Odometry by default', () => {
    const c = new OdometryClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/odom');
    expect(topic.messageType).toBe('nav_msgs/Odometry');
    expect(c.marker.visible).toBe(false);
  });

  it('extracts pose from message.pose.pose (covariance-wrapped)', () => {
    const c = new OdometryClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odom(2, 4));
    expect(c.marker.x).toBe(2);
    expect(c.marker.y).toBe(-4); // Y negated
    expect(c.marker.visible).toBe(true);
  });

  it('ignores malformed messages with no pose.pose.position', () => {
    const c = new OdometryClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ pose: {} });
    expect(c.marker.visible).toBe(false);
  });

  it('emits change on each valid message', () => {
    const c = new OdometryClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const onChange = vi.fn();
    c.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odom(0, 0));
    topic.__emit(odom(1, 1));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('uses caller-provided shape when options.shape is set', () => {
    const customShape = { x: 0, y: 0, rotation: 0, visible: true };
    const root = new FakeContainer();
    const c = new OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, shape: customShape,
    });
    expect(c.marker).toBe(customShape);
    expect(root.children).toContain(customShape);

    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odom(3, -5));
    expect(customShape.x).toBe(3);
    expect(customShape.y).toBe(5);
  });

  it('unsubscribe detaches from topic and removes marker', () => {
    const root = new FakeContainer();
    const c = new OdometryClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    c.unsubscribe();
    expect(topic._subs).toHaveLength(0);
    expect(root.children).not.toContain(c.marker);
  });

  it('with tfClient: first message creates SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 1, 2));
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('odom');
    expect(client.node.pose.position.y).toBe(2);
    expect(client.marker.x).toBe(0);
  });

  it('with tfClient: subsequent messages call setPose', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 1, 0));
    const first = client.node;
    topic.__emit(odomMsg('odom', 9, 0));
    expect(client.node).toBe(first);
    expect(client.node.pose.position.x).toBe(9);
  });

  it('with tfClient: frame change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(), tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 0, 0));
    topic.__emit(odomMsg('robot_0/odom', 0, 0));
    expect(tf.__subscriberCount('odom')).toBe(0);
    expect(tf.__subscriberCount('robot_0/odom')).toBe(1);
  });

  it('without tfClient: marker x/y set directly (unchanged)', () => {
    const client = new globalThis.ROS2D.OdometryClient({
      ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer(),
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit(odomMsg('odom', 7, 3));
    expect(client.marker.x).toBe(7);
    expect(client.marker.y).toBe(-3);
    expect(client.node).toBeFalsy();
  });
});
