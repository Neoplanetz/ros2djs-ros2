/**
 * @fileOverview
 * Draws a sensor_msgs/LaserScan as 2D hit points in ROS2D.
 */
export class LaserScanShape extends createjs.Shape {
    /**
     * A shape that renders the valid returns from a LaserScan message as
     * filled circles in the local sensor frame.
     *
     * @constructor
     * @param options - object with following keys:
     *   * pointSize (optional) - rendered point diameter in meters (default 0.03)
     *   * pointColor (optional) - the createjs color for the points
     *   * sampleStep (optional) - draw every Nth beam (default 1)
     *   * maxRange (optional) - additional upper bound for accepted ranges
     *   * negateY (optional) - negate Y when drawing directly in canvas coordinates
     */
    constructor(options: any);
    pointSize: any;
    pointColor: any;
    sampleStep: number;
    maxRange: any;
    negateY: boolean;
    /**
     * Redraw the current scan as points.
     *
     * @param message of type sensor_msgs/LaserScan
     */
    setScan(message: any): void;
    /**
     * Check whether a scan range should be rendered.
     *
     * @private
     * @param range - scan range
     * @param lowerBound - minimum accepted range
     * @param upperBound - maximum accepted range
     * @returns {boolean} true when the range should be drawn
     */
    private _isValidRange;
}
import * as createjs from 'createjs-module';
