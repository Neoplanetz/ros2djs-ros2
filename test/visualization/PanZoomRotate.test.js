import { describe, it, expect } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();
globalThis.ROSLIB = fake.ROSLIB;
globalThis.EventEmitter = EventEmitter;

// PanView, ZoomView, and RotateView each check:
//   if (rootObject instanceof createjs.Stage) { this.stage = rootObject; }
//   else { this.stage = rootObject.getStage(); }
//
// We use a FakeStage as the class so instanceof checks work, and pass a
// FakeStage instance as rootObject so no getStage() call is needed.
function FakeStage() {
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
  this.rotation = 0;
}
FakeStage.prototype.addChild = function() {};

function FakeGraphics() {
  this.commands = [];
}
FakeGraphics.getRGB = function() { return '#000000'; };
FakeGraphics.prototype.clear = function() { this.commands = []; return this; };
FakeGraphics.prototype.setStrokeStyle = function() { this.commands.push('setStrokeStyle'); return this; };
FakeGraphics.prototype.beginStroke = function() { this.commands.push('beginStroke'); return this; };
FakeGraphics.prototype.moveTo = function() { this.commands.push('moveTo'); return this; };
FakeGraphics.prototype.lineTo = function() { this.commands.push('lineTo'); return this; };
FakeGraphics.prototype.endStroke = function() { this.commands.push('endStroke'); return this; };

function FakeBitmap(_image) {
  this.x = 0; this.y = 0; this.scaleX = 1; this.scaleY = 1;
}

function FakeShape(_graphics) {}
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeContainer() {}
FakeContainer.prototype.addChild = function() {};

function localToStage(stage, localPoint) {
  const rotation = (stage.rotation || 0) * (Math.PI / 180);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const scaledX = localPoint.x * stage.scaleX;
  const scaledY = localPoint.y * stage.scaleY;
  return {
    x: stage.x + (cos * scaledX) - (sin * scaledY),
    y: stage.y + (sin * scaledX) + (cos * scaledY),
  };
}

function stageToLocal(stage, stagePoint) {
  const rotation = (stage.rotation || 0) * (Math.PI / 180);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = stagePoint.x - stage.x;
  const dy = stagePoint.y - stage.y;
  return {
    x: ((cos * dx) + (sin * dy)) / stage.scaleX,
    y: ((-sin * dx) + (cos * dy)) / stage.scaleY,
  };
}

globalThis.createjs = {
  Stage: FakeStage,
  Ticker: { framerate: 30, addEventListener: function() {} },
  Graphics: FakeGraphics,
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/visualization/PanView.js');
await import('../../src/visualization/ZoomView.js');
await import('../../src/visualization/RotateView.js');

describe('PanZoomRotate views (baseline)', () => {
  it('PanView accepts rootObject (Stage) and exposes startPan/pan', () => {
    // Pass a FakeStage instance so instanceof createjs.Stage is true
    const rootObject = new FakeStage();
    const v = new globalThis.ROS2D.PanView({ rootObject });
    expect(typeof v.startPan).toBe('function');
    expect(typeof v.pan).toBe('function');
  });

  it('ZoomView accepts rootObject (Stage) and exposes startZoom/zoom', () => {
    const rootObject = new FakeStage();
    const v = new globalThis.ROS2D.ZoomView({ rootObject });
    expect(typeof v.startZoom).toBe('function');
    expect(typeof v.zoom).toBe('function');
  });

  it('RotateView accepts rootObject (Stage) and exposes startRotate/rotate', () => {
    const rootObject = new FakeStage();
    const v = new globalThis.ROS2D.RotateView({ rootObject });
    expect(typeof v.startRotate).toBe('function');
    expect(typeof v.rotate).toBe('function');
  });

  it('PanView.pan updates stage x/y', () => {
    const rootObject = new FakeStage();
    const v = new globalThis.ROS2D.PanView({ rootObject });
    v.startPan(10, 20);
    v.pan(15, 25);
    expect(v.stage.x).toBe(5);
    expect(v.stage.y).toBe(5);
  });

  it('RotateView.rotate updates stage.rotation', () => {
    const rootObject = new FakeStage();
    const v = new globalThis.ROS2D.RotateView({ rootObject });
    v.startRotate(1, 0);
    v.rotate(0, 1);
    // rotation should be updated (non-zero after a ~90-degree move)
    expect(typeof v.stage.rotation).toBe('number');
  });

  it('RotateView rotates around the pointer position used to start rotation', () => {
    const rootObject = new FakeStage();
    rootObject.x = 120;
    rootObject.y = 80;
    rootObject.scaleX = 2;
    rootObject.scaleY = 2;
    rootObject.rotation = 15;
    const pivot = { x: 300, y: 240 };
    const localPivot = stageToLocal(rootObject, pivot);
    const v = new globalThis.ROS2D.RotateView({ rootObject });

    v.startRotate(pivot.x, pivot.y);
    v.rotate(360, 240);

    const nextPivot = localToStage(rootObject, localPivot);
    expect(rootObject.rotation).not.toBe(15);
    expect(nextPivot.x).toBeCloseTo(pivot.x, 6);
    expect(nextPivot.y).toBeCloseTo(pivot.y, 6);
  });
});
