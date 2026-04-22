/**
 * @fileOverview
 * Subscribes to a geometry_msgs/PoseStamped topic and drives a single
 * ROS2D.NavigationArrow. Useful for visualizing AMCL pose estimates,
 * nav2 goal_pose echoes, etc.
 *
 * Y coordinates are negated to match the library convention (ROS +Y up
 * on screen). Orientation is mapped via ROS2D.quaternionToGlobalTheta
 * so the arrow points in the correct compass direction.
 *
 * Emits the following events:
 *   * 'change' - a new pose has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the pose topic, defaults to '/pose'
 *   * rootObject (optional) - the root createjs object to attach the marker to
 *   * shape (optional) - a pre-built createjs DisplayObject to use as the
 *       pose marker (e.g. ROS2D.NavigationImage with a custom SVG, or any
 *       custom Bitmap/Shape/Container that exposes .x, .y, .rotation,
 *       and .visible). If omitted a default ROS2D.NavigationArrow is
 *       created from the size / strokeSize / strokeColor / fillColor /
 *       pulse options below.
 *   * size (optional) - forwarded to the default ROS2D.NavigationArrow
 *   * strokeSize (optional) - forwarded to the default ROS2D.NavigationArrow
 *   * strokeColor (optional) - forwarded to the default ROS2D.NavigationArrow
 *   * fillColor (optional) - forwarded to the default ROS2D.NavigationArrow
 *   * pulse (optional) - forwarded to the default ROS2D.NavigationArrow
 */
ROS2D.PoseStampedClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/pose';
  this.rootObject = options.rootObject || new createjs.Container();

  if (options.shape) {
    this.marker = options.shape;
  } else {
    this.marker = new ROS2D.NavigationArrow({
      size: options.size,
      strokeSize: options.strokeSize,
      strokeColor: options.strokeColor,
      fillColor: options.fillColor,
      pulse: options.pulse
    });
  }
  // Backwards-compatible alias — older callers referenced .arrow directly.
  this.arrow = this.marker;
  // Keep the marker hidden until the first message arrives so it does not
  // flash at the origin on startup.
  this.marker.visible = false;
  this.tfClient = options.tfClient || null;
  this.node = null;
  if (!this.tfClient) {
    this.rootObject.addChild(this.marker);
  }
  // tfClient path: we add the SceneNode on first message instead.

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'geometry_msgs/PoseStamped'
  });

  this.rosTopic.subscribe(function(message) {
    var pose = message && message.pose;
    if (!pose || !pose.position) {
      return;
    }
    if (that.tfClient) {
      that.marker.visible = true;
      var frame = (message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          pose: pose,
          object: that.marker
        });
        that.rootObject.addChild(that.node);
      } else {
        if (that.node.frame_id !== frame) { that.node.setFrame(frame); }
        that.node.setPose(pose);
      }
      // Marker stays at origin; SceneNode positions it.
    } else {
      that.marker.x = pose.position.x;
      that.marker.y = -pose.position.y;
      that.marker.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation || { x: 0, y: 0, z: 0, w: 1 });
      that.marker.visible = true;
    }
    that.emit('change');
  });
};

/**
 * Detach from the topic and remove the managed marker from the rootObject.
 */
ROS2D.PoseStampedClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.marker && this.rootObject) {
    this.rootObject.removeChild(this.marker);
  }
};

Object.setPrototypeOf(ROS2D.PoseStampedClient.prototype, EventEmitter.prototype);
