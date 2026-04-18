import { describe, it, expect } from 'vitest';

function FakeShape(graphics) { this.graphics = graphics; }
FakeShape.prototype.scaleX = 1;
FakeShape.prototype.scaleY = 1;

function FakeGraphics() {
  this.commands = [];
  this.strokeStyle = null;
  this.fills = [];
  this.points = [];
}
FakeGraphics.getRGB = function(r, g, b, a) {
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (a === undefined ? 1 : a) + ')';
};
FakeGraphics.prototype.setStrokeStyle = function(w) { this.commands.push('setStrokeStyle'); this.strokeStyle = w; return this; };
FakeGraphics.prototype.beginStroke = function() { this.commands.push('beginStroke'); return this; };
FakeGraphics.prototype.endStroke = function() { this.commands.push('endStroke'); return this; };
FakeGraphics.prototype.beginFill = function(c) { this.commands.push('beginFill'); this.fills.push(c); return this; };
FakeGraphics.prototype.endFill = function() { this.commands.push('endFill'); return this; };
FakeGraphics.prototype.moveTo = function(x, y) { this.commands.push('moveTo'); this.points.push([x, y]); return this; };
FakeGraphics.prototype.lineTo = function(x, y) { this.commands.push('lineTo'); this.points.push([x, y]); return this; };
FakeGraphics.prototype.closePath = function() { this.commands.push('closePath'); return this; };

globalThis.createjs = {
  Shape: FakeShape,
  Graphics: FakeGraphics,
  Container: function() {},
  Stage: function() {},
  Bitmap: function() {},
  Ticker: { framerate: 30, addEventListener: function() {} },
};
globalThis.ROS2D = globalThis.ROS2D ?? {};

await import('../../src/models/NavigationArrow.js');
const NavigationArrow = globalThis.ROS2D.NavigationArrow;

describe('ROS2D.NavigationArrow', () => {
  it('constructs with default options and yields a Shape instance', () => {
    const a = new NavigationArrow({});
    expect(a).toBeDefined();
    expect(a instanceof FakeShape).toBe(true);
  });

  it('emits the 7-point arrow polygon (1 moveTo + 6 lineTo + closePath)', () => {
    const a = new NavigationArrow({ size: 10 });
    const cmds = a.graphics.commands;
    expect(cmds.filter(c => c === 'moveTo').length).toBe(1);
    expect(cmds.filter(c => c === 'lineTo').length).toBe(6);
    expect(cmds).toContain('closePath');
    expect(cmds).toContain('beginFill');
    expect(cmds).toContain('endFill');
  });

  it('default strokeSize is 0 — no setStrokeStyle/beginStroke is emitted', () => {
    const a = new NavigationArrow({ size: 10 });
    expect(a.graphics.commands).not.toContain('setStrokeStyle');
    expect(a.graphics.commands).not.toContain('beginStroke');
    expect(a.graphics.commands).not.toContain('endStroke');
  });

  it('explicit strokeSize > 0 enables outline', () => {
    const a = new NavigationArrow({ size: 10, strokeSize: 0.05, strokeColor: '#000' });
    expect(a.graphics.commands).toContain('setStrokeStyle');
    expect(a.graphics.commands).toContain('beginStroke');
    expect(a.graphics.commands).toContain('endStroke');
    expect(a.graphics.strokeStyle).toBe(0.05);
  });

  it('arrow tip is at (+halfLen, 0) and tail spans [-halfLen, headBase]', () => {
    const size = 20;
    const a = new NavigationArrow({ size: size });
    const halfLen = size / 2;
    const headLen = size * 0.35;
    const headBase = halfLen - headLen;
    const shaftHalf = size * 0.08;

    // First point is tail-top, fourth point is the tip.
    expect(a.graphics.points[0]).toEqual([-halfLen, -shaftHalf]);
    expect(a.graphics.points[3]).toEqual([halfLen, 0]);
    // Last point closes back near tail-bottom.
    expect(a.graphics.points[6]).toEqual([-halfLen, shaftHalf]);
    // Head base x is shared by 2 points.
    expect(a.graphics.points[1][0]).toBe(headBase);
    expect(a.graphics.points[5][0]).toBe(headBase);
  });

  it('is symmetric across the x axis', () => {
    const a = new NavigationArrow({ size: 10 });
    // Pair every y with its negation among the polygon vertices.
    const ys = a.graphics.points.map(p => p[1]).sort((p, q) => p - q);
    expect(ys[0]).toBeCloseTo(-ys[ys.length - 1], 5);
  });

  it('honors custom ratios', () => {
    const a = new NavigationArrow({
      size: 100, headLengthRatio: 0.5, headWidthRatio: 0.4, shaftWidthRatio: 0.1,
    });
    expect(a.graphics.points[3]).toEqual([50, 0]);    // tip at +halfLen
    expect(a.graphics.points[2]).toEqual([0, -40]);   // head base at halfLen - headLen, headHalf=40
    expect(a.graphics.points[0]).toEqual([-50, -10]); // tail-top, shaftHalf=10
  });
});
