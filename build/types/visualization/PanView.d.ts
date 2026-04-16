/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */
export class PanView {
    /**
     * Adds panning to a view
     *
     * @constructor
     * @param options - object with following keys:
     *   * rootObject (optional) - the root object to apply panning to
     */
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
