/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class ImageMap extends createjs.Bitmap {
    /**
     * An image map is a PNG image scaled to fit to the dimensions of a OccupancyGrid.
     *
     * @constructor
     * @param options - object with following keys:
     *   * message - the occupancy grid map meta data message
     *   * image - the image URL to load
     */
    constructor(options: any);
    pose: {
        position: any;
        orientation: any;
    };
    width: any;
    height: any;
    scaleX: any;
    scaleY: any;
}
