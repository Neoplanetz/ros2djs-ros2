/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class OccupancyGridClient extends EventEmitter<string | symbol, any> {
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
    constructor(options: any);
    continuous: any;
    rootObject: any;
    tfClient: any;
    node: any;
    currentGrid: createjs.Shape;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * Detach from the map topic and drop any SceneNode wrap.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import * as createjs from 'createjs-module';
import * as ROSLIB from 'roslib';
