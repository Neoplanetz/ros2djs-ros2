/**
 * @fileOverview
 * @author Assistant
 */
export class RotateView {
    /**
     * Adds rotation to a view
     *
     * @constructor
     * @param options - object with following keys:
     *   * rootObject (optional) - the root object to apply rotation to
     */
    constructor(options: any);
    rootObject: any;
    stage: any;
    startAngle: number;
    currentRotation: number;
    /**
     * Start the rotation
     * @param startX - the starting x position
     * @param startY - the starting y position
     */
    startRotate(startX: any, startY: any): void;
    /**
     * Rotate the view
     * @param curX - the current x position
     * @param curY - the current y position
     */
    rotate(curX: any, curY: any): void;
}
