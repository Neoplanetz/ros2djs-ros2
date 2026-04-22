import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

function FakeShape(graphics) {
  this.graphics = graphics;
}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeGraphics() {
  this.commands = [];
  this.circles = [];
}
FakeGraphics.getRGB = function() { return '#ff0000'; };
FakeGraphics.prototype.clear = function() {
  this.commands = [];
  this.circles = [];
  return this;
};
FakeGraphics.prototype.beginFill = function(color) {
  this.commands.push('beginFill');
  this.fillColor = color;
  return this;
};
FakeGraphics.prototype.drawCircle = function(x, y, radius) {
  this.commands.push('drawCircle');
  this.circles.push({ x, y, radius });
  return this;
};

function FakeContainer() {
  this.children = [];
  this.x = 0;
  this.y = 0;
  this.rotation = 0;
  this.visible = true;
}
FakeContainer.prototype.addChild = function(child) {
  this.children.push(child);
  return this;
};
FakeContainer.prototype.removeChild = function(child) {
  const index = this.children.indexOf(child);
  if (index >= 0) {
    this.children.splice(index, 1);
  }
};

globalThis.createjs = {
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Container: FakeContainer,
  Stage: class {},
  Bitmap: class {},
};
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};
globalThis.ROS2D.quaternionToGlobalTheta = function() { return 0; };

globalThis.ROSLIB.Pose = function(options) {
  this.position = {
    x: options.position.x,
    y: options.position.y,
    z: options.position.z
  };
  this.orientation = {
    x: options.orientation.x,
    y: options.orientation.y,
    z: options.orientation.z,
    w: options.orientation.w
  };
};
globalThis.ROSLIB.Pose.prototype.applyTransform = function(tf) {
  this.position = {
    x: this.position.x + tf.translation.x,
    y: this.position.y + tf.translation.y,
    z: this.position.z + tf.translation.z
  };
};

await import('../../src/visualization/SceneNode.js');
await import('../../src/models/LaserScanShape.js');
await import('../../src/clients/LaserScanClient.js');
const LaserScanClient = globalThis.ROS2D.LaserScanClient;

function scanMsg(frame) {
  return {
    header: { frame_id: frame },
    angle_min: 0,
    angle_increment: Math.PI / 2,
    range_min: 0.1,
    range_max: 10,
    ranges: [1, 2],
  };
}

beforeEach(() => {
  fake.topics.length = 0;
});

describe('ROS2D.LaserScanClient', () => {
  it('subscribes to /scan by default and attaches the shape directly without tf', () => {
    const root = new FakeContainer();
    const client = new LaserScanClient({ ros: new fake.ROSLIB.Ros(), rootObject: root });
    const topic = fake.topics[fake.topics.length - 1];

    expect(topic.name).toBe('/scan');
    expect(topic.messageType).toBe('sensor_msgs/LaserScan');
    expect(root.children).toContain(client.scanShape);
    expect(client.scanShape.negateY).toBe(true);
  });

  it('forwards rendering options to the underlying LaserScanShape', () => {
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: new FakeContainer(),
      pointSize: 0.2,
      pointColor: '#00ff00',
      sampleStep: 4,
      maxRange: 3,
    });

    expect(client.scanShape.pointSize).toBe(0.2);
    expect(client.scanShape.pointColor).toBe('#00ff00');
    expect(client.scanShape.sampleStep).toBe(4);
    expect(client.scanShape.maxRange).toBe(3);
  });

  it('renders a valid scan and emits change', () => {
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: new FakeContainer(),
    });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];

    topic.__emit(scanMsg('laser'));

    expect(client.scanShape.graphics.circles).toHaveLength(2);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ignores malformed scan messages', () => {
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: new FakeContainer(),
    });
    const onChange = vi.fn();
    client.on('change', onChange);
    const topic = fake.topics[fake.topics.length - 1];

    topic.__emit({ header: { frame_id: 'laser' }, ranges: [1, 2] });

    expect(client.scanShape.graphics.circles).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('with tfClient: first message creates a SceneNode wrapper', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const root = new FakeContainer();
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: root,
      tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];

    topic.__emit(scanMsg('laser'));

    expect(client.node).toBeInstanceOf(globalThis.ROS2D.SceneNode);
    expect(client.node.frame_id).toBe('laser');
    expect(root.children).toContain(client.node);
    expect(root.children).not.toContain(client.scanShape);
    expect(client.scanShape.negateY).toBe(false);
  });

  it('with tfClient: frame changes resubscribe the SceneNode', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: new FakeContainer(),
      tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];

    topic.__emit(scanMsg('laser'));
    expect(tf.__subscriberCount('laser')).toBe(1);
    topic.__emit(scanMsg('robot_0/laser'));

    expect(tf.__subscriberCount('laser')).toBe(0);
    expect(tf.__subscriberCount('robot_0/laser')).toBe(1);
    expect(client.node.frame_id).toBe('robot_0/laser');
  });

  it('with tfClient: ignores messages without a frame_id', () => {
    const tf = new fake.FakeTFClient({ fixedFrame: 'map' });
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: new FakeContainer(),
      tfClient: tf,
    });
    const topic = fake.topics[fake.topics.length - 1];

    topic.__emit({
      angle_min: 0,
      angle_increment: 1,
      range_min: 0,
      range_max: 10,
      ranges: [1],
    });

    expect(client.node).toBeFalsy();
    expect(client.scanShape.graphics.circles).toEqual([]);
  });

  it('unsubscribe detaches from the topic and removes the managed object', () => {
    const root = new FakeContainer();
    const client = new LaserScanClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject: root,
    });
    const topic = fake.topics[fake.topics.length - 1];

    client.unsubscribe();

    expect(topic._subs).toHaveLength(0);
    expect(root.children).not.toContain(client.scanShape);
  });
});
