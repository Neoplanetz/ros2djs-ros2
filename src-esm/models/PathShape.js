/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */

import * as createjs from 'createjs-module';

/**
 * A shape to draw a nav_msgs/Path msg
 *
 * @constructor
 * @param options - object with following keys:
 *   * path (optional) - the initial path to draw
 *   * strokeSize (optional) - the size of the outline
 *   * strokeColor (optional) - the createjs color for the stroke
 */
export class PathShape extends createjs.Shape {

  constructor(options) {
    options = options || {};
    var path = options.path;

    // We need a temporary graphics to pass to super, then re-assign
    var graphics = new createjs.Graphics();

    super(graphics);

    this.strokeSize = options.strokeSize || 3;
    this.strokeColor = options.strokeColor || createjs.Graphics.getRGB(0, 0, 0);

    // Use the graphics from the Shape
    this.graphics = graphics;

    if (path !== null && typeof path !== 'undefined') {
      this.graphics.setStrokeStyle(this.strokeSize);
      this.graphics.beginStroke(this.strokeColor);
      this.graphics.moveTo(path.poses[0].pose.position.x / this.scaleX, path.poses[0].pose.position.y / -this.scaleY);
      for (var i=1; i<path.poses.length; ++i) {
        this.graphics.lineTo(path.poses[i].pose.position.x / this.scaleX, path.poses[i].pose.position.y / -this.scaleY);
      }
      this.graphics.endStroke();
    }
  }

  /**
   * Set the path to draw
   *
   * @param path of type nav_msgs/Path
   */
  setPath(path) {
    this.graphics.clear();
    if (path !== null && typeof path !== 'undefined') {
      this.graphics.setStrokeStyle(this.strokeSize);
      this.graphics.beginStroke(this.strokeColor);
      this.graphics.moveTo(path.poses[0].pose.position.x / this.scaleX, path.poses[0].pose.position.y / -this.scaleY);
      for (var i=1; i<path.poses.length; ++i) {
        this.graphics.lineTo(path.poses[i].pose.position.x / this.scaleX, path.poses[i].pose.position.y / -this.scaleY);
      }
      this.graphics.endStroke();
    }
  }
}
