import { describe, expect, it, vi } from 'vitest';

vi.mock('createjs-module', () => {
  class FakeContainer {}
  return {
    default: {
      Container: FakeContainer,
    },
  };
});

vi.mock('roslib', () => ({}));

vi.mock('ros2d', () => ({
  Axis: class {},
  GridLines: class {},
  PanView: class {
    constructor({ rootObject }) {
      this.stage = rootObject;
      this.startPos = { x: 0, y: 0 };
    }
    startPan(x, y) {
      this.startPos = { x, y };
    }
    pan(x, y) {
      this.stage.x += x - this.startPos.x;
      this.stage.y += y - this.startPos.y;
      this.startPos = { x, y };
    }
  },
  RotateView: class {
    constructor({ rootObject }) {
      this.stage = rootObject;
      this.startAngle = 0;
    }
    startRotate(x, y) {
      this.startAngle = Math.atan2(y - this.stage.y, x - this.stage.x);
    }
    rotate(x, y) {
      const nextAngle = Math.atan2(y - this.stage.y, x - this.stage.x);
      this.stage.rotation += (nextAngle - this.startAngle) * (180 / Math.PI);
      this.startAngle = nextAngle;
    }
  },
  ZoomView: class {
    constructor({ rootObject }) {
      this.stage = rootObject;
      this.startScale = { x: 1, y: 1 };
      this.startShift = { x: 0, y: 0 };
      this.center = { x: 0, y: 0 };
    }
    startZoom(x, y) {
      this.center = { x, y };
      this.startScale = { x: this.stage.scaleX, y: this.stage.scaleY };
      this.startShift = { x: this.stage.x, y: this.stage.y };
    }
    zoom(factor) {
      this.stage.scaleX = this.startScale.x * factor;
      this.stage.scaleY = this.startScale.y * factor;
      this.stage.x = this.startShift.x - (this.center.x - this.startShift.x) * (factor - 1);
      this.stage.y = this.startShift.y - (this.center.y - this.startShift.y) * (factor - 1);
    }
  },
}));

import {
  createInitialMapViewFitter,
  enableViewerMouseControls,
  fitMapView,
} from '../../examples/src/lib/ros2dHelpers.js';

function createViewer(width, height) {
  return {
    width,
    height,
    scene: {
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
    },
    scaleToDimensions(nextWidth, nextHeight) {
      this.scene.scaleX = this.width / nextWidth;
      this.scene.scaleY = this.height / nextHeight;
    },
    shift(x, y) {
      this.scene.x_prev_shift = this.scene.x;
      this.scene.y_prev_shift = this.scene.y;
      this.scene.x -= x * this.scene.scaleX;
      this.scene.y += y * this.scene.scaleY;
    },
  };
}

describe('fitMapView', () => {
  it('preserves the map aspect ratio with a uniform scene scale', () => {
    const viewer = createViewer(800, 600);
    const mapLike = {
      x: 5,
      y: -12,
      width: 20,
      height: 10,
      pose: {
        position: { x: 999, y: 999 },
      },
    };

    fitMapView(viewer, mapLike);

    expect(viewer.scene.scaleX).toBe(40);
    expect(viewer.scene.scaleY).toBe(40);
  });

  it('centers the map bounds in the viewer', () => {
    const viewer = createViewer(800, 600);
    const mapLike = {
      x: 5,
      y: -12,
      width: 20,
      height: 10,
      pose: {
        position: { x: 999, y: 999 },
      },
    };

    fitMapView(viewer, mapLike);

    expect(viewer.scene.x).toBe(-200);
    expect(viewer.scene.y).toBe(580);
  });
});

describe('createInitialMapViewFitter', () => {
  it('fits the first valid map update and preserves user zoom on later updates', () => {
    const viewer = createViewer(800, 600);
    const fitInitialMapView = createInitialMapViewFitter(viewer);
    const mapLike = {
      x: 0,
      y: -10,
      width: 20,
      height: 10,
    };

    expect(fitInitialMapView(mapLike)).toBe(true);
    expect(viewer.scene.scaleX).toBe(40);

    viewer.scene.scaleX = 75;
    viewer.scene.scaleY = 75;
    viewer.scene.x = -120;
    viewer.scene.y = 860;

    expect(fitInitialMapView({ ...mapLike, x: 1 })).toBe(false);
    expect(viewer.scene.scaleX).toBe(75);
    expect(viewer.scene.scaleY).toBe(75);
    expect(viewer.scene.x).toBe(-120);
    expect(viewer.scene.y).toBe(860);
  });
});

describe('enableViewerMouseControls', () => {
  it('wires left-drag pan, right-drag rotate, and wheel zoom to the viewer stage', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0 }),
    });

    const viewer = {
      scene: {
        canvas,
        x: 0,
        y: 100,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      },
    };

    const dispose = enableViewerMouseControls(viewer);

    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 20 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 25, clientY: 35 }));
    window.dispatchEvent(new MouseEvent('mouseup'));
    expect(viewer.scene.x).toBe(15);
    expect(viewer.scene.y).toBe(115);

    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: 80, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 80 }));
    window.dispatchEvent(new MouseEvent('mouseup'));
    expect(viewer.scene.rotation).not.toBe(0);

    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, clientX: 50, clientY: 60 }));
    expect(viewer.scene.scaleX).toBeGreaterThan(1);
    expect(viewer.scene.scaleY).toBeGreaterThan(1);

    dispose();
  });
});
