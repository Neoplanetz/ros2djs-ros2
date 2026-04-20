import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

function FakeShape() { this.setPathCalls = []; }
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeContainer() {
  this.children = [];
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); };
FakeContainer.prototype.removeChild = function(c) {
  const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
};

globalThis.createjs = {
  Shape: FakeShape,
  Container: FakeContainer,
  Graphics: class { static getRGB() { return '#000'; } },
  Stage: class {},
  Bitmap: class {},
  Ticker: { framerate: 30, addEventListener() {} },
};
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};

// Stub PathShape so we do not depend on its actual createjs.Shape inheritance.
globalThis.ROS2D.PathShape = function FakePathShape(opts) {
  this.opts = opts;
  this.paths = [];
};
globalThis.ROS2D.PathShape.prototype.setPath = function(p) { this.paths.push(p); };
globalThis.ROS2D.PathShape.prototype.__proto__ = FakeShape.prototype;

// SceneNode uses ROSLIB.Pose; stub it the same way SceneNode.test does.
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
  this.position = {
    x: this.position.x + tf.translation.x,
    y: this.position.y + tf.translation.y,
    z: this.position.z + tf.translation.z,
  };
};
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

await import('../../src/visualization/SceneNode.js');
await import('../../src/clients/PathClient.js');
const PathClient = globalThis.ROS2D.PathClient;

beforeEach(() => { fake.topics.length = 0; });

describe('ROS2D.PathClient', () => {
  it('subscribes to /path as nav_msgs/Path by default and adds a PathShape', () => {
    const root = new FakeContainer();
    const c = new PathClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/path');
    expect(topic.messageType).toBe('nav_msgs/Path');
    expect(root.children).toContain(c.pathShape);
  });

  it('forwards strokeSize/strokeColor to the underlying PathShape', () => {
    const root = new FakeContainer();
    const c = new PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
      strokeSize: 0.1, strokeColor: '#ff0000',
    });
    expect(c.pathShape.opts.strokeSize).toBe(0.1);
    expect(c.pathShape.opts.strokeColor).toBe('#ff0000');
  });

  it('calls pathShape.setPath on each message and emits change', () => {
    const root = new FakeContainer();
    const c = new PathClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const onChange = vi.fn();
    c.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    const msg = { poses: [{ pose: { position: { x: 0, y: 0 } } }] };
    topic.__emit(msg);
    expect(c.pathShape.paths).toHaveLength(1);
    expect(c.pathShape.paths[0]).toBe(msg);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('unsubscribe() detaches from topic and removes the shape', () => {
    const root = new FakeContainer();
    const c = new PathClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic._subs).toHaveLength(1);
    c.unsubscribe();
    expect(topic._subs).toHaveLength(0);
    expect(root.children).not.toContain(c.pathShape);
  });

  it('with tfClient: first message creates a SceneNode wrapping pathShape', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    expect(client.node).toBeFalsy();
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('map');
    expect(root.children).toContain(client.node);
    expect(root.children).not.toContain(client.pathShape);
  });

  it('with tfClient: frame_id change triggers setFrame', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(1);
    topic.__emit({ header: { frame_id: 'robot_0/map' }, poses: [] });
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
    expect(client.node.frame_id).toBe('robot_0/map');
  });

  it('with tfClient: unsubscribe() detaches from TF', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ header: { frame_id: 'map' }, poses: [] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
  });

  it('without tfClient: pathShape is added directly to rootObject (unchanged)', () => {
    const root = new FakeContainer();
    const client = new globalThis.ROS2D.PathClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    expect(root.children).toContain(client.pathShape);
    expect(client.node).toBeFalsy();
  });
});
