import { describe, it, expect } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;

// PathShape calls createjs.Shape.call(this, this.graphics) — must be ES5
// function constructor so .call(this, ...) properly sets up the instance.
// PathShape uses this.scaleX / this.scaleY in setPath; these must resolve to
// a number. We set them on the FakeShape prototype so they're inherited.
function FakeShape(_graphics) {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

// FakeGraphics must track drawing commands so the test can verify that
// setPath populated the graphics object.
function FakeGraphics() {
  this.commands = [];
}
FakeGraphics.getRGB = function() { return '#000000'; };
FakeGraphics.prototype.clear = function() { this.commands = []; return this; };
FakeGraphics.prototype.setStrokeStyle = function() { this.commands.push('setStrokeStyle'); return this; };
FakeGraphics.prototype.beginStroke = function() { this.commands.push('beginStroke'); return this; };
FakeGraphics.prototype.beginFill = function() { this.commands.push('beginFill'); return this; };
FakeGraphics.prototype.moveTo = function() { this.commands.push('moveTo'); return this; };
FakeGraphics.prototype.lineTo = function() { this.commands.push('lineTo'); return this; };
FakeGraphics.prototype.endFill = function() { this.commands.push('endFill'); return this; };
FakeGraphics.prototype.endStroke = function() { this.commands.push('endStroke'); return this; };
FakeGraphics.prototype.drawRect = function() { this.commands.push('drawRect'); return this; };

function FakeBitmap(_image) {
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1;
}

function FakeContainer() {}
FakeContainer.prototype.addChild = function() {};
FakeContainer.prototype.addChildAt = function() {};

function FakeStage(_canvas) {
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1;
}
FakeStage.prototype.addChild = function() {};

globalThis.createjs = {
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Bitmap: FakeBitmap,
  Container: FakeContainer,
  Stage: FakeStage,
  Ticker: { framerate: 30, addEventListener: function() {} },
};

globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/models/PathShape.js');

describe('PathShape (baseline)', () => {
  it('constructs without throwing', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    expect(shape).toBeDefined();
  });

  it('exposes a setPath method', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    expect(typeof shape.setPath).toBe('function');
  });

  it('setPath accepts a nav_msgs/Path message and records graphics commands', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    shape.setPath({
      header: { frame_id: 'map' },
      poses: [
        { pose: { position: { x: 0, y: 0 } } },
        { pose: { position: { x: 1, y: 1 } } },
      ],
    });
    // After setPath with 2 poses: setStrokeStyle, beginStroke, moveTo, lineTo, endStroke
    expect(shape.graphics.commands.length).toBeGreaterThan(0);
  });

  it('setPath with multiple poses generates one moveTo and N-1 lineTo commands', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    shape.setPath({
      header: { frame_id: 'map' },
      poses: [
        { pose: { position: { x: 0, y: 0 } } },
        { pose: { position: { x: 1, y: 1 } } },
        { pose: { position: { x: 2, y: 2 } } },
      ],
    });
    expect(shape.graphics.commands.filter(c => c === 'moveTo').length).toBe(1);
    expect(shape.graphics.commands.filter(c => c === 'lineTo').length).toBe(2);
  });

  it('calling setPath twice clears previous commands', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    const path = {
      header: { frame_id: 'map' },
      poses: [
        { pose: { position: { x: 0, y: 0 } } },
        { pose: { position: { x: 1, y: 1 } } },
      ],
    };
    shape.setPath(path);
    const firstCount = shape.graphics.commands.length;
    shape.setPath(path);
    // clear() resets commands array, then new commands are added — count should equal first call
    expect(shape.graphics.commands.length).toBe(firstCount);
  });

  it('setPath with an empty poses array does not throw and leaves graphics empty', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    expect(() => shape.setPath({
      header: { frame_id: 'map' },
      poses: [],
    })).not.toThrow();
    expect(shape.graphics.commands).toEqual([]);
  });

  it('constructor accepts an initial empty path without throwing', () => {
    expect(() => new globalThis.ROS2D.PathShape({
      strokeSize: 0.1,
      strokeColor: 'red',
      path: {
        header: { frame_id: 'map' },
        poses: [],
      },
    })).not.toThrow();
  });

  it('inherits from createjs.Shape prototype', () => {
    const shape = new globalThis.ROS2D.PathShape({ strokeSize: 0.1, strokeColor: 'red' });
    expect(shape instanceof FakeShape).toBe(true);
  });
});
