export class GridLines extends createjs.Shape {
    /**
     * A GridLines object is used to display grid lines in a 2D viewer.
     * It inherits from createjs.Shape.
     *
     * @constructor
     * @param {Object} options - object with following keys:
     *   * gridSpacing (optional) - the spacing of the grid lines in meters (default: 1)
     *   * gridExtent (optional) - the extent of the grid in meters (default: 200)
     *   * gridColor (optional) - the color of the grid lines (default: 'rgba(0,0,0,0.2)')
     *   * gridWidth (optional) - the width of the grid lines (default: 0.02)
     */
    constructor(options: any);
}
import * as createjs from 'createjs-module';
