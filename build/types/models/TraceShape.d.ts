/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */
export class TraceShape extends createjs.Shape {
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
    constructor(options: any);
    strokeSize: any;
    strokeColor: any;
    maxPoses: any;
    minDist: number;
    poses: any[];
    /**
     * Redraw every pose currently in the trace using the current
     * strokeSize/strokeColor. Call this after changing strokeSize or
     * strokeColor on an existing TraceShape to apply the new values:
     *
     *   trace.strokeSize = 0.05;
     *   trace.redraw();
     */
    redraw(): void;
    /**
     * @private
     * Regenerate the graphics buffer from this.poses.
     */
    private _render;
    /**
     * Adds a pose to the trace and updates the graphics.
     *
     * The graphics buffer is regenerated through _render() on every accepted
     * pose so the stroke context set up in the constructor (which ends after
     * setStrokeStyle/beginStroke via endStroke) is re-established on each
     * redraw. Without this, incremental moveTo/lineTo calls land outside the
     * active stroke and the trace renders invisibly. Mirrors the same approach
     * popFront() uses.
     *
     * @param pose of type ROSLIB.Pose
     */
    addPose(pose: any): void;
    /**
     * Removes the front pose and redraws from the remaining trace. Unlike
     * the previous implementation this goes through _render() so the first
     * segment starts with a moveTo and the stroke mode is reapplied
     * cleanly — fixes a visual bug where popFront left the pen starting
     * from a stale location.
     */
    popFront(): void;
}
import * as createjs from 'createjs-module';
