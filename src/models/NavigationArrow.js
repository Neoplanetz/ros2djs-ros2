/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A navigation arrow is an oriented marker shaped like an RViz pose
 * arrow (a rectangular shaft with a wider triangular head). The
 * polygon is centered on the local origin so rotation pivots around
 * the visual center of the arrow rather than the tail.
 *
 * The default outline is off (strokeSize = 0) so that callers get a
 * crisp filled arrow that scales cleanly under stage zoom. Pass a
 * positive strokeSize (in stage units) if you want a visible outline.
 *
 * @constructor
 * @param options - object with following keys:
 *   * size (optional) - the total length of the arrow (default 10)
 *   * strokeSize (optional) - the width of the outline; 0 disables it (default 0)
 *   * strokeColor (optional) - the createjs color for the stroke
 *   * fillColor (optional) - the createjs color for the fill
 *   * headLengthRatio (optional) - head length as a fraction of size (default 0.35)
 *   * headWidthRatio (optional) - head half-width as a fraction of size (default 0.20)
 *   * shaftWidthRatio (optional) - shaft half-width as a fraction of size (default 0.08)
 *   * pulse (optional) - if the marker should "pulse" over time
 */
ROS2D.NavigationArrow = function(options) {
  var that = this;
  options = options || {};
  var size = options.size || 10;
  var strokeSize = (typeof options.strokeSize === 'number') ? options.strokeSize : 0;
  var strokeColor = options.strokeColor || createjs.Graphics.getRGB(0, 0, 0);
  var fillColor = options.fillColor || createjs.Graphics.getRGB(255, 0, 0);
  var headLengthRatio = options.headLengthRatio || 0.35;
  var headWidthRatio = options.headWidthRatio || 0.20;
  var shaftWidthRatio = options.shaftWidthRatio || 0.08;
  var pulse = options.pulse;

  // Geometry — total arrow spans [-halfLen, +halfLen] on the local x axis.
  var halfLen = size / 2;
  var headLen = size * headLengthRatio;
  var headHalf = size * headWidthRatio;
  var shaftHalf = size * shaftWidthRatio;
  var headBase = halfLen - headLen;

  var graphics = new createjs.Graphics();
  if (strokeSize > 0) {
    graphics.setStrokeStyle(strokeSize);
    graphics.beginStroke(strokeColor);
  }
  graphics.beginFill(fillColor);
  // Trace the 7-point arrow polygon clockwise starting at the tail-top.
  graphics.moveTo(-halfLen, -shaftHalf);
  graphics.lineTo(headBase, -shaftHalf);
  graphics.lineTo(headBase, -headHalf);
  graphics.lineTo(halfLen, 0);
  graphics.lineTo(headBase, headHalf);
  graphics.lineTo(headBase, shaftHalf);
  graphics.lineTo(-halfLen, shaftHalf);
  graphics.closePath();
  graphics.endFill();
  if (strokeSize > 0) {
    graphics.endStroke();
  }

  // create the shape
  createjs.Shape.call(this, graphics);

  // check if we are pulsing
  if (pulse) {
    // have the model "pulse"
    var growCount = 0;
    var growing = true;
    createjs.Ticker.addEventListener('tick', function() {
      if (growing) {
        that.scaleX *= 1.035;
        that.scaleY *= 1.035;
        growing = (++growCount < 10);
      } else {
        that.scaleX /= 1.035;
        that.scaleY /= 1.035;
        growing = (--growCount < 0);
      }
    });
  }
};
ROS2D.NavigationArrow.prototype.__proto__ = createjs.Shape.prototype;
