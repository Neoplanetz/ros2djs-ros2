/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/
export class Points {
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
    rootObject: any;
    max_pts: any;
    pointRatio: any;
    messageRatio: any;
    messageCount: number;
    material: any;
    colorsrc: any;
    colormap: any;
    sn: SceneNode;
    setup(frame: any, point_step: any, fields: any): boolean;
    fields: {};
    geom: any;
    positions: any;
    colors: any;
    getColor: (dv: any, base: any, le: any) => any;
    object: any;
    update(n: any): void;
}
import { SceneNode } from './SceneNode';
