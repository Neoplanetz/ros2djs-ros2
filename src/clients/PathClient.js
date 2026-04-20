/**
 * @fileOverview
 * Subscribes to a nav_msgs/Path topic and renders each incoming message
 * through ROS2D.PathShape. Wraps the subscribe + setPath + change-event
 * boilerplate so callers get the same single-line UX as
 * OccupancyGridClient / MarkerArrayClient.
 *
 * When a tfClient is supplied the PathShape is lazily wrapped in a
 * ROS2D.SceneNode keyed on the message's header.frame_id. Frame changes
 * across messages are propagated via SceneNode.setFrame.
 *
 * Emits the following events:
 *   * 'change' - a new path message has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the path topic, defaults to '/path'
 *   * rootObject (optional) - the root createjs object to attach the PathShape to
 *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
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
  this.tfClient = options.tfClient || null;

  this.pathShape = new ROS2D.PathShape({
    strokeSize: options.strokeSize,
    strokeColor: options.strokeColor
  });
  this.node = null;

  if (!this.tfClient) {
    // Default path: attach pathShape directly, as in v1.2.
    this.rootObject.addChild(this.pathShape);
  }

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'nav_msgs/Path'
  });

  this.rosTopic.subscribe(function(message) {
    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.pathShape
        });
        that.rootObject.addChild(that.node);
      } else if (that.node.frame_id !== frame) {
        that.node.setFrame(frame);
      }
    }
    that.pathShape.setPath(message);
    that.emit('change');
  });
};

/**
 * Detach from the topic and remove the managed PathShape (or SceneNode
 * wrapper) from the rootObject.
 */
ROS2D.PathClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.pathShape && this.rootObject) {
    this.rootObject.removeChild(this.pathShape);
  }
};

Object.setPrototypeOf(ROS2D.PathClient.prototype, EventEmitter.prototype);
