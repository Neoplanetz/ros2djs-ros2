/**
 * Adds panning to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply panning to
 */
export class PanView {
    constructor(options: any);
    rootObject: any;
    stage: any;
    startPos: {
        x: number;
        y: number;
        z: number;
    };
    startPan(startX: any, startY: any): void;
    pan(curX: any, curY: any): void;
}
