export class Axis extends createjs.Container {
    /**
     * An Axis object is used to display X and Y axes in a 2D viewer.
     * It inherits from createjs.Container.
     *
     * @constructor
     * @param {Object} options - object with following keys:
     *   * axisLength (optional) - the length of the axes in meters (default: 1.5)
     *   * axisWidth (optional) - the width of the axis lines (default: 0.05)
     *   * arrowSize (optional) - the size of the arrow heads (default: 0.2)
     *   * xColor (optional) - the color of the X-axis (default: 'red')
     *   * yColor (optional) - the color of the Y-axis (default: 'green')
     */
    constructor(options: any);
}
import * as createjs from 'createjs-module';
