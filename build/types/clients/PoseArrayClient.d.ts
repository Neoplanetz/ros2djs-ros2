export class PoseArrayClient extends EventEmitter<string | symbol, any> {
    /**
     * @fileOverview
     * Subscribes to a geometry_msgs/PoseArray topic and renders every pose
     * as a NavigationArrow inside a managed container. Intended for things
     * like AMCL particle clouds or trajectory fan-outs.
     *
     * Each incoming message replaces the previous set of arrows: the inner
     * container is cleared and rebuilt so there is no cross-message state
     * to reason about.
     *
     * Emits the following events:
     *   * 'change' - a new PoseArray has been applied
     *
     * @constructor
     * @param options - object with the following keys:
     *   * ros - the ROSLIB.Ros connection handle
     *   * topic (optional) - the pose array topic, defaults to '/particlecloud'
     *   * rootObject (optional) - the root createjs object to attach to
     *   * size (optional) - forwarded to ROS2D.NavigationArrow (per-pose arrow)
     *   * strokeSize (optional) - forwarded to ROS2D.NavigationArrow
     *   * strokeColor (optional) - forwarded to ROS2D.NavigationArrow
     *   * fillColor (optional) - forwarded to ROS2D.NavigationArrow
     */
    constructor(options: any);
    topicName: any;
    rootObject: any;
    _arrowOptions: {
        size: any;
        strokeSize: any;
        strokeColor: any;
        fillColor: any;
    };
    tfClient: any;
    node: any;
    container: createjs.Container;
    rosTopic: ROSLIB.Topic<unknown>;
    /**
     * @private
     * Rebuild the arrow set from a PoseArray message.
     */
    private _render;
    /**
     * @private
     * Drop every child arrow from the managed container.
     */
    private _clearContainer;
    /**
     * Detach from the topic and drop the managed container from the rootObject.
     */
    unsubscribe(): void;
}
import EventEmitter from 'eventemitter3';
import * as createjs from 'createjs-module';
import * as ROSLIB from 'roslib';
