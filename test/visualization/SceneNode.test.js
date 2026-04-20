import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import EventEmitter from 'eventemitter3';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';

const fake = createFakeRoslib();

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
  this.scaleX = 1; this.scaleY = 1;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.removeChild = function(c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); }
};

globalThis.createjs = { Container: FakeContainer };
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
// Match the sign convention used by the real Ros2D helper so tests can
// reason about rotation independently of quaternion internals.
globalThis.ROS2D.quaternionToGlobalTheta = function(q) {
  // return yaw in degrees, negated for canvas clockwise-positive rotation.
  var siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  var cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  return -Math.atan2(siny_cosp, cosy_cosp) * 180 / Math.PI;
};

// Minimal ROSLIB.Pose stub: stores fields and does transform composition
// equivalent to the real roslibjs implementation (translation add + rotation
// composition). Only used inside SceneNode._applyLatest.
globalThis.ROSLIB.Pose = function(options) {
  this.position = {
    x: options.position.x, y: options.position.y, z: options.position.z
  };
  this.orientation = {
    x: options.orientation.x, y: options.orientation.y,
    z: options.orientation.z, w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  // Rotate position by tf.rotation, then add tf.translation.
  var q = tf.rotation;
  var p = this.position;
  var ix =  q.w * p.x + q.y * p.z - q.z * p.y;
  var iy =  q.w * p.y + q.z * p.x - q.x * p.z;
  var iz =  q.w * p.z + q.x * p.y - q.y * p.x;
  var iw = -q.x * p.x - q.y * p.y - q.z * p.z;
  this.position = {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x
  };
  this.position.x += tf.translation.x;
  this.position.y += tf.translation.y;
  this.position.z += tf.translation.z;
  // Compose orientation: tf.rotation * this.orientation.
  var r = tf.rotation;
  var o = this.orientation;
  this.orientation = {
    x: r.x * o.w + r.y * o.z - r.z * o.y + r.w * o.x,
    y:-r.x * o.z + r.y * o.w + r.z * o.x + r.w * o.y,
    z: r.x * o.y - r.y * o.x + r.z * o.w + r.w * o.z,
    w:-r.x * o.x - r.y * o.y - r.z * o.z + r.w * o.w
  };
};

await import('../../src/visualization/SceneNode.js');

const SceneNode = globalThis.ROS2D.SceneNode;
const identityPose = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};
const identityTransform = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};

afterEach(() => { vi.useRealTimers(); });

describe('ROS2D.SceneNode', () => {
  it('is hidden on construction until the first TF callback arrives', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    expect(node.visible).toBe(false);
  });

  it('subscribes to the given frame on construction', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    new SceneNode({ tfClient: tf, frame_id: 'base_link' });
    expect(tf.__subscriberCount('base_link')).toBe(1);
  });

  it('becomes visible after the first TF callback', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    tf.__emit('base_link', identityTransform);
    expect(node.visible).toBe(true);
  });

  it('applies Y-negate exactly once (translation y=1 => node.y=-1)', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', pose: identityPose });
    tf.__emit('base_link', {
      translation: { x: 2, y: 1, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(node.x).toBe(2);
    expect(node.y).toBe(-1);
    expect(node.rotation).toBe(0);
  });

  it('attaches options.object as a child', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const child = { __stub: true };
    const node = new SceneNode({ tfClient: tf, frame_id: 'base_link', object: child });
    expect(node.children).toContain(child);
  });

  it('throws if tfClient is missing', () => {
    expect(() => new SceneNode({ frame_id: 'base_link' })).toThrow(/tfClient/);
  });

  it('throws if frame_id is missing', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    expect(() => new SceneNode({ tfClient: tf })).toThrow(/frame_id/);
  });

  it('composes pose + transform (translation only) correctly', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const node = new SceneNode({
      tfClient: tf,
      frame_id: 'base_link',
      pose: {
        position: { x: 1, y: 2, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    });
    tf.__emit('base_link', {
      translation: { x: 10, y: 20, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    // pose.position + tf.translation = (11, 22, 0). Y negated for canvas.
    expect(node.x).toBe(11);
    expect(node.y).toBe(-22);
  });
});
