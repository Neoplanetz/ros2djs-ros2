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
});
