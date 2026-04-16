/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */
export class ZoomView {
    /**
     * Adds zooming to a view
     *
     * @constructor
     * @param options - object with following keys:
     *   * rootObject (optional) - the root object to apply zoom to
     *   * minScale (optional) - minimum scale to set to preserve precision
     */
    constructor(options: any);
    rootObject: any;
    minScale: any;
    stage: any;
    center: {
        x: number;
        y: number;
        z: number;
    };
    startShift: {
        x: number;
        y: number;
        z: number;
    };
    startScale: {
        x: number;
        y: number;
        z: number;
    };
    startZoom(centerX: any, centerY: any): void;
    zoom(zoom: any): void;
}
