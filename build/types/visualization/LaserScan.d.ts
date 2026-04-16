/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/
export class LaserScan {
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
    constructor(options: any);
    ros: any;
    topicName: any;
    compression: any;
    points: any;
    rosTopic: ROSLIB.Topic<unknown>;
    unsubscribe(): void;
    subscribe(): void;
    processMessage(message: any): void;
}
import * as ROSLIB from 'roslib';
