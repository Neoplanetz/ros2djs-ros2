/**
 * @fileOverview
 * Draws a sensor_msgs/LaserScan as 2D hit points in ROS2D.
 */

/**
 * A shape that renders the valid returns from a LaserScan message as
 * filled circles in the local sensor frame.
 *
 * @constructor
 * @param options - object with following keys:
 *   * pointSize (optional) - rendered point diameter in meters (default 0.03)
 *   * pointColor (optional) - the createjs color for the points
 *   * sampleStep (optional) - draw every Nth beam (default 1)
 *   * maxRange (optional) - additional upper bound for accepted ranges
 *   * negateY (optional) - negate Y when drawing directly in canvas coordinates
 */
ROS2D.LaserScanShape = function(options) {
  // Parent init first; transpiled ES6 class requires super() before `this`.
  createjs.Shape.call(this);
  options = options || {};
  this.pointSize = (typeof options.pointSize === 'number') ? options.pointSize : 0.03;
  this.pointColor = options.pointColor || createjs.Graphics.getRGB(255, 0, 0);
  this.sampleStep = (typeof options.sampleStep === 'number' && options.sampleStep > 0)
    ? Math.floor(options.sampleStep)
    : 1;
  this.maxRange = (typeof options.maxRange === 'number') ? options.maxRange : null;
  this.negateY = options.negateY !== false;

  this.graphics = new createjs.Graphics();
};

/**
 * Redraw the current scan as points.
 *
 * @param message of type sensor_msgs/LaserScan
 */
ROS2D.LaserScanShape.prototype.setScan = function(message) {
  this.graphics.clear();

  var ranges = message && message.ranges;
  if (!ranges || ranges.length === 0) {
    return;
  }

  var lowerBound = (typeof message.range_min === 'number') ? message.range_min : 0;
  var upperBound = (typeof message.range_max === 'number') ? message.range_max : Infinity;
  if (typeof this.maxRange === 'number') {
    upperBound = Math.min(upperBound, this.maxRange);
  }
  var radius = this.pointSize / 2;

  this.graphics.beginFill(this.pointColor);
  for (var i = 0; i < ranges.length; i += this.sampleStep) {
    var range = ranges[i];
    if (!this._isValidRange(range, lowerBound, upperBound)) {
      continue;
    }
    var angle = message.angle_min + i * message.angle_increment;
    var x = range * Math.cos(angle);
    var y = range * Math.sin(angle);
    this.graphics.drawCircle(x, this.negateY ? -y : y, radius);
  }
};

/**
 * Check whether a scan range should be rendered.
 *
 * @private
 * @param range - scan range
 * @param lowerBound - minimum accepted range
 * @param upperBound - maximum accepted range
 * @returns {boolean} true when the range should be drawn
 */
ROS2D.LaserScanShape.prototype._isValidRange = function(range, lowerBound, upperBound) {
  return typeof range === 'number' &&
    isFinite(range) &&
    range >= lowerBound &&
    range <= upperBound;
};

ROS2D.LaserScanShape.prototype.__proto__ = createjs.Shape.prototype;
