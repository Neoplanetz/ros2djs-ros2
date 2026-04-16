/**
 * A trace of poses, handy to see where a robot has been
 *
 * @constructor
 * @param options - object with following keys:
 *   * pose (optional) - the first pose of the trace
 *   * strokeSize (optional) - the size of the outline
 *   * strokeColor (optional) - the createjs color for the stroke
 *   * maxPoses (optional) - the maximum number of poses to keep, 0 for infinite
 *   * minDist (optional) - the minimal distance between poses to use the pose for drawing (default 0.05)
 */
export class TraceShape extends createjs.Shape {
    constructor(options: any);
    strokeSize: any;
    strokeColor: any;
    maxPoses: any;
    minDist: number;
    poses: any[];
    /**
     * Adds a pose to the trace and updates the graphics
     *
     * @param pose of type ROSLIB.Pose
     */
    addPose(pose: any): void;
    /**
     * Removes front pose and updates the graphics
     */
    popFront(): void;
}
import * as createjs from 'createjs-module';
