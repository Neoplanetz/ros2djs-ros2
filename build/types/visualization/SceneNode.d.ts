/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/
export class SceneNode {
    /**
    * Add LaserScan to a view
    *
    * @constructor
    * @param options - object with following keys:
    *   * ros - ros
    *   * topicName - topicName
    *   * compression - compression
    *   * points - points
    *   * rosTopic - rosTopic
    */
    constructor(options: any);
    tfClient: any;
    frameID: any;
    pose: any;
    visible: boolean;
    tfUpdate: (msg: any) => void;
    /**
    * Set the pose of the associated model.
    *
    * @param pose - the pose to update with
    */
    updatePose(pose: any): void;
    unsubscribeTf(): void;
}
