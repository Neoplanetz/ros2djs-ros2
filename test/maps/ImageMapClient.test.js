import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

// Set up globals the source scripts rely on (they use bare globals, not require()).
globalThis.ROSLIB = fake.ROSLIB;

// Minimal createjs mock with all classes referenced by ImageMap and ImageMapClient.
// Use function constructors (not ES6 class) so they can be called with .call(this, ...)
// by the source's prototype-chain wiring.
function FakeBitmap(_image) {
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
}

function FakeShape() {}

function FakeContainer() {}
FakeContainer.prototype.addChild = function() {};

globalThis.createjs = {
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.EventEmitter = EventEmitter;

// Stub a minimal ROS2D global the source attaches itself to.
globalThis.ROS2D = globalThis.ROS2D ?? {};

// Pre-populate ROS2D.ImageMap so ImageMapClient can construct it.
// ImageMap extends createjs.Bitmap and uses ROSLIB.Pose internally.
globalThis.ROS2D.ImageMap = function FakeImageMap(options) {
  FakeBitmap.call(this, options.image);
  var message = options.message;
  this.pose = {
    position: message.origin.position,
    orientation: message.origin.orientation,
  };
  this.width = message.width;
  this.height = message.height;
  if (message.resolution) {
    this.y = -(this.height * message.resolution);
    this.scaleX = message.resolution;
    this.scaleY = message.resolution;
    this.width *= this.scaleX;
    this.height *= this.scaleY;
  }
  this.x += this.pose.position.x;
  this.y -= this.pose.position.y;
};
globalThis.ROS2D.ImageMap.prototype.__proto__ = FakeBitmap.prototype;

await import('../../src/maps/ImageMapClient.js');

describe('ImageMapClient (baseline, v1 API)', () => {
  beforeEach(() => {
    fake.topics.length = 0;
  });

  it('adds the image map to rootObject on construction', () => {
    const rootObject = { addChild: vi.fn() };
    new globalThis.ROS2D.ImageMapClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject,
      topic: '/map_metadata',
      image: 'http://example/map.png',
    });
    expect(rootObject.addChild).toHaveBeenCalledOnce();
  });
});
