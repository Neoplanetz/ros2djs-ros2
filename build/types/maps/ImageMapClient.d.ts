/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class ImageMapClient extends EventEmitter<string | symbol, any> {
    /**
     * A image map is a PNG image scaled to fit to the dimensions of a OccupancyGrid.
     *
     * Emits the following events:
     *   * 'change' - there was an update or change in the map
     *
     * @constructor
     * @param options - object with following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the map meta data topic to listen to
     *   * image - the image URL to load
     *   * rootObject (optional) - the root object to add this marker to
     */
    constructor(options: any);
    image: any;
    rootObject: any;
    currentImage: ImageMap;
}
import EventEmitter from 'eventemitter3';
import { ImageMap } from './ImageMap';
