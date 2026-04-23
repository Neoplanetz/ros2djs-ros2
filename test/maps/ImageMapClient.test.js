import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeRoslib } from '../fakes/fakeRoslib.js';
import EventEmitter from 'eventemitter3';

const fake = createFakeRoslib();

globalThis.ROSLIB = fake.ROSLIB;

function FakeBitmap(image) {
  this.image = image;
  this.x = 0;
  this.y = 0;
  this.scaleX = 1;
  this.scaleY = 1;
}

function FakeShape() {}

function FakeContainer() {
  this.children = [];
}
FakeContainer.prototype.addChild = function(child) {
  this.children.push(child);
};
FakeContainer.prototype.removeChild = function(child) {
  const index = this.children.indexOf(child);
  if (index >= 0) {
    this.children.splice(index, 1);
  }
};

globalThis.createjs = {
  Bitmap: FakeBitmap,
  Shape: FakeShape,
  Container: FakeContainer,
};

globalThis.EventEmitter = EventEmitter;
globalThis.ROS2D = globalThis.ROS2D ?? {};

globalThis.ROS2D.ImageMap = function FakeImageMap(options) {
  FakeBitmap.call(this, options.image);
  this.message = options.message;
  this.pose = {
    position: options.message.origin.position,
    orientation: options.message.origin.orientation,
  };
  this.width = options.message.width * options.message.resolution;
  this.height = options.message.height * options.message.resolution;
  this.x += this.pose.position.x;
  this.y = -(options.message.height * options.message.resolution) - this.pose.position.y;
};
globalThis.ROS2D.ImageMap.prototype.__proto__ = FakeBitmap.prototype;

const imageSizes = new Map();
const binaryResponses = new Map();
let originalCreateElement;

function FakeImage() {
  this.onload = null;
  this.onerror = null;
  this.naturalWidth = 0;
  this.naturalHeight = 0;
  this.width = 0;
  this.height = 0;
}

Object.defineProperty(FakeImage.prototype, 'src', {
  get() {
    return this._src;
  },
  set(value) {
    this._src = value;
    const spec = imageSizes.get(value);
    setTimeout(() => {
      if ((spec && spec.error) || (!spec && /\.pgm(?:[?#]|$)/i.test(value))) {
        if (this.onerror) {
          this.onerror(new Error('image load failed'));
        }
        return;
      }
      const width = spec ? spec.width : 10;
      const height = spec ? spec.height : 5;
      this.width = width;
      this.height = height;
      this.naturalWidth = width;
      this.naturalHeight = height;
      if (this.onload) {
        this.onload();
      }
    }, 0);
  },
});

globalThis.Image = FakeImage;

await import('../../src/maps/ImageMapClient.js');

function once(emitter, eventName) {
  return new Promise((resolve) => emitter.once(eventName, resolve));
}

describe('ImageMapClient', () => {
  beforeEach(() => {
    fake.topics.length = 0;
    imageSizes.clear();
    binaryResponses.clear();
    globalThis.fetch = vi.fn();
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName);
      }
      return {
        width: 0,
        height: 0,
        getContext() {
          return {
            createImageData(width, height) {
              return {
                width,
                height,
                data: new Uint8ClampedArray(width * height * 4),
              };
            },
            putImageData() {},
          };
        },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.fetch;
  });

  it('loads map metadata from yaml and resolves the image relative to the yaml URL', async () => {
    binaryResponses.set(
      'http://localhost:3000/assets/maps/map.pgm',
      Uint8Array.from(
        [
          0x50, 0x35, 0x0a,
          0x38, 0x20, 0x36, 0x0a,
          0x32, 0x35, 0x35, 0x0a,
        ].concat(Array.from({ length: 48 }, (_, index) => index))
      ).buffer
    );
    globalThis.fetch.mockImplementation((url) => {
      if (url === 'http://localhost:3000/assets/maps/map.yaml') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            'image: map.pgm\n' +
            'resolution: 0.05\n' +
            'origin: [-1.5, 2.25, 0.0]\n' +
            'negate: 0\n' +
            'occupied_thresh: 0.65\n' +
            'free_thresh: 0.196\n'
          ),
        });
      }
      if (binaryResponses.has(url)) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(binaryResponses.get(url)),
        });
      }
      return Promise.resolve({ ok: false });
    });
    document.body.innerHTML = '<div id="map"></div>';
    const rootObject = new FakeContainer();
    const client = new globalThis.ROS2D.ImageMapClient({
      yaml: '/assets/maps/map.yaml',
      rootObject,
    });

    const result = await Promise.race([
      once(client, 'change').then(() => ({ type: 'change' })),
      once(client, 'error').then((error) => ({ type: 'error', error })),
    ]);

    if (result.type === 'error') {
      throw result.error;
    }

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/assets/maps/map.yaml');
    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3000/assets/maps/map.pgm');
    expect(client.image).toBe('http://localhost:3000/assets/maps/map.pgm');
    expect(client.metadata.image).toBe('http://localhost:3000/assets/maps/map.pgm');
    expect(client.metadata.resolution).toBe(0.05);
    expect(client.metadata.origin.position.x).toBe(-1.5);
    expect(client.metadata.origin.position.y).toBe(2.25);
    expect(client.metadata.negate).toBe(0);
    expect(client.metadata.occupied_thresh).toBe(0.65);
    expect(client.metadata.free_thresh).toBe(0.196);
    expect(client.currentImage.message.width).toBe(8);
    expect(client.currentImage.message.height).toBe(6);
    expect(rootObject.children).toContain(client.currentImage);
  });

  it('emits error when the yaml is missing a required field', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(
        'resolution: 0.05\n' +
        'origin: [0.0, 0.0, 0.0]\n'
      ),
    });
    const client = new globalThis.ROS2D.ImageMapClient({
      yaml: '/assets/maps/map.yaml',
      rootObject: new FakeContainer(),
    });

    const error = await once(client, 'error');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/missing required "image"/);
  });

  it('emits error when the yaml fetch fails', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(''),
    });
    const client = new globalThis.ROS2D.ImageMapClient({
      yaml: '/assets/maps/map.yaml',
      rootObject: new FakeContainer(),
    });

    const error = await once(client, 'error');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/failed to load YAML/);
  });

  it('falls back to direct metadata options and emits change after the image loads', async () => {
    imageSizes.set('http://example.com/map.png', { width: 20, height: 10 });
    const rootObject = new FakeContainer();
    const client = new globalThis.ROS2D.ImageMapClient({
      ros: new fake.ROSLIB.Ros(),
      topic: '/ignored',
      image: 'http://example.com/map.png',
      width: 40,
      height: 30,
      resolution: 0.1,
      position: { x: 1, y: -2, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
      negate: 1,
      occupied_thresh: 0.7,
      free_thresh: 0.2,
      rootObject,
    });

    await once(client, 'change');

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(client.metadata.image).toBe('http://example.com/map.png');
    expect(client.metadata.resolution).toBe(0.1);
    expect(client.metadata.origin.position.x).toBe(1);
    expect(client.metadata.origin.position.y).toBe(-2);
    expect(client.metadata.negate).toBe(1);
    expect(client.metadata.occupied_thresh).toBe(0.7);
    expect(client.metadata.free_thresh).toBe(0.2);
    expect(client.currentImage.message.width).toBe(40);
    expect(client.currentImage.message.height).toBe(30);
    expect(rootObject.children).toContain(client.currentImage);
  });

  it('emits error when the image asset cannot be loaded', async () => {
    globalThis.fetch.mockImplementation((url) => {
      if (url === 'http://localhost:3000/assets/maps/map.yaml') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(
            'image: map.pgm\n' +
            'resolution: 0.05\n' +
            'origin: [0.0, 0.0, 0.0]\n'
          ),
        });
      }
      return Promise.resolve({
        ok: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });
    });
    const client = new globalThis.ROS2D.ImageMapClient({
      yaml: '/assets/maps/map.yaml',
      rootObject: new FakeContainer(),
    });

    const error = await once(client, 'error');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/failed to load image asset/);
  });

  it('emits error when neither yaml nor complete direct metadata is provided', async () => {
    const client = new globalThis.ROS2D.ImageMapClient({
      image: 'http://example.com/map.png',
      rootObject: new FakeContainer(),
    });

    const error = await once(client, 'error');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/expected either options.yaml or legacy image metadata/);
  });
});
