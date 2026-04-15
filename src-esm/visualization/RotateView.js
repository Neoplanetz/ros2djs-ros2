/**
 * @fileOverview
 * @author Assistant
 */

import * as createjs from 'createjs-module';

/**
 * Adds rotation to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply rotation to
 */
export class RotateView {

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

    this.startAngle = 0;
    this.currentRotation = 0;
  }

  /**
   * Start the rotation
   * @param startX - the starting x position
   * @param startY - the starting y position
   */
  startRotate(startX, startY) {
    // Calculate initial angle from center of stage
    this.startAngle = Math.atan2(startY - this.stage.y, startX - this.stage.x);
  }

  /**
   * Rotate the view
   * @param curX - the current x position
   * @param curY - the current y position
   */
  rotate(curX, curY) {
    // Calculate current angle from center of stage
    var currentAngle = Math.atan2(curY - this.stage.y, curX - this.stage.x);

    // Calculate angle difference and convert to degrees
    var angleDiff = (currentAngle - this.startAngle) * (180 / Math.PI);

    // Update rotation
    this.currentRotation += angleDiff;
    this.stage.rotation = this.currentRotation;

    // Update start angle for next rotation
    this.startAngle = currentAngle;
  }
}
