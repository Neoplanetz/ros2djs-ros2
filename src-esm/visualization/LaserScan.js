import * as ROSLIB from 'roslib';

/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/

export class LaserScan extends THREE.Object3D {

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
    this.ros = options.ros;
    this.topicName = options.topic || '/scan';
    this.compression = options.compression || 'cbor';
    this.points = new ROS3D.Points(options);
    this.rosTopic = undefined;
    this.subscribe();
  };


  unsubscribe() {
    if (this.rosTopic) {
      this.rosTopic.unsubscribe(this.processMessage);
    }
  };

  subscribe() {
    this.unsubscribe();

    // subscribe to the topic
    this.rosTopic = new ROSLIB.Topic({
      ros : this.ros,
      name : this.topicName,
      compression : this.compression,
      queue_length : 1,
      messageType : 'sensor_msgs/LaserScan'
    });
    this.rosTopic.subscribe(this.processMessage.bind(this));
  };

  processMessage(message) {
    if (!this.points.setup(message.header.frame_id)) {
      return;
    }

    var n = message.ranges.length;
    var j = 0;
    for (var i=0;i<n;i+=this.points.pointRatio) {
      var range = message.ranges[i];
      if (range >= message.range_min && range <= message.range_max) {
        var angle = message.angle_min + i * message.angle_increment;
        this.points.positions.array[j++] = range * Math.cos(angle);
        this.points.positions.array[j++] = range * Math.sin(angle);
        this.points.positions.array[j++] = 0.0;
      }
    }
    
    this.points.update(j/3);
  };
    
}
