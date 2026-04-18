export class MarkerArrayClient extends EventEmitter<string | symbol, any> {
    /**
     * @fileOverview
     * Subscribes to a visualization_msgs/MarkerArray topic and renders each
     * marker via ROS2D.Marker, keyed by namespace+id. Supports the four
     * standard actions (ADD/MODIFY/DELETE/DELETEALL) and lifetime-based
     * automatic removal.
     *
     * frame_id is intentionally ignored in the v1 implementation; marker
     * poses are rendered directly in the rootObject's coordinate frame, the
     * same convention used by ROS2D.OccupancyGridClient. A tfClient option
     * slot is reserved for a future TF-aware extension.
     *
     * Emits the following events:
     *   * 'change' - one or more markers were added, modified, or removed
     *
     * @constructor
     * @param options - object with the following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the marker topic to listen to, defaults to '/markers'
     *   * rootObject (optional) - the root createjs object to add markers to
     *   * tfClient (optional, RESERVED) - currently logs a warning and is ignored
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
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
