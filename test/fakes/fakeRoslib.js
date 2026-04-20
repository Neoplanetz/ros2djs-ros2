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

  class FakeTFClient {
    constructor(opts) {
      this.opts = opts || {};
      this.fixedFrame = this.opts.fixedFrame || 'base_link';
      // frameID -> array of callbacks
      this._subs = new Map();
    }
    subscribe(frameID, cb) {
      if (!this._subs.has(frameID)) { this._subs.set(frameID, []); }
      this._subs.get(frameID).push(cb);
    }
    unsubscribe(frameID, cb) {
      const arr = this._subs.get(frameID);
      if (!arr) { return; }
      const i = arr.indexOf(cb);
      if (i >= 0) { arr.splice(i, 1); }
    }
    // Test helper: dispatch a Transform to every subscriber of frameID.
    __emit(frameID, transform) {
      const arr = this._subs.get(frameID);
      if (!arr) { return; }
      // Copy so callbacks that unsubscribe during dispatch are safe.
      arr.slice().forEach((cb) => cb(transform));
    }
    // Test helper: count live subscribers on a frame.
    __subscriberCount(frameID) {
      const arr = this._subs.get(frameID);
      return arr ? arr.length : 0;
    }
  }

  const ROSLIB = {
    Ros: FakeRos,
    Topic: FakeTopic,
    Service: FakeService,
    TFClient: FakeTFClient,
    ROS2TFClient: FakeTFClient,
  };

  return { ROSLIB, topics, services, publishedByTopic, FakeTFClient };
}
