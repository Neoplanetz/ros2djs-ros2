/**
 * @fileOverview
 * Subscribes to a geometry_msgs/PoseArray topic and renders every pose
 * as a NavigationArrow inside a managed container. Intended for things
 * like AMCL particle clouds or trajectory fan-outs.
 *
 * Each incoming message replaces the previous set of arrows: the inner
 * container is cleared and rebuilt so there is no cross-message state
 * to reason about.
 *
 * Emits the following events:
 *   * 'change' - a new PoseArray has been applied
 *
 * @constructor
 * @param options - object with the following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the pose array topic, defaults to '/particlecloud'
 *   * rootObject (optional) - the root createjs object to attach to
 *   * size (optional) - forwarded to ROS2D.NavigationArrow (per-pose arrow)
 *   * strokeSize (optional) - forwarded to ROS2D.NavigationArrow
 *   * strokeColor (optional) - forwarded to ROS2D.NavigationArrow
 *   * fillColor (optional) - forwarded to ROS2D.NavigationArrow
 */
ROS2D.PoseArrayClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  var that = this;
  var ros = options.ros;
  this.topicName = options.topic || '/particlecloud';
  this.rootObject = options.rootObject || new createjs.Container();

  this._arrowOptions = {
    size: options.size,
    strokeSize: options.strokeSize,
    strokeColor: options.strokeColor,
    fillColor: options.fillColor
  };

  this.tfClient = options.tfClient || null;
  this.node = null;

  // A dedicated container so we can wipe it on every message without
  // touching siblings that the caller may have added to rootObject.
  this.container = new createjs.Container();
  if (!this.tfClient) {
    this.rootObject.addChild(this.container);
  }

  this.rosTopic = new ROSLIB.Topic({
    ros: ros,
    name: this.topicName,
    messageType: 'geometry_msgs/PoseArray'
  });

  this.rosTopic.subscribe(function(message) {
    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: that.container
        });
        that.rootObject.addChild(that.node);
      } else if (that.node.frame_id !== frame) {
        that.node.setFrame(frame);
      }
    }
    that._render(message);
    that.emit('change');
  });
};

/**
 * @private
 * Rebuild the arrow set from a PoseArray message.
 */
ROS2D.PoseArrayClient.prototype._render = function(message) {
  this._clearContainer();
  var poses = (message && message.poses) || [];
  var negateY = !this.tfClient; // SceneNode handles negation on TF path
  for (var i = 0; i < poses.length; i++) {
    var pose = poses[i];
    if (!pose || !pose.position) {
      continue;
    }
    var arrow = new ROS2D.NavigationArrow(this._arrowOptions);
    arrow.x = pose.position.x;
    arrow.y = negateY ? -pose.position.y : pose.position.y;
    arrow.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation || { x: 0, y: 0, z: 0, w: 1 });
    this.container.addChild(arrow);
  }
};

/**
 * @private
 * Drop every child arrow from the managed container.
 */
ROS2D.PoseArrayClient.prototype._clearContainer = function() {
  if (typeof this.container.removeAllChildren === 'function') {
    this.container.removeAllChildren();
    return;
  }
  // Fallback for mocks without removeAllChildren.
  while (this.container.children && this.container.children.length > 0) {
    this.container.removeChild(this.container.children[this.container.children.length - 1]);
  }
};

/**
 * Detach from the topic and drop the managed container from the rootObject.
 */
ROS2D.PoseArrayClient.prototype.unsubscribe = function() {
  if (this.rosTopic) {
    this.rosTopic.unsubscribe();
  }
  this._clearContainer();
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  } else if (this.container && this.rootObject) {
    this.rootObject.removeChild(this.container);
  }
};

Object.setPrototypeOf(ROS2D.PoseArrayClient.prototype, EventEmitter.prototype);
