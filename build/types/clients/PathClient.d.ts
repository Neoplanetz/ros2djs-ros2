export class PathClient extends EventEmitter<string | symbol, any> {
    /**
     * @fileOverview
     * Subscribes to a nav_msgs/Path topic and renders each incoming message
     * through ROS2D.PathShape. Wraps the subscribe + setPath + change-event
     * boilerplate so callers get the same single-line UX as
     * OccupancyGridClient / MarkerArrayClient.
     *
     * Emits the following events:
     *   * 'change' - a new path message has been applied
     *
     * @constructor
     * @param options - object with the following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the path topic, defaults to '/path'
     *   * rootObject (optional) - the root createjs object to attach the PathShape to
     *   * strokeSize (optional) - forwarded to ROS2D.PathShape
     *   * strokeColor (optional) - forwarded to ROS2D.PathShape
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
    pathShape: PathShape;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * Detach from the topic and remove the managed PathShape from the rootObject.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import { PathShape } from '../models/PathShape';
import * as ROSLIB from 'roslib';
