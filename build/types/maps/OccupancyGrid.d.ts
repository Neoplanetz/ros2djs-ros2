/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class OccupancyGrid extends createjs.Bitmap {
    /**
     * An OccupancyGrid can convert a ROS occupancy grid message into a createjs Bitmap object.
     *
     * @constructor
     * @param options - object with following keys:
     *   * message - the occupancy grid message
     */
    constructor(options: any);
    width: number;
    height: number;
    pose: {
        position: any;
        orientation: any;
    };
    scaleX: any;
    scaleY: any;
}
import * as createjs from 'createjs-module';
