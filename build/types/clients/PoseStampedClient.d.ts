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
     *   * rootObject (optional) - the root createjs object to attach the marker to
     *   * shape (optional) - a pre-built createjs DisplayObject to use as the
     *       pose marker (e.g. ROS2D.NavigationImage with a custom SVG, or any
     *       custom Bitmap/Shape/Container that exposes .x, .y, .rotation,
     *       and .visible). If omitted a default ROS2D.NavigationArrow is
     *       created from the size / strokeSize / strokeColor / fillColor /
     *       pulse options below.
     *   * size (optional) - forwarded to the default ROS2D.NavigationArrow
     *   * strokeSize (optional) - forwarded to the default ROS2D.NavigationArrow
     *   * strokeColor (optional) - forwarded to the default ROS2D.NavigationArrow
     *   * fillColor (optional) - forwarded to the default ROS2D.NavigationArrow
     *   * pulse (optional) - forwarded to the default ROS2D.NavigationArrow
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
    marker: any;
    arrow: any;
    tfClient: any;
    node: any;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * Detach from the topic and remove the managed marker from the rootObject.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import * as ROSLIB from 'roslib';
