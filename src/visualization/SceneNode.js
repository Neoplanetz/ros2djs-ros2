/**
 * @fileOverview
 * A createjs.Container whose position/orientation is driven by a
 * ROSLIB.TFClient (or ROSLIB.ROS2TFClient). On construction the node
 * subscribes to tfClient for the given frame_id and stays hidden until
 * the first TF callback arrives. Each callback composes TF x pose and
 * writes the result into this.x/.y/.rotation. The Y-negate that maps ROS
 * +Y up to canvas +Y down happens here, and here only, on the TF path.
 *
 * All child display objects of a SceneNode should therefore be laid out
 * in ROS coordinates (no y negation).
 *
 * @constructor
 * @param options
 *   * tfClient (required) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
 *   * frame_id (required) - the TF frame this node lives in
 *   * pose (optional)     - geometry_msgs/Pose within frame_id. Default identity.
 *   * object (optional)   - a createjs.DisplayObject to add as a child
 */
ROS2D.SceneNode = function(options) {
  createjs.Container.call(this);
  options = options || {};
  if (!options.tfClient) {
    throw new Error('ROS2D.SceneNode: options.tfClient is required');
  }
  if (!options.frame_id) {
    throw new Error('ROS2D.SceneNode: options.frame_id is required');
  }
  var that = this;

  this.tfClient = options.tfClient;
  this.frame_id = options.frame_id;
  this.pose = options.pose || {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  };

  // Latest TF cached by our own callback; no reliance on BaseTFClient internals.
  this._latestTf = null;

  this.visible = false;

  if (options.object) {
    this.addChild(options.object);
  }

  this._onTF = function(transform) {
    that._latestTf = transform;
    that._applyLatest();
    that.visible = true;
  };

  this.tfClient.subscribe(this.frame_id, this._onTF);
};

/**
 * Compose this.pose with this._latestTf and write the result to x/y/rotation.
 * Y is negated here and here only so children render in ROS coordinates.
 * @private
 */
ROS2D.SceneNode.prototype._applyLatest = function() {
  if (!this._latestTf) {
    return;
  }
  // Clone pose to avoid mutating user-supplied objects. ROSLIB.Pose.applyTransform
  // does the 3D composition; we then map to 2D canvas.
  var p = new ROSLIB.Pose({
    position: {
      x: this.pose.position.x,
      y: this.pose.position.y,
      z: this.pose.position.z
    },
    orientation: {
      x: this.pose.orientation.x,
      y: this.pose.orientation.y,
      z: this.pose.orientation.z,
      w: this.pose.orientation.w
    }
  });
  p.applyTransform(this._latestTf);
  this.x = p.position.x;
  this.y = -p.position.y;
  this.rotation = ROS2D.quaternionToGlobalTheta(p.orientation) + 0;
};

/**
 * Update the local pose within frame_id. If a TF is already cached the
 * result is composed and applied immediately; otherwise the node waits
 * for the next TF callback.
 *
 * @param newPose - geometry_msgs/Pose or null (treated as identity)
 */
ROS2D.SceneNode.prototype.setPose = function(newPose) {
  if (newPose) {
    this.pose = {
      position: {
        x: newPose.position.x, y: newPose.position.y, z: newPose.position.z
      },
      orientation: {
        x: newPose.orientation.x, y: newPose.orientation.y,
        z: newPose.orientation.z, w: newPose.orientation.w
      }
    };
  } else {
    this.pose = {
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 }
    };
  }
  if (this._latestTf) {
    this._applyLatest();
  }
};

Object.setPrototypeOf(ROS2D.SceneNode.prototype, createjs.Container.prototype);
