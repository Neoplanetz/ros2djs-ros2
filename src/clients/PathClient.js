/**
 * @fileOverview
 * Subscribes to a nav_msgs/Path topic and renders each incoming message
 * through ROS2D.PathShape. Wraps the subscribe + setPath + change-event
 * boilerplate so callers get the same single-line UX as
 * OccupancyGridClient / MarkerArrayClient.
 *
 * Emits the following events:
 *   * 'change' - a new path message has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the path topic, defaults to '/path'
 *   * rootObject (optional) - the root createjs object to attach the PathShape to
 *   * strokeSize (optional) - forwarded to ROS2D.PathShape
 *   * strokeColor (optional) - forwarded to ROS2D.PathShape
 */
ROS2D.PathClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/path';
  this.rootObject = options.rootObject || new createjs.Container();

  this.pathShape = new ROS2D.PathShape({
    strokeSize: options.strokeSize,
    strokeColor: options.strokeColor
  });
  this.rootObject.addChild(this.pathShape);

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'nav_msgs/Path'
  });

  this.rosTopic.subscribe(function(message) {
    that.pathShape.setPath(message);
    that.emit('change');
  });
};

/**
 * Detach from the topic and remove the managed PathShape from the rootObject.
 */
ROS2D.PathClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  if (this.pathShape && this.rootObject) {
    this.rootObject.removeChild(this.pathShape);
  }
};

Object.setPrototypeOf(ROS2D.PathClient.prototype, EventEmitter.prototype);
