/**
 * @fileOverview
 * Subscribes to a nav_msgs/Odometry topic and drives a single marker
 * (NavigationArrow by default, or any DisplayObject the caller passes
 * via options.shape — typically a ROS2D.NavigationImage with a custom
 * robot SVG).
 *
 * Odometry shares its render path with PoseStampedClient: only the
 * topic message type and the pose extraction differ (Odometry nests
 * pose under message.pose.pose with an additional covariance field).
 *
 * Y is negated to match the library convention (ROS +Y up on screen).
 *
 * Emits the following events:
 *   * 'change' - a new odometry message has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the odometry topic, defaults to '/odom'
 *   * rootObject (optional) - the root createjs object to attach the marker to
 *   * shape (optional) - a pre-built createjs DisplayObject to use as the
 *       pose marker (see PoseStampedClient for details). Falls back to
 *       a default ROS2D.NavigationArrow built from the options below.
 *   * size, strokeSize, strokeColor, fillColor, pulse (optional) -
 *       forwarded to the default ROS2D.NavigationArrow
 */
ROS2D.OdometryClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/odom';
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
  this.marker.visible = false;
  this.tfClient = options.tfClient || null;
  this.node = null;
  if (!this.tfClient) {
    this.rootObject.addChild(this.marker);
  }

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'nav_msgs/Odometry'
  });

  this.rosTopic.subscribe(function(message) {
    // nav_msgs/Odometry wraps the actual pose one level deeper than
    // geometry_msgs/PoseStamped: message.pose is a PoseWithCovariance,
    // whose `.pose` field holds the geometry_msgs/Pose we want.
    var pose = message && message.pose && message.pose.pose;
    if (!pose || !pose.position) {
      return;
    }
    if (that.tfClient) {
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
ROS2D.OdometryClient.prototype.unsubscribe = function() {
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

Object.setPrototypeOf(ROS2D.OdometryClient.prototype, EventEmitter.prototype);
