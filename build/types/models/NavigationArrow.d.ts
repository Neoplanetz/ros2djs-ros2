/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class NavigationArrow extends createjs.Shape {
    /**
     * A navigation arrow is a directed triangle that can be used to display orientation.
     *
     * @constructor
     * @param options - object with following keys:
     *   * size (optional) - the size of the marker
     *   * strokeSize (optional) - the size of the outline
     *   * strokeColor (optional) - the createjs color for the stroke
     *   * fillColor (optional) - the createjs color for the fill
     *   * pulse (optional) - if the marker should "pulse" over time
     */
    constructor(options: any);
}
import * as createjs from 'createjs-module';
