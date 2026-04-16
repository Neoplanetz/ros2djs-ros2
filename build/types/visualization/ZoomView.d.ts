/**
 * Adds zooming to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply zoom to
 *   * minScale (optional) - minimum scale to set to preserve precision
 */
export class ZoomView {
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
