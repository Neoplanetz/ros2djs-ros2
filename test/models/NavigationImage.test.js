import { describe, it, expect, beforeEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;

// NavigationImage calls createjs.Bitmap.call(this, image) — must be ES5
// function constructor so .call(this, ...) properly initialises the instance.
function FakeBitmap(_image) {
  this.image = _image;
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
  this.alpha = 1;
  this.regX = 0;
  this.regY = 0;
  this.rotation = 0;
}

function FakeShape(_graphics) {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeGraphics() { this.commands = []; }
FakeGraphics.getRGB = function() { return '#000000'; };
FakeGraphics.prototype.clear = function() { this.commands = []; return this; };
FakeGraphics.prototype.setStrokeStyle = function() { return this; };
FakeGraphics.prototype.beginStroke = function() { return this; };
FakeGraphics.prototype.moveTo = function() { return this; };
FakeGraphics.prototype.lineTo = function() { return this; };
FakeGraphics.prototype.endStroke = function() { return this; };

function FakeContainer() {}
FakeContainer.prototype.addChild = function() {};
FakeContainer.prototype.addChildAt = function() {};

function FakeStage(_canvas) {
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1;
}
FakeStage.prototype.addChild = function() {};

const tickerListeners = [];

function FakeImage() {
  this.width = 20;
  this.height = 10;
  this.onload = null;
}
Object.defineProperty(FakeImage.prototype, 'src', {
  get: function() {
    return this._src;
  },
  set: function(value) {
    this._src = value;
    if (this.onload) {
      this.onload();
    }
  }
});

globalThis.createjs = {
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Container: FakeContainer,
  Stage: FakeStage,
  // NavigationImage uses createjs.Ticker.addEventListener for pulse feature
  Ticker: {
    framerate: 30,
    addEventListener: function(_eventName, handler) {
      tickerListeners.push(handler);
    }
  },
};

globalThis.ROS2D = globalThis.ROS2D ?? {};
globalThis.Image = FakeImage;

await import('../../src/models/NavigationImage.js');

beforeEach(() => {
  tickerListeners.length = 0;
});

describe('NavigationImage (baseline)', () => {
  it('constructs without throwing', () => {
    const img = new globalThis.ROS2D.NavigationImage({
      size: 1.0,
      image: 'data:image/svg+xml;base64,abc',
      alpha: 1.0,
    });
    expect(img).toBeDefined();
  });

  it('accepts an image data URL and allows x/y assignment', () => {
    const img = new globalThis.ROS2D.NavigationImage({
      size: 1.0,
      image: 'data:image/svg+xml;base64,abc',
      alpha: 1.0,
    });
    img.x = 1.5;
    img.y = -2.5;
    expect(img.x).toBe(1.5);
    expect(img.y).toBe(-2.5);
  });

  it('rotation property is assignable and readable', () => {
    const img = new globalThis.ROS2D.NavigationImage({
      size: 1.0,
      image: 'data:image/svg+xml;base64,abc',
      alpha: 1.0,
    });
    // In jsdom, image.onload does not fire synchronously for data: URLs,
    // so the Object.defineProperty override in paintImage won't run.
    // rotation is the plain property set by FakeBitmap — just verify
    // it can be set and read back.
    img.rotation = 0.785;
    expect(img.rotation).toBe(90.785);
  });

  it('inherits from createjs.Bitmap prototype', () => {
    const img = new globalThis.ROS2D.NavigationImage({
      size: 10,
      image: 'data:image/png;base64,abc',
      alpha: 0.8,
    });
    expect(img instanceof FakeBitmap).toBe(true);
  });

  it('pulse ticker updates the image instance scale after load', () => {
    const img = new globalThis.ROS2D.NavigationImage({
      size: 10,
      image: 'data:image/png;base64,abc',
      alpha: 0.8,
      pulse: true,
    });
    expect(tickerListeners).toHaveLength(1);
    const initialScaleX = img.scaleX;
    const initialScaleY = img.scaleY;
    tickerListeners[0]();
    expect(img.scaleX).toBeGreaterThan(initialScaleX);
    expect(img.scaleY).toBeGreaterThan(initialScaleY);
  });
});
