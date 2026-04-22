/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */

/**
 * A shape to draw a nav_msgs/Path msg
 *
 * @constructor
 * @param options - object with following keys:
 *   * path (optional) - the initial path to draw
 *   * strokeSize (optional) - the size of the outline
 *   * strokeColor (optional) - the createjs color for the stroke
 */
ROS2D.PathShape = function(options) {
	// Parent init first; transpiled ES6 class requires super() before `this`.
	createjs.Shape.call(this);
	options = options || {};
	var path = options.path;
	this.strokeSize = options.strokeSize || 3;
	this.strokeColor = options.strokeColor || createjs.Graphics.getRGB(0, 0, 0);

	// draw the line
	this.graphics = new createjs.Graphics();

	this._drawPath(path);
};

/**
 * Set the path to draw
 *
 * @param path of type nav_msgs/Path
 */
ROS2D.PathShape.prototype.setPath = function(path) {
	this.graphics.clear();
	this._drawPath(path);
};

/**
 * Draw the given nav_msgs/Path if it contains at least one pose.
 *
 * @private
 * @param path of type nav_msgs/Path
 */
ROS2D.PathShape.prototype._drawPath = function(path) {
	var poses = path && path.poses;
	if (!poses || poses.length === 0) {
		return;
	}
	this.graphics.setStrokeStyle(this.strokeSize);
	this.graphics.beginStroke(this.strokeColor);
	this.graphics.moveTo(poses[0].pose.position.x / this.scaleX, poses[0].pose.position.y / -this.scaleY);
	for (var i=1; i<poses.length; ++i) {
		this.graphics.lineTo(poses[i].pose.position.x / this.scaleX, poses[i].pose.position.y / -this.scaleY);
	}
	this.graphics.endStroke();
};

ROS2D.PathShape.prototype.__proto__ = createjs.Shape.prototype;
