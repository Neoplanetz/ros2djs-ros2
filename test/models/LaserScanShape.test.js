import { describe, it, expect } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;

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

function FakeContainer() {}

globalThis.createjs = {
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Container: FakeContainer,
};

globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/models/LaserScanShape.js');

describe('LaserScanShape', () => {
  it('constructs with default options', () => {
    const shape = new globalThis.ROS2D.LaserScanShape();
    expect(shape.pointSize).toBe(0.03);
    expect(shape.sampleStep).toBe(1);
    expect(shape.negateY).toBe(true);
  });

  it('renders valid scan ranges as circles and negates y by default', () => {
    const shape = new globalThis.ROS2D.LaserScanShape({ pointSize: 0.2 });
    shape.setScan({
      angle_min: 0,
      angle_increment: Math.PI / 2,
      range_min: 0.1,
      range_max: 10,
      ranges: [1, 2],
    });

    expect(shape.graphics.commands).toContain('beginFill');
    expect(shape.graphics.circles).toHaveLength(2);
    expect(shape.graphics.circles[0].x).toBeCloseTo(1);
    expect(shape.graphics.circles[0].y).toBeCloseTo(0);
    expect(shape.graphics.circles[0].radius).toBeCloseTo(0.1);
    expect(shape.graphics.circles[1].x).toBeCloseTo(0, 6);
    expect(shape.graphics.circles[1].y).toBeCloseTo(-2, 6);
  });

  it('skips invalid ranges and applies maxRange filtering', () => {
    const shape = new globalThis.ROS2D.LaserScanShape({ maxRange: 2.5 });
    shape.setScan({
      angle_min: 0,
      angle_increment: 0.1,
      range_min: 0.5,
      range_max: 10,
      ranges: [1, NaN, 0.2, Infinity, 4],
    });

    expect(shape.graphics.circles).toHaveLength(1);
    expect(shape.graphics.circles[0].x).toBeCloseTo(1);
  });

  it('honors sampleStep when drawing the scan', () => {
    const shape = new globalThis.ROS2D.LaserScanShape({ sampleStep: 2 });
    shape.setScan({
      angle_min: 0,
      angle_increment: 0.5,
      range_min: 0,
      range_max: 10,
      ranges: [1, 1, 1, 1],
    });

    expect(shape.graphics.circles).toHaveLength(2);
  });

  it('can render in ROS coordinates without y negation', () => {
    const shape = new globalThis.ROS2D.LaserScanShape({ negateY: false });
    shape.setScan({
      angle_min: Math.PI / 2,
      angle_increment: 1,
      range_min: 0,
      range_max: 10,
      ranges: [1],
    });

    expect(shape.graphics.circles).toHaveLength(1);
    expect(shape.graphics.circles[0].y).toBeCloseTo(1, 6);
  });
});
