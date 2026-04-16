/**
 * A Viewer can be used to render an interactive 2D scene to a HTML5 canvas.
 *
 * @constructor
 * @param options - object with following keys:
 *   * divID - the ID of the div to place the viewer in
 *   * width - the initial width, in pixels, of the canvas
 *   * height - the initial height, in pixels, of the canvas
 *   * background (optional) - the color to render the background, like '#efefef'
 */
export class Viewer {
    constructor(options: any);
    width: any;
    height: any;
    scene: createjs.Stage;
    /**
     * Add the given createjs object to the global scene in the viewer.
     *
     * @param object - the object to add
     */
    addObject(object: any): void;
    /**
     * Scale the scene to fit the given width and height into the current canvas.
     *
     * @param width - the width to scale to in meters
     * @param height - the height to scale to in meters
     */
    scaleToDimensions(width: any, height: any): void;
    /**
     * Shift the main view of the canvas by the given amount. This is based on the
     * ROS coordinate system. That is, Y is opposite that of a traditional canvas.
     *
     * @param x - the amount to shift by in the x direction in meters
     * @param y - the amount to shift by in the y direction in meters
     */
    shift(x: any, y: any): void;
}
import * as createjs from 'createjs-module';
