/**
 * A polygon that can be edited by an end user
 *
 * @constructor
 * @param options - object with following keys:
 *   * pose (optional) - the first pose of the trace
 *   * lineSize (optional) - the width of the lines
 *   * lineColor (optional) - the createjs color of the lines
 *   * pointSize (optional) - the size of the points
 *   * pointColor (optional) - the createjs color of the points
 *   * fillColor (optional) - the createjs color to fill the polygon
 *   * lineCallBack (optional) - callback function for mouse interaction with a line
 *   * pointCallBack (optional) - callback function for mouse interaction with a point
 */
export class PolygonMarker extends createjs.Container {
    constructor(options: any);
    lineSize: any;
    lineColor: any;
    pointSize: any;
    pointColor: any;
    fillColor: any;
    lineCallBack: any;
    pointCallBack: any;
    pointContainer: createjs.Container;
    lineContainer: createjs.Container;
    fillShape: createjs.Shape;
    /**
     * Internal use only
     */
    createLineShape(startPoint: any, endPoint: any): createjs.Shape;
    /**
     * Internal use only
     */
    editLineShape(line: any, startPoint: any, endPoint: any): void;
    /**
     * Internal use only
     */
    createPointShape(pos: any): createjs.Shape;
    /**
     * Adds a point to the polygon
     *
     * @param position of type ROSLIB.Vector3
     */
    addPoint(pos: any): void;
    /**
     * Removes a point from the polygon
     *
     * @param obj either an index (integer) or a point shape of the polygon
     */
    remPoint(obj: any): void;
    /**
     * Moves a point of the polygon
     *
     * @param obj either an index (integer) or a point shape of the polygon
     * @param position of type ROSLIB.Vector3
     */
    movePoint(obj: any, newPos: any): void;
    /**
     * Splits a line of the polygon: inserts a point at the center of the line
     *
     * @param obj either an index (integer) or a line shape of the polygon
     */
    splitLine(obj: any): void;
    /**
     * Internal use only
     */
    drawFill(): void;
}
import * as createjs from 'createjs-module';
