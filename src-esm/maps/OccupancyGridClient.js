/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

import EventEmitter from 'eventemitter3';
import * as createjs from 'createjs-module';
import { OccupancyGrid } from './OccupancyGrid';
import { Grid } from '../models/Grid';

/**
 * A map that listens to a given occupancy grid topic.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 */
export class OccupancyGridClient extends EventEmitter {

  constructor(options) {
    super();
    var that = this;
    options = options || {};
    var ros = options.ros;
    var topic = options.topic || '/map';
    this.continuous = options.continuous;
    this.rootObject = options.rootObject || new createjs.Container();

    // current grid that is displayed
    // create an empty shape to start with, so that the order remains correct.
    this.currentGrid = new createjs.Shape();
    this.rootObject.addChild(this.currentGrid);
    // work-around for a bug in easeljs -- needs a second object to render correctly
    this.rootObject.addChild(new Grid({size:1}));

    // subscribe to the topic
    var rosTopic = new ROSLIB.Topic({
      ros : ros,
      name : topic,
      messageType : 'nav_msgs/OccupancyGrid'
      // compression : 'png'
    });

    rosTopic.subscribe(function(message) {
      // check for an old map
      var index = null;
      if (that.currentGrid) {
        index = that.rootObject.getChildIndex(that.currentGrid);
        that.rootObject.removeChild(that.currentGrid);
      }

      that.currentGrid = new OccupancyGrid({
        message : message
      });
      if (index !== null) {
        that.rootObject.addChildAt(that.currentGrid, index);
      }
      else {
        that.rootObject.addChild(that.currentGrid);
      }

      that.emit('change');

      // check if we should unsubscribe
      if (!that.continuous) {
        rosTopic.unsubscribe();
      }
    });
  }
}
