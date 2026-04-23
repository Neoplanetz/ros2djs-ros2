/**
 * @fileOverview
 * @author Assistant
 */

/**
 * Adds rotation to a view
 *
 * @constructor
 * @param options - object with following keys:
 *   * rootObject (optional) - the root object to apply rotation to
 *   * degreesPerPixel (optional) - degrees to rotate per horizontal drag pixel
 */
ROS2D.RotateView = function(options) {
	options = options || {};
	this.rootObject = options.rootObject;
	this.degreesPerPixel = typeof options.degreesPerPixel === 'number' ? options.degreesPerPixel : 0.35;

	// get a handle to the stage
	if (this.rootObject instanceof createjs.Stage) {
		this.stage = this.rootObject;
	}
	else {
		this.stage = this.rootObject.getStage();
	}

	this.startX = 0;
	this.startY = 0;
	this.startRotation = this.stage.rotation || 0;
	this.currentRotation = this.stage.rotation || 0;
	this.pivotLocal = { x: 0, y: 0 };
};

ROS2D.RotateView.prototype._stageToLocal = function(stageX, stageY) {
	var rotation = (this.stage.rotation || 0) * (Math.PI / 180);
	var cos = Math.cos(rotation);
	var sin = Math.sin(rotation);
	var scaleX = this.stage.scaleX || 1;
	var scaleY = this.stage.scaleY || 1;
	var dx = stageX - this.stage.x;
	var dy = stageY - this.stage.y;

	return {
		x: ((cos * dx) + (sin * dy)) / scaleX,
		y: ((-sin * dx) + (cos * dy)) / scaleY
	};
};

ROS2D.RotateView.prototype._setRotationAroundPivot = function(rotation) {
	var radians = rotation * (Math.PI / 180);
	var cos = Math.cos(radians);
	var sin = Math.sin(radians);
	var scaleX = this.stage.scaleX || 1;
	var scaleY = this.stage.scaleY || 1;
	var scaledPivotX = this.pivotLocal.x * scaleX;
	var scaledPivotY = this.pivotLocal.y * scaleY;

	this.stage.rotation = rotation;
	this.stage.x = this.startX - ((cos * scaledPivotX) - (sin * scaledPivotY));
	this.stage.y = this.startY - ((sin * scaledPivotX) + (cos * scaledPivotY));
};

/**
 * Start the rotation
 * @param startX - the starting x position
 * @param startY - the starting y position
 */
ROS2D.RotateView.prototype.startRotate = function(startX, startY) {
	this.startX = startX;
	this.startY = startY;
	this.startRotation = this.stage.rotation || 0;
	this.currentRotation = this.startRotation;
	this.pivotLocal = this._stageToLocal(startX, startY);
};

/**
 * Rotate the view
 * @param curX - the current x position
 * @param curY - the current y position
 */
ROS2D.RotateView.prototype.rotate = function(curX, curY) {
	var angleDiff = (curX - this.startX) * this.degreesPerPixel;
	this.currentRotation = this.startRotation + angleDiff;
	this._setRotationAroundPivot(this.currentRotation);
};
