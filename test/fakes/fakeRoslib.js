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

  const ROSLIB = {
    Ros: FakeRos,
    Topic: FakeTopic,
    Service: FakeService,
  };

  return { ROSLIB, topics, services, publishedByTopic };
}
