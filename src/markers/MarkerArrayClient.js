/**
 * @fileOverview
 * Subscribes to a visualization_msgs/MarkerArray topic and renders each
 * marker via ROS2D.Marker, keyed by namespace+id. Supports the four
 * standard actions (ADD/MODIFY/DELETE/DELETEALL) and lifetime-based
 * automatic removal.
 *
 * When a tfClient is supplied each marker is wrapped in a ROS2D.SceneNode
 * that subscribes to the marker's own header.frame_id, so multi-robot
 * arrays with mixed frames render correctly. Without tfClient the client
 * falls back to the v1 behavior of rendering poses directly in the
 * rootObject's coordinate frame.
 *
 * Emits the following events:
 *   * 'change' - one or more markers were added, modified, or removed
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the marker topic to listen to, defaults to '/markers'
 *   * rootObject (optional) - the root createjs object to add markers to
 *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient; when
 *       present, each marker is wrapped in a ROS2D.SceneNode keyed on
 *       its own header.frame_id.
 */
ROS2D.MarkerArrayClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/markers';
  this.rootObject = options.rootObject || new createjs.Container();
  this.tfClient = options.tfClient || null;

  // key = ns + ':' + id  ->  { obj: child, node: SceneNode|null, timer: timeoutId|null }
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
  var child;
  var sceneNode = null;
  if (this.tfClient) {
    var shape = new ROS2D.Marker({ message: m, applyPose: false });
    sceneNode = new ROS2D.SceneNode({
      tfClient: this.tfClient,
      frame_id: (m.header && m.header.frame_id) || '',
      pose: m.pose,
      object: shape
    });
    child = sceneNode;
  } else {
    child = new ROS2D.Marker({ message: m });
  }
  this.rootObject.addChild(child);
  var entry = { obj: child, node: sceneNode, timer: null };
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
  if (entry.node) {
    entry.node.unsubscribe();
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
      if (entry.node) {
        entry.node.unsubscribe();
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
