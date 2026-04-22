/**
 * @fileOverview
 * @author Bart van Vliet - bart@dobots.nl
 */

/**
 * A trace of poses, handy to see where a robot has been
 *
 * @constructor
 * @param options - object with following keys:
 *   * pose (optional) - the first pose of the trace
 *   * strokeSize (optional) - the size of the outline
 *   * strokeColor (optional) - the createjs color for the stroke
 *   * maxPoses (optional) - the maximum number of poses to keep, 0 for infinite
 *   * minDist (optional) - the minimal distance between poses to use the pose for drawing (default 0.05)
 */
ROS2D.TraceShape = function(options) {
	// Parent init first; transpiled ES6 class requires super() before `this`.
	createjs.Shape.call(this);
//	var that = this;
	options = options || {};
	var pose = options.pose;
	this.strokeSize = options.strokeSize || 3;
	this.strokeColor = options.strokeColor || createjs.Graphics.getRGB(0, 0, 0);
	this.maxPoses = (options.maxPoses || options.maxPoses === 0) ? options.maxPoses : 100;
	this.minDist = options.minDist || 0.05;

	// Store minDist as the square of it
	this.minDist = this.minDist*this.minDist;

	// Array of the poses
	// TODO: do we need this?
	this.poses = [];

	// Create the graphics
	this.graphics = new createjs.Graphics();

	// Add first pose if given
	if (pose !== null && typeof pose !== 'undefined') {
		this.poses.push(pose);
	}

	// Initial draw so strokeSize/strokeColor are respected consistently
	// with the redraw() path (single source of truth for stroke settings).
	this._render();
};

/**
 * Redraw every pose currently in the trace using the current
 * strokeSize/strokeColor. Call this after changing strokeSize or
 * strokeColor on an existing TraceShape to apply the new values:
 *
 *   trace.strokeSize = 0.05;
 *   trace.redraw();
 */
ROS2D.TraceShape.prototype.redraw = function() {
	this._render();
};

/**
 * @private
 * Regenerate the graphics buffer from this.poses.
 */
ROS2D.TraceShape.prototype._render = function() {
	this.graphics.clear();
	this.graphics.setStrokeStyle(this.strokeSize);
	this.graphics.beginStroke(this.strokeColor);
	if (this.poses.length > 0) {
		this.graphics.moveTo(this.poses[0].position.x / this.scaleX, this.poses[0].position.y / -this.scaleY);
		for (var i = 1; i < this.poses.length; ++i) {
			this.graphics.lineTo(this.poses[i].position.x / this.scaleX, this.poses[i].position.y / -this.scaleY);
		}
	}
	this.graphics.endStroke();
};

/**
 * Adds a pose to the trace and updates the graphics.
 *
 * The graphics buffer is regenerated through _render() on every accepted
 * pose so the stroke context set up in the constructor (which ends after
 * setStrokeStyle/beginStroke via endStroke) is re-established on each
 * redraw. Without this, incremental moveTo/lineTo calls land outside the
 * active stroke and the trace renders invisibly. Mirrors the same approach
 * popFront() uses.
 *
 * @param pose of type ROSLIB.Pose
 */
ROS2D.TraceShape.prototype.addPose = function(pose) {
	var last = this.poses.length-1;
	if (last < 0) {
		this.poses.push(pose);
	}
	else {
		var prevX = this.poses[last].position.x;
		var prevY = this.poses[last].position.y;
		var dx = (pose.position.x - prevX);
		var dy = (pose.position.y - prevY);
		if (dx*dx + dy*dy > this.minDist) {
			this.poses.push(pose);
		} else {
			// Pose rejected — no geometry change, no redraw needed.
			return;
		}
	}
	if (this.maxPoses > 0 && this.maxPoses < this.poses.length) {
		this.poses.shift();
	}
	this._render();
};

/**
 * Removes the front pose and redraws from the remaining trace. Unlike
 * the previous implementation this goes through _render() so the first
 * segment starts with a moveTo and the stroke mode is reapplied
 * cleanly — fixes a visual bug where popFront left the pen starting
 * from a stale location.
 */
ROS2D.TraceShape.prototype.popFront = function() {
	if (this.poses.length > 0) {
		this.poses.shift();
		this._render();
	}
};

ROS2D.TraceShape.prototype.__proto__ = createjs.Shape.prototype;
