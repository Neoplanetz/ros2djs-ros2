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
     *   * degreesPerPixel (optional) - degrees to rotate per horizontal drag pixel
     */
    constructor(options: any);
    rootObject: any;
    degreesPerPixel: any;
    stage: any;
    startX: number;
    startY: number;
    startRotation: any;
    currentRotation: any;
    pivotLocal: {
        x: number;
        y: number;
    };
    _stageToLocal(stageX: any, stageY: any): {
        x: number;
        y: number;
    };
    _setRotationAroundPivot(rotation: any): void;
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
