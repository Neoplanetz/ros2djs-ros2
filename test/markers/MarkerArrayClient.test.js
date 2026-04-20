import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

// Reuse the same minimal createjs mock shape from Marker.test.js so the
// real Marker module can build child shapes inside the client.
function FakeGraphics() { this.commands = []; }
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
function FakeText(text, font, color) { this.text = text; this.font = font; this.color = color; this.scaleY = 1; }
function FakeContainer() {
  this.children = [];
  this.x = 0; this.y = 0; this.rotation = 0; this.scaleX = 1; this.scaleY = 1;
}
FakeContainer.prototype.addChild = function(c) { this.children.push(c); return this; };
FakeContainer.prototype.removeChild = function(c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); }
};
function FakeStage() { this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1; }
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

globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

// Stub ArrowShape because Marker uses it for ARROW (type 0).
globalThis.ROS2D.ArrowShape = function FakeArrowShape(opts) {
  this.opts = opts;
  FakeContainer.call(this);
};
globalThis.ROS2D.ArrowShape.prototype = Object.create(FakeContainer.prototype);

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
  // Orientation composition not needed for these tests (tf rotation = identity).
};

await import('../../src/visualization/SceneNode.js');
await import('../../src/markers/Marker.js');
await import('../../src/markers/MarkerArrayClient.js');

const MarkerArrayClient = globalThis.ROS2D.MarkerArrayClient;

const idPose = {
  position: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};
const white = { r: 1, g: 1, b: 1, a: 1 };
const unitScale = { x: 1, y: 1, z: 1 };

function cubeMsg(ns, id, action, lifetimeSec) {
  return {
    header: { frame_id: 'map' },
    ns: ns, id: id, type: 1, action: action,
    pose: idPose, scale: unitScale, color: white,
    lifetime: { sec: lifetimeSec || 0, nanosec: 0 },
  };
}

beforeEach(() => {
  fake.topics.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ROS2D.MarkerArrayClient', () => {
  it('subscribes to /markers as visualization_msgs/MarkerArray by default', () => {
    new MarkerArrayClient({ ros: new fake.ROSLIB.Ros() });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/markers');
    expect(topic.messageType).toBe('visualization_msgs/MarkerArray');
  });

  it('honors a custom topic name', () => {
    new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), topic: '/visualization_marker_array' });
    const topic = fake.topics[fake.topics.length - 1];
    expect(topic.name).toBe('/visualization_marker_array');
  });

  it('with tfClient: each ADD creates a SceneNode wrapping a Marker({applyPose:false})', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(root.children).toHaveLength(1);
    // The child is the SceneNode; the Marker is inside it.
    const node = root.children[0];
    expect(node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(node.frame_id).toBe('map');
    expect(client.markers['a:1']).toBeDefined();
    expect(tf.__subscriberCount('map')).toBe(1);
  });

  it('with tfClient: DELETE unsubscribes the SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(tf.__subscriberCount('map')).toBe(1);
    topic.__emit({ markers: [cubeMsg('a', 1, 2)] }); // DELETE
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(client.markers['a:1']).toBeUndefined();
  });

  it('with tfClient: DELETEALL unsubscribes every SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('b', 2, 0)] });
    expect(tf.__subscriberCount('map')).toBe(2);
    topic.__emit({ markers: [cubeMsg('', 0, 3)] }); // DELETEALL
    expect(tf.__subscriberCount('map')).toBe(0);
  });

  it('with tfClient: unsubscribe() drops all SceneNode subscriptions', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('b', 2, 0)] });
    client.unsubscribe();
    expect(tf.__subscriberCount('map')).toBe(0);
    expect(root.children).toHaveLength(0);
  });

  it('with tfClient: multi-frame markers subscribe separately', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root, tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];
    const m1 = cubeMsg('a', 1, 0); m1.header.frame_id = 'map';
    const m2 = cubeMsg('b', 2, 0); m2.header.frame_id = 'robot_0/map';
    topic.__emit({ markers: [m1, m2] });
    expect(tf.__subscriberCount('map')).toBe(1);
    expect(tf.__subscriberCount('robot_0/map')).toBe(1);
  });

  it('without tfClient: existing rootObject-frame behavior is unchanged', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({
      ros: new fake.ROSLIB.Ros(), rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    // No SceneNode wrapping — the direct child is a Marker.
    const child = root.children[0];
    expect(child).not.toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.markers['a:1']).toBeDefined();
  });

  it('ADD action adds a child to rootObject and stores under ns:id key', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('shapes', 7, 0)] });
    expect(root.children).toHaveLength(1);
    expect(client.markers['shapes:7']).toBeDefined();
  });

  it('emits "change" each time a message is processed', () => {
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: new FakeContainer() });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [] });
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('MODIFY (re-ADD with same ns+id) replaces the previous child', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    const firstChild = root.children[0];
    topic.__emit({ markers: [cubeMsg('a', 1, 0)] });
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).not.toBe(firstChild);
    expect(Object.keys(client.markers)).toEqual(['a:1']);
  });

  it('DELETE (action=2) removes only the matching ns+id', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('a', 2, 0)] });
    expect(root.children).toHaveLength(2);
    topic.__emit({ markers: [cubeMsg('a', 1, 2)] });
    expect(root.children).toHaveLength(1);
    expect(client.markers['a:1']).toBeUndefined();
    expect(client.markers['a:2']).toBeDefined();
  });

  it('DELETEALL (action=3) clears every marker', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0), cubeMsg('b', 5, 0)] });
    expect(root.children).toHaveLength(2);
    topic.__emit({ markers: [cubeMsg('', 0, 3)] });
    expect(root.children).toHaveLength(0);
    expect(Object.keys(client.markers)).toHaveLength(0);
  });

  it('lifetime > 0 auto-removes the marker after that many ms', () => {
    vi.useFakeTimers();
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0, 2)] }); // 2s lifetime
    expect(root.children).toHaveLength(1);
    vi.advanceTimersByTime(1999);
    expect(root.children).toHaveLength(1);
    vi.advanceTimersByTime(2);
    expect(root.children).toHaveLength(0);
    expect(client.markers['a:1']).toBeUndefined();
    // First emit (subscribe) + auto-removal emit
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('MODIFY before lifetime expires resets the timer and does not double-remove', () => {
    vi.useFakeTimers();
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0, 2)] });
    vi.advanceTimersByTime(1500);
    topic.__emit({ markers: [cubeMsg('a', 1, 0, 2)] }); // re-add
    vi.advanceTimersByTime(1500); // 3s total — original timer would have fired
    expect(root.children).toHaveLength(1);
    expect(client.markers['a:1']).toBeDefined();
  });

  it('unsubscribe() clears subscribers, timers, and rendered markers', () => {
    vi.useFakeTimers();
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [cubeMsg('a', 1, 0, 60)] });
    expect(root.children).toHaveLength(1);
    expect(topic._subs).toHaveLength(1);

    client.unsubscribe();

    expect(topic._subs).toHaveLength(0);
    expect(root.children).toHaveLength(0);
    expect(Object.keys(client.markers)).toHaveLength(0);
    // Verify the timer was cleared: advance past lifetime, no further removal attempts.
    vi.advanceTimersByTime(120 * 1000);
    expect(root.children).toHaveLength(0);
  });

  it('handles empty markers array gracefully (just emits change)', () => {
    const root = new FakeContainer();
    const client = new MarkerArrayClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];
    topic.__emit({ markers: [] });
    expect(root.children).toHaveLength(0);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
