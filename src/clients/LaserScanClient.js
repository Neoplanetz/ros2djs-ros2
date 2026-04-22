/**
 * @fileOverview
 * Subscribes to a sensor_msgs/LaserScan topic and renders each incoming
 * message through ROS2D.LaserScanShape.
 *
 * Emits the following events:
 *   * 'change' - a new scan has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the scan topic, defaults to '/scan'
 *   * rootObject (optional) - the root createjs object to attach to
 *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
 *   * pointSize (optional) - forwarded to ROS2D.LaserScanShape
 *   * pointColor (optional) - forwarded to ROS2D.LaserScanShape
 *   * sampleStep (optional) - forwarded to ROS2D.LaserScanShape
 *   * maxRange (optional) - forwarded to ROS2D.LaserScanShape
 */
ROS2D.LaserScanClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;

  this.topicName = options.topic || '/scan';
  this.rootObject = options.rootObject || new createjs.Container();
  this.tfClient = options.tfClient || null;
  this.node = null;

  this.scanShape = new ROS2D.LaserScanShape({
    pointSize: options.pointSize,
    pointColor: options.pointColor,
    sampleStep: options.sampleStep,
    maxRange: options.maxRange,
    negateY: !this.tfClient
  });

  if (!this.tfClient) {
    this.rootObject.addChild(this.scanShape);
  }

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'sensor_msgs/LaserScan'
  });

  this.rosTopic.subscribe(function(message) {
    if (!message || !message.ranges || typeof message.angle_min !== 'number' ||
        typeof message.angle_increment !== 'number') {
      return;
    }

    if (that.tfClient) {
      var frame = message.header && message.header.frame_id;
      if (!frame) {
        return;
      }
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.scanShape
        });
        that.rootObject.addChild(that.node);
      } else if (that.node.frame_id !== frame) {
        that.node.setFrame(frame);
      }
    }

    that.scanShape.setScan(message);
    that.emit('change');
  });
};

/**
 * Detach from the topic and remove the managed shape (or SceneNode
 * wrapper) from the rootObject.
 */
ROS2D.LaserScanClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.scanShape && this.rootObject) {
    this.rootObject.removeChild(this.scanShape);
  }
};

Object.setPrototypeOf(ROS2D.LaserScanClient.prototype, EventEmitter.prototype);
