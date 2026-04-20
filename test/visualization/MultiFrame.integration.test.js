import { describe, it, expect } from 'vitest';
import EventEmitter from 'eventemitter3';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';

const fake = createFakeRoslib();

function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.visible = true;
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
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

// Same simplified Pose stub used in client tests.
globalThis.ROSLIB.Pose = function(options) {
  this.position = { x: options.position.x, y: options.position.y, z: options.position.z };
  this.orientation = {
    x: options.orientation.x, y: options.orientation.y,
    z: options.orientation.z, w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  this.position.x += tf.translation.x;
  this.position.y += tf.translation.y;
  this.position.z += tf.translation.z;
};

await import('../../src/visualization/SceneNode.js');
const SceneNode = globalThis.ROS2D.SceneNode;

describe('SceneNode multi-frame integration', () => {
  it('two nodes on different frames remain independent under distinct transforms', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'world' });
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    const a = new SceneNode({
      tfClient: tf, frame_id: 'map',
      pose: { position: { x: 1, y: 1, z: 0 }, orientation: identity },
    });
    const b = new SceneNode({
      tfClient: tf, frame_id: 'robot_0/map',
      pose: { position: { x: 1, y: 1, z: 0 }, orientation: identity },
    });

    tf.__emit('map', {
      translation: { x: 10, y: 0, z: 0 }, rotation: identity,
    });
    tf.__emit('robot_0/map', {
      translation: { x: 100, y: 0, z: 0 }, rotation: identity,
    });

    expect(a.x).toBe(11); expect(a.y).toBe(-1);
    expect(b.x).toBe(101); expect(b.y).toBe(-1);

    // Re-emit only one frame; the other must not move.
    tf.__emit('map', { translation: { x: 20, y: 0, z: 0 }, rotation: identity });
    expect(a.x).toBe(21);
    expect(b.x).toBe(101);
  });
});
