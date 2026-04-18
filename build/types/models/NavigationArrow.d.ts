/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class NavigationArrow extends createjs.Shape {
    /**
     * A navigation arrow is an oriented marker shaped like an RViz pose
     * arrow (a rectangular shaft with a wider triangular head). The
     * polygon is centered on the local origin so rotation pivots around
     * the visual center of the arrow rather than the tail.
     *
     * The default outline is off (strokeSize = 0) so that callers get a
     * crisp filled arrow that scales cleanly under stage zoom. Pass a
     * positive strokeSize (in stage units) if you want a visible outline.
     *
     * @constructor
     * @param options - object with following keys:
     *   * size (optional) - the total length of the arrow (default 10)
     *   * strokeSize (optional) - the width of the outline; 0 disables it (default 0)
     *   * strokeColor (optional) - the createjs color for the stroke
     *   * fillColor (optional) - the createjs color for the fill
     *   * headLengthRatio (optional) - head length as a fraction of size (default 0.35)
     *   * headWidthRatio (optional) - head half-width as a fraction of size (default 0.20)
     *   * shaftWidthRatio (optional) - shaft half-width as a fraction of size (default 0.08)
     *   * pulse (optional) - if the marker should "pulse" over time
     */
    constructor(options: any);
}
import * as createjs from 'createjs-module';
