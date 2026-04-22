export class MarkerArrayClient extends EventEmitter<string | symbol, any> {
    /**
     * @fileOverview
     * Subscribes to a visualization_msgs/MarkerArray topic and renders each
     * marker via ROS2D.Marker, keyed by namespace+id. Supports the four
     * standard actions (ADD/MODIFY/DELETE/DELETEALL) and lifetime-based
     * automatic removal.
     *
     * When a tfClient is supplied each marker is wrapped in a ROS2D.SceneNode
     * that subscribes to the marker's own header.frame_id, so multi-robot
     * arrays with mixed frames render correctly. Without tfClient the client
     * falls back to the v1 behavior of rendering poses directly in the
     * rootObject's coordinate frame.
     *
     * Emits the following events:
     *   * 'change' - one or more markers were added, modified, or removed
     *
     * @constructor
     * @param options - object with the following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the marker topic to listen to, defaults to '/markers'
     *   * rootObject (optional) - the root createjs object to add markers to
     *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient; when
     *       present, each marker is wrapped in a ROS2D.SceneNode keyed on
     *       its own header.frame_id.
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
    tfClient: any;
    markers: {};
    rosTopic: ROSLIB.Topic<unknown>;
    processMessage(message: any): void;
    _handleMarker(m: any): void;
    _removeMarker(key: any): void;
    _clearAll(): void;
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import * as ROSLIB from 'roslib';
