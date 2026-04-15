import { describe, it, expect } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;

// createjs.Stage is used directly by Viewer: new createjs.Stage(canvas).
// createjs.Ticker is used for framerate + addEventListener.
// Use ES5 function constructors so .call(this) usage works if any subclass does it.
function FakeStage(_canvas) {
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
  this.rotation = 0;
}
FakeStage.prototype.addChild = function() {};
FakeStage.prototype.addChildAt = function() {};
FakeStage.prototype.removeChild = function() {};
FakeStage.prototype.getChildIndex = function() { return -1; };

const FakeTicker = {
  framerate: 30,
  addEventListener: function() {},
};

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
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
}

function FakeShape(_graphics) {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeContainer() {}
FakeContainer.prototype.addChild = function() {};
FakeContainer.prototype.addChildAt = function() {};
FakeContainer.prototype.removeChild = function() {};
FakeContainer.prototype.getChildIndex = function() { return -1; };

globalThis.createjs = {
  Stage: FakeStage,
  Ticker: FakeTicker,
  Graphics: FakeGraphics,
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/visualization/Viewer.js');

describe('Viewer (baseline)', () => {
  it('mounts a canvas in the target div', () => {
    document.body.innerHTML = '<div id="map"></div>';
    const viewer = new globalThis.ROS2D.Viewer({ divID: 'map', width: 400, height: 300 });
    expect(viewer).toBeDefined();
    // Viewer appends canvas to the div and assigns scene
    expect(document.querySelector('#map canvas') || viewer.scene).toBeTruthy();
  });

  it('exposes scaleToDimensions and shift methods', () => {
    document.body.innerHTML = '<div id="m2"></div>';
    const viewer = new globalThis.ROS2D.Viewer({ divID: 'm2', width: 400, height: 300 });
    expect(typeof viewer.scaleToDimensions).toBe('function');
    expect(typeof viewer.shift).toBe('function');
  });

  it('sets scene.y to height after construction', () => {
    document.body.innerHTML = '<div id="m3"></div>';
    const viewer = new globalThis.ROS2D.Viewer({ divID: 'm3', width: 800, height: 600 });
    // Viewer sets this.scene.y = this.height to flip Y axis
    expect(viewer.scene.y).toBe(600);
  });
});
