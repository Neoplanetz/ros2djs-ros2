export class PoseStampedClient extends EventEmitter<string | symbol, any> {
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
    constructor(options: any);
    topicName: any;
    rootObject: any;
    arrow: NavigationArrow;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * Detach from the topic and remove the managed arrow from the rootObject.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import { NavigationArrow } from '../models/NavigationArrow';
import * as ROSLIB from 'roslib';
