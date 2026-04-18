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
 *   * rootObject (optional) - the root createjs object to attach the arrow to
 *   * size (optional) - forwarded to ROS2D.NavigationArrow
 *   * strokeSize (optional) - forwarded to ROS2D.NavigationArrow
 *   * strokeColor (optional) - forwarded to ROS2D.NavigationArrow
 *   * fillColor (optional) - forwarded to ROS2D.NavigationArrow
 *   * pulse (optional) - forwarded to ROS2D.NavigationArrow
 */
ROS2D.PoseStampedClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/pose';
  this.rootObject = options.rootObject || new createjs.Container();

  this.arrow = new ROS2D.NavigationArrow({
    size: options.size,
    strokeSize: options.strokeSize,
    strokeColor: options.strokeColor,
    fillColor: options.fillColor,
    pulse: options.pulse
  });
  // Keep the arrow hidden until the first message arrives so it does not
  // flash at the origin on startup.
  this.arrow.visible = false;
  this.rootObject.addChild(this.arrow);

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
    that.arrow.x = pose.position.x;
    that.arrow.y = -pose.position.y;
    that.arrow.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation || { x: 0, y: 0, z: 0, w: 1 });
    that.arrow.visible = true;
    that.emit('change');
  });
};

/**
 * Detach from the topic and remove the managed arrow from the rootObject.
 */
ROS2D.PoseStampedClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  if (this.arrow && this.rootObject) {
    this.rootObject.removeChild(this.arrow);
  }
};

Object.setPrototypeOf(ROS2D.PoseStampedClient.prototype, EventEmitter.prototype);
