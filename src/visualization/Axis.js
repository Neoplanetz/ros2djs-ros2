/**
 * An Axis object is used to display X and Y axes in a 2D viewer.
 * It inherits from createjs.Container.
 *
 * @constructor
 * @param {Object} options - object with following keys:
 *   * axisLength (optional) - the length of the axes in meters (default: 1.5)
 *   * axisWidth (optional) - the width of the axis lines (default: 0.05)
 *   * arrowSize (optional) - the size of the arrow heads (default: 0.2)
 *   * xColor (optional) - the color of the X-axis (default: 'red')
 *   * yColor (optional) - the color of the Y-axis (default: 'green')
 */
ROS2D.Axis = function(options) {
  options = options || {};
  const axisLength = options.axisLength || 1.5;
  const axisWidth = options.axisWidth || 0.05;
  const arrowSize = options.arrowSize || 0.2;
  const xColor = options.xColor || 'red';
  const yColor = options.yColor || 'green';

  // Create X-axis
  const xGraphics = new createjs.Graphics();
  xGraphics
    .beginStroke(xColor)
    .setStrokeStyle(axisWidth)
    .moveTo(0, 0)
    .lineTo(axisLength, 0)
    // Arrow head for X-axis
    .moveTo(axisLength - arrowSize, -arrowSize / 2)
    .lineTo(axisLength, 0)
    .lineTo(axisLength - arrowSize, arrowSize / 2);
  const xAxis = new createjs.Shape(xGraphics);

  // Create Y-axis
  const yGraphics = new createjs.Graphics();
  yGraphics
    .beginStroke(yColor)
    .setStrokeStyle(axisWidth)
    .moveTo(0, 0)
    .lineTo(0, -axisLength) // Negative Y because ROS2D inverts Y-axis
    // Arrow head for Y-axis
    .moveTo(-arrowSize / 2, -(axisLength - arrowSize))
    .lineTo(0, -axisLength)
    .lineTo(arrowSize / 2, -(axisLength - arrowSize));
  const yAxis = new createjs.Shape(yGraphics);

  // Create axis labels
  const xLabel = new createjs.Text('X', '0.5px Arial', xColor);
  xLabel.x = axisLength + 0.2;
  xLabel.y = 0;
  xLabel.scaleX = 0.5;
  xLabel.scaleY = 0.5;

  const yLabel = new createjs.Text('Y', '0.5px Arial', yColor);
  yLabel.x = 0.2;
  yLabel.y = -(axisLength + 0.2);
  yLabel.scaleX = 0.5;
  yLabel.scaleY = 0.5;

  createjs.Container.call(this);
  this.addChild(xAxis, yAxis, xLabel, yLabel);
};
ROS2D.Axis.prototype.__proto__ = createjs.Container.prototype;
