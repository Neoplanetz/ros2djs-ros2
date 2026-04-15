/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */

import * as createjs from 'createjs-module';

/**
 * Adds panning to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply panning to
 */
export class PanView {

  constructor(options) {
    options = options || {};
    this.rootObject = options.rootObject;

    // get a handle to the stage
    if (this.rootObject instanceof createjs.Stage) {
      this.stage = this.rootObject;
    }
    else {
      this.stage = this.rootObject.getStage();
    }

    this.startPos = { x: 0, y: 0, z: 0 };
  }

  startPan(startX, startY) {
    this.startPos.x = startX;
    this.startPos.y = startY;
  }

  pan(curX, curY) {
    this.stage.x += curX - this.startPos.x;
    this.startPos.x = curX;
    this.stage.y += curY - this.startPos.y;
    this.startPos.y = curY;
  }
}
