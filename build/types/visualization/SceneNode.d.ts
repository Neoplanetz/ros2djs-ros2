export class SceneNode extends createjs.Container {
    /**
     * @fileOverview
     * A createjs.Container whose position/orientation is driven by a
     * ROSLIB.TFClient (or ROSLIB.ROS2TFClient). On construction the node
     * subscribes to tfClient for the given frame_id and stays hidden until
     * the first TF callback arrives. Each callback composes TF x pose and
     * writes the result into this.x/.y/.rotation. The Y-negate that maps ROS
     * +Y up to canvas +Y down happens here, and here only, on the TF path.
     *
     * All child display objects of a SceneNode should therefore be laid out
     * in ROS coordinates (no y negation).
     *
     * @constructor
     * @param options
     *   * tfClient (required) - ROSLIB.TFClient or ROSLIB.ROS2TFClient
     *   * frame_id (required) - the TF frame this node lives in
     *   * pose (optional)     - geometry_msgs/Pose within frame_id. Default identity.
     *   * object (optional)   - a createjs.DisplayObject to add as a child
     */
    constructor(options: any);
    tfClient: any;
    frame_id: any;
    pose: any;
    _latestTf: any;
    _onTF: (transform: any) => void;
    _warnTimer: NodeJS.Timeout;
    /**
     * Compose this.pose with this._latestTf and write the result to x/y/rotation.
     * Y is negated here and here only so children render in ROS coordinates.
     * @private
     */
    private _applyLatest;
    /**
     * Update the local pose within frame_id. If a TF is already cached the
     * result is composed and applied immediately; otherwise the node waits
     * for the next TF callback.
     *
     * @param newPose - geometry_msgs/Pose or null (treated as identity)
     */
    setPose(newPose: any): void;
    /**
     * Change the TF frame this node tracks. Unsubscribes from the old frame,
     * subscribes to the new one, and hides the node until the next TF arrives.
     * A no-op if newFrameId equals the current frame.
     *
     * @param newFrameId - the new TF frame id
     */
    setFrame(newFrameId: any): void;
    /**
     * Detach from TF. Safe to call multiple times.
     */
    unsubscribe(): void;
}
import * as createjs from 'createjs-module';
