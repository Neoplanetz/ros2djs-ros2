/**
 * A GridLines object is used to display grid lines in a 2D viewer.
 * It inherits from createjs.Shape.
 *
 * @constructor
 * @param {Object} options - object with following keys:
 *   * gridSpacing (optional) - the spacing of the grid lines in meters (default: 1)
 *   * gridExtent (optional) - the extent of the grid in meters (default: 200)
 *   * gridColor (optional) - the color of the grid lines (default: 'rgba(0,0,0,0.2)')
 *   * gridWidth (optional) - the width of the grid lines (default: 0.02)
 */
ROS2D.GridLines = function(options) {
  options = options || {};
  const gridSpacing = options.gridSpacing || 1;
  const gridExtent = options.gridExtent || 200;
  const gridColor = options.gridColor || 'rgba(0,0,0,0.2)';
  const gridWidth = options.gridWidth || 0.02;

  const graphics = new createjs.Graphics();
  graphics.beginStroke(gridColor).setStrokeStyle(gridWidth);

  // Vertical grid lines
  for (let i = -gridExtent; i <= gridExtent; i += gridSpacing) {
    graphics.moveTo(i, -gridExtent).lineTo(i, gridExtent);
  }

  // Horizontal grid lines
  for (let i = -gridExtent; i <= gridExtent; i += gridSpacing) {
    graphics.moveTo(-gridExtent, -i).lineTo(gridExtent, -i);
  }
  
  createjs.Shape.call(this, graphics);
};
ROS2D.GridLines.prototype.__proto__ = createjs.Shape.prototype;
