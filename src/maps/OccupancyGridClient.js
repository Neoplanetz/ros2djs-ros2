/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A map that listens to a given occupancy grid topic.
 *
 * When a tfClient is supplied the grid is wrapped in a ROS2D.SceneNode
 * keyed on the message's header.frame_id. This lets multi-robot
 * deployments publish maps in per-robot frames (e.g. /robot_0/map) and
 * have them overlay correctly via TF. Without tfClient, the grid is
 * attached directly to rootObject as in v1.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
 */
ROS2D.OccupancyGridClient = function(options) {
  EventEmitter.call(this);
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic || '/map';
  this.continuous = options.continuous;
  this.rootObject = options.rootObject || new createjs.Container();
  this.tfClient = options.tfClient || null;
  this.node = null;

  // current grid that is displayed
  // create an empty shape to start with, so that the order remains correct.
  this.currentGrid = new createjs.Shape();
  if (!this.tfClient) {
    this.rootObject.addChild(this.currentGrid);
    // work-around for a bug in easeljs -- needs a second object to render correctly
    this.rootObject.addChild(new ROS2D.Grid({size:1}));
  }

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'nav_msgs/OccupancyGrid'
    // compression : 'png'
  });

  this.rosTopic.subscribe(function(message) {
    var newGrid = new ROS2D.OccupancyGrid({
      message : message
    });

    if (that.tfClient) {
      var frame = (message && message.header && message.header.frame_id) || '';
      if (!that.node) {
        that.node = new ROS2D.SceneNode({
          tfClient: that.tfClient,
          frame_id: frame,
          object: newGrid
        });
        that.rootObject.addChild(that.node);
      } else {
        if (that.node.frame_id !== frame) { that.node.setFrame(frame); }
        // Replace the lone child under the SceneNode with the new grid.
        if (that.node.children) {
          while (that.node.children.length > 0) {
            that.node.removeChild(that.node.children[0]);
          }
        }
        that.node.addChild(newGrid);
      }
      that.currentGrid = newGrid;
    } else {
      // check for an old map
      var index = null;
      if (that.currentGrid) {
        index = that.rootObject.getChildIndex(that.currentGrid);
        that.rootObject.removeChild(that.currentGrid);
      }
      that.currentGrid = newGrid;
      if (index !== null) {
        that.rootObject.addChildAt(that.currentGrid, index);
      }
      else {
        that.rootObject.addChild(that.currentGrid);
      }
    }

    that.emit('change');

    // check if we should unsubscribe
    if (!that.continuous) {
      that.rosTopic.unsubscribe();
    }
  });
};

/**
 * Detach from the map topic and drop any SceneNode wrap.
 */
ROS2D.OccupancyGridClient.prototype.unsubscribe = function() {
  if (this.rosTopic) { this.rosTopic.unsubscribe(); }
  if (this.node) {
    this.node.unsubscribe();
    this.rootObject.removeChild(this.node);
    this.node = null;
  }
};

Object.setPrototypeOf(ROS2D.OccupancyGridClient.prototype, EventEmitter.prototype);
