/**
 * @fileOverview
 * Top-down 2D rendering of a single visualization_msgs/Marker message
 * onto a createjs Container. Built so that ROS2D.MarkerArrayClient can
 * keep using a uniform child-add/child-remove flow regardless of the
 * underlying marker primitive.
 *
 * Z-axis information is intentionally dropped: only pose.position.x/y
 * and the yaw component of pose.orientation are honored. MESH_RESOURCE
 * is not representable in 2D and is skipped with a console warning.
 *
 * The viewer (ROS2D.Viewer) translates the stage to (0, height) but does
 * not flip scaleY, so child y values still grow downward in canvas space.
 * To make ROS +Y point up on screen this module negates every y value
 * the way OccupancyGrid.js and PathShape.js do.
 */
export class Marker extends createjs.Container {
    /**
     * @constructor
     * @param {Object} options
     * @param {Object} options.message - a visualization_msgs/Marker message
     */
    constructor(options: {
        message: any;
    });
    x: any;
    /**
     * Convert a ROS color {r, g, b, a} (0..1 floats) to a createjs CSS color string.
     *
     * @private
     * @param {{r: number, g: number, b: number, a: number}} c
     * @returns {string} CSS color string usable by createjs Graphics
     */
    private _rgbaToCss;
}
import * as createjs from 'createjs-module';
