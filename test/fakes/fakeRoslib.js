import EventEmitter from 'eventemitter3';

export function createFakeRoslib() {
  const topics = [];
  const services = [];
  const publishedByTopic = new Map();

  class FakeRos extends EventEmitter {
    constructor() {
      super();
      this.connected = true;
    }
    callOnConnection(_msg) {}
    close() { this.connected = false; }
  }

  class FakeTopic {
    constructor(opts) {
      this.opts = opts;
      this.name = opts.name;
      this.messageType = opts.messageType;
      this._subs = [];
      topics.push(this);
    }
    subscribe(cb) { this._subs.push(cb); }
    unsubscribe() { this._subs = []; }
    publish(msg) {
      const list = publishedByTopic.get(this.name) ?? [];
      list.push(msg);
      publishedByTopic.set(this.name, list);
    }
    __emit(msg) { this._subs.forEach((cb) => cb(msg)); }
  }

  class FakeService {
    constructor(opts) {
      this.opts = opts;
      this.name = opts.name;
      this.serviceType = opts.serviceType;
      services.push(this);
    }
    callService(req, cb, errCb) {
      this._lastCall = { req, cb, errCb };
    }
  }

  class FakeServiceRequest {
    constructor(payload) { Object.assign(this, payload); }
  }

  class FakeVector3 {
    constructor({ x = 0, y = 0, z = 0 } = {}) { this.x = x; this.y = y; this.z = z; }
  }

  class FakePose {
    constructor({ position, orientation }) {
      this.position = position;
      this.orientation = orientation;
    }
  }

  class FakeQuaternion {
    constructor({ x = 0, y = 0, z = 0, w = 1 } = {}) {
      this.x = x; this.y = y; this.z = z; this.w = w;
    }
  }

  class FakeTransform {
    constructor({ translation, rotation }) {
      this.translation = translation;
      this.rotation = rotation;
    }
  }

  const ROSLIB = {
    Ros: FakeRos,
    Topic: FakeTopic,
    Service: FakeService,
    ServiceRequest: FakeServiceRequest,
    Vector3: FakeVector3,
    Pose: FakePose,
    Quaternion: FakeQuaternion,
    Transform: FakeTransform,
  };

  return { ROSLIB, topics, services, publishedByTopic };
}
