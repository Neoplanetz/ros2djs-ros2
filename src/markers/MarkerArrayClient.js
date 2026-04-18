/**
 * @fileOverview
 * Subscribes to a visualization_msgs/MarkerArray topic and renders each
 * marker via ROS2D.Marker, keyed by namespace+id. Supports the four
 * standard actions (ADD/MODIFY/DELETE/DELETEALL) and lifetime-based
 * automatic removal.
 *
 * frame_id is intentionally ignored in the v1 implementation; marker
 * poses are rendered directly in the rootObject's coordinate frame, the
 * same convention used by ROS2D.OccupancyGridClient. A tfClient option
 * slot is reserved for a future TF-aware extension.
 *
 * Emits the following events:
 *   * 'change' - one or more markers were added, modified, or removed
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the marker topic to listen to, defaults to '/markers'
 *   * rootObject (optional) - the root createjs object to add markers to
 *   * tfClient (optional, RESERVED) - currently logs a warning and is ignored
 */
ROS2D.MarkerArrayClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/markers';
  this.rootObject = options.rootObject || new createjs.Container();
  if (options.tfClient) {
    console.warn(
      'ROS2D.MarkerArrayClient: tfClient option is reserved but not yet implemented; frame_id will be ignored.'
    );
  }

  // key = ns + ':' + id  ->  { obj: ROS2D.Marker, timer: timeoutId|null }
  this.markers = {};

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'visualization_msgs/MarkerArray'
  });

  this.rosTopic.subscribe(function(message) {
    that.processMessage(message);
  });
};

ROS2D.MarkerArrayClient.prototype.processMessage = function(message) {
  var markers = (message && message.markers) || [];
  for (var i = 0; i < markers.length; i++) {
    this._handleMarker(markers[i]);
  }
  this.emit('change');
};

ROS2D.MarkerArrayClient.prototype._handleMarker = function(m) {
  // DELETEALL
  if (m.action === 3) {
    this._clearAll();
    return;
  }
  var key = (m.ns || '') + ':' + m.id;
  // DELETE
  if (m.action === 2) {
    this._removeMarker(key);
    return;
  }
  // ADD or MODIFY
  this._removeMarker(key);
  var obj = new ROS2D.Marker({ message: m });
  this.rootObject.addChild(obj);
  var entry = { obj: obj, timer: null };
  var lifeSec = (m.lifetime && m.lifetime.sec) || 0;
  var lifeNs = (m.lifetime && m.lifetime.nanosec) || 0;
  if (lifeSec > 0 || lifeNs > 0) {
    var ms = lifeSec * 1000 + lifeNs / 1e6;
    var that = this;
    entry.timer = setTimeout(function() {
      // Guard against double-removal: only act if the entry is still ours.
      if (that.markers[key] === entry) {
        that._removeMarker(key);
        that.emit('change');
      }
    }, ms);
  }
  this.markers[key] = entry;
};

ROS2D.MarkerArrayClient.prototype._removeMarker = function(key) {
  var entry = this.markers[key];
  if (!entry) {
    return;
  }
  if (entry.timer) {
    clearTimeout(entry.timer);
  }
  this.rootObject.removeChild(entry.obj);
  delete this.markers[key];
};

ROS2D.MarkerArrayClient.prototype._clearAll = function() {
  for (var k in this.markers) {
    if (Object.prototype.hasOwnProperty.call(this.markers, k)) {
      var entry = this.markers[k];
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
      this.rootObject.removeChild(entry.obj);
    }
  }
  this.markers = {};
};

ROS2D.MarkerArrayClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  this._clearAll();
};

Object.setPrototypeOf(ROS2D.MarkerArrayClient.prototype, EventEmitter.prototype);
