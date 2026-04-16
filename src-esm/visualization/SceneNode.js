/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/

export class SceneNode extends THREE.Object3D {

  /**
  * Add LaserScan to a view
  *
  * @constructor
  * @param options - object with following keys:
  *   * ros - ros
  *   * topicName - topicName
  *   * compression - compression
  *   * points - points
  *   * rosTopic - rosTopic
  */
  
  constructor(options) {
    super();
    options = options || {};
    var that = this;
    this.tfClient = options.tfClient;
    this.frameID = options.frameID;
    var object = options.object;
    this.pose = options.pose || { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } };
    
    // Do not render this object until we receive a TF update
    this.visible = false;
    
    // add the model
    this.add(object);
    
    // set the inital pose
    this.updatePose(this.pose);
    
    // save the TF handler so we can remove it later
    this.tfUpdate = function(msg) {
      // apply the transform (inline of ROSLIB.Pose.applyTransform)
      var tf = { translation: msg.translation, rotation: msg.rotation };
      var pos = { x: that.pose.position.x, y: that.pose.position.y, z: that.pose.position.z };
      var ori = { x: that.pose.orientation.x, y: that.pose.orientation.y,
                  z: that.pose.orientation.z, w: that.pose.orientation.w };
      // pos.multiplyQuaternion(tf.rotation)
      var q = tf.rotation;
      var ix = q.w*pos.x + q.y*pos.z - q.z*pos.y;
      var iy = q.w*pos.y + q.z*pos.x - q.x*pos.z;
      var iz = q.w*pos.z + q.x*pos.y - q.y*pos.x;
      var iw = -q.x*pos.x - q.y*pos.y - q.z*pos.z;
      pos.x = ix*q.w + iw*(-q.x) + iy*(-q.z) - iz*(-q.y);
      pos.y = iy*q.w + iw*(-q.y) + iz*(-q.x) - ix*(-q.z);
      pos.z = iz*q.w + iw*(-q.z) + ix*(-q.y) - iy*(-q.x);
      // pos.add(tf.translation)
      pos.x += tf.translation.x;
      pos.y += tf.translation.y;
      pos.z += tf.translation.z;
      // tmp = tf.rotation.clone(); tmp.multiply(ori)
      var r = tf.rotation;
      var newX = r.x*ori.w + r.y*ori.z - r.z*ori.y + r.w*ori.x;
      var newY = -r.x*ori.z + r.y*ori.w + r.z*ori.x + r.w*ori.y;
      var newZ = r.x*ori.y - r.y*ori.x + r.z*ori.w + r.w*ori.z;
      var newW = -r.x*ori.x - r.y*ori.y - r.z*ori.z + r.w*ori.w;
      ori = { x: newX, y: newY, z: newZ, w: newW };
      var poseTransformed = { position: pos, orientation: ori };

      // update the world
      that.updatePose(poseTransformed);
      that.visible = true;
    };
    
    // listen for TF updates
    this.tfClient.subscribe(this.frameID, this.tfUpdate);
  };
    
    
  /**
  * Set the pose of the associated model.
  *
  * @param pose - the pose to update with
  */
  updatePose(pose) {
    this.position.set( pose.position.x, pose.position.y, pose.position.z );
    this.quaternion.set(pose.orientation.x, pose.orientation.y,
      pose.orientation.z, pose.orientation.w);
    this.updateMatrixWorld(true);
  };
    
  unsubscribeTf() {
    this.tfClient.unsubscribe(this.frameID, this.tfUpdate);
  };
}
