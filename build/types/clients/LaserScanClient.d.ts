export class LaserScanClient extends EventEmitter<string | symbol, any> {
    /**
     * @fileOverview
     * Subscribes to a sensor_msgs/LaserScan topic and renders each incoming
     * message through ROS2D.LaserScanShape.
     *
     * Emits the following events:
     *   * 'change' - a new scan has been applied
     *
     * @constructor
     * @param options - object with the following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the scan topic, defaults to '/scan'
     *   * rootObject (optional) - the root createjs object to attach to
     *   * tfClient (optional) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
     *   * pointSize (optional) - forwarded to ROS2D.LaserScanShape
     *   * pointColor (optional) - forwarded to ROS2D.LaserScanShape
     *   * sampleStep (optional) - forwarded to ROS2D.LaserScanShape
     *   * maxRange (optional) - forwarded to ROS2D.LaserScanShape
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
    tfClient: any;
    node: any;
    scanShape: LaserScanShape;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * Detach from the topic and remove the managed shape (or SceneNode
     * wrapper) from the rootObject.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import { LaserScanShape } from '../models/LaserScanShape';
import * as ROSLIB from 'roslib';
