/**
 * @fileOverview
 * @author Jihoon Lee- jihoonlee.in@gmail.com
 * @author Russell Toris - rctoris@wpi.edu
 */
export class OccupancyGridSrvClient extends EventEmitter<string | symbol, any> {
    /**
     * A static map that receives from map_server.
     *
     * Emits the following events:
     *   * 'change' - there was an update or change in the map
     *
     * @constructor
     * @param options - object with following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * service (optional) - the map topic to listen to, like '/static_map'
     *   * rootObject (optional) - the root object to add this marker to
     */
    constructor(options: any);
    rootObject: any;
    currentGrid: any;
}
import EventEmitter from 'eventemitter3';
