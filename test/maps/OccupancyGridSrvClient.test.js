import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

// Set up globals the source scripts rely on (they use bare globals, not require()).
globalThis.ROSLIB = fake.ROSLIB;

// Minimal createjs mock.
class FakeBitmap {
  constructor(_canvas) {
    this.x = 0;
    this.y = 0;
    this.scaleX = 1;
    this.scaleY = 1;
  }
}

class FakeShape {
  constructor(_graphics) {}
}

class FakeContainer {
  constructor() {}
  addChild() {}
  getChildIndex() { return -1; }
  removeChild() {}
}

globalThis.createjs = {
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.EventEmitter = EventEmitter;

// Stub a minimal ROS2D global the source attaches itself to.
globalThis.ROS2D = globalThis.ROS2D ?? {};

// Pre-populate ROS2D.OccupancyGrid so OccupancyGridSrvClient can construct it.
globalThis.ROS2D.OccupancyGrid = function FakeOccupancyGrid(options) {
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
};
globalThis.ROS2D.OccupancyGrid.prototype.__proto__ = FakeBitmap.prototype;

await import('../../src/maps/OccupancyGridSrvClient.js');

describe('OccupancyGridSrvClient (v2 — plain object request)', () => {
  beforeEach(() => { fake.services.length = 0; });

  it('calls the configured service with a plain object payload (not ServiceRequest)', () => {
    const rootObject = { addChild: vi.fn(), getChildIndex: () => -1, removeChild: vi.fn() };
    new globalThis.ROS2D.OccupancyGridSrvClient({
      ros: new fake.ROSLIB.Ros(),
      rootObject,
      service: '/static_map',
    });
    const svc = fake.services[fake.services.length - 1];
    expect(svc.name).toBe('/static_map');
    expect(svc._lastCall).toBeDefined();
    expect(typeof svc._lastCall.req).toBe('object');
    expect(svc._lastCall.req.constructor.name).toBe('Object');
  });
});
