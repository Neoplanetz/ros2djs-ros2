/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */

import * as createjs from 'createjs-module';

/**
 * Adds zooming to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply zoom to
 *   * minScale (optional) - minimum scale to set to preserve precision
 */
export class ZoomView {

  constructor(options) {
    options = options || {};
    this.rootObject = options.rootObject;
    this.minScale = options.minScale || 0.001;

    // get a handle to the stage
    if (this.rootObject instanceof createjs.Stage) {
      this.stage = this.rootObject;
    }
    else {
      this.stage = this.rootObject.getStage();
    }

    this.center = { x: 0, y: 0, z: 0 };
    this.startShift = { x: 0, y: 0, z: 0 };
    this.startScale = { x: 0, y: 0, z: 0 };
  }

  startZoom(centerX, centerY) {
    this.center.x = centerX;
    this.center.y = centerY;
    this.startShift.x = this.stage.x;
    this.startShift.y = this.stage.y;
    this.startScale.x = this.stage.scaleX;
    this.startScale.y = this.stage.scaleY;
  }

  zoom(zoom) {
    // Make sure scale doesn't become too small
    if (this.startScale.x*zoom < this.minScale) {
      zoom = this.minScale/this.startScale.x;
    }
    if (this.startScale.y*zoom < this.minScale) {
      zoom = this.minScale/this.startScale.y;
    }

    this.stage.scaleX = this.startScale.x*zoom;
    this.stage.scaleY = this.startScale.y*zoom;

    this.stage.x = this.startShift.x - (this.center.x-this.startShift.x) * (this.stage.scaleX/this.startScale.x - 1);
    this.stage.y = this.startShift.y - (this.center.y-this.startShift.y) * (this.stage.scaleY/this.startScale.y - 1);
  }
}
