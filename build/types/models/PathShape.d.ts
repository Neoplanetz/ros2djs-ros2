/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */
export class PathShape extends createjs.Shape {
    /**
     * A shape to draw a nav_msgs/Path msg
     *
     * @constructor
     * @param options - object with following keys:
     *   * path (optional) - the initial path to draw
     *   * strokeSize (optional) - the size of the outline
     *   * strokeColor (optional) - the createjs color for the stroke
     */
    constructor(options: any);
    strokeSize: any;
    strokeColor: any;
    /**
     * Set the path to draw
     *
     * @param path of type nav_msgs/Path
     */
    setPath(path: any): void;
}
import * as createjs from 'createjs-module';
