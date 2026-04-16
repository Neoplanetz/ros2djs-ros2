/**
 * A map that listens to a given occupancy grid topic.
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
 */
export class OccupancyGridClient extends EventEmitter<string | symbol, any> {
    constructor(options: any);
    continuous: any;
    rootObject: any;
    currentGrid: createjs.Shape;
}
import EventEmitter from 'eventemitter3';
import * as createjs from 'createjs-module';
