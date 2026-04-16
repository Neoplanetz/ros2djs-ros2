import * as createjs from 'createjs-module';

/**
 * @fileOverview
 * @author Raffaello Bonghi - raffaello.bonghi@officinerobotiche.it
 */

export class Grid extends createjs.Shape {

  /**
   * A Grid object draw in map.
   *
   * @constructor
   * @param options - object with following keys:
   *  * size (optional) - the size of the grid
   *  * cellSize (optional) - the cell size of map
   *  * lineWidth (optional) - the width of the lines in the grid
   */
   constructor(options) {
      var that = this;
      options = options || {};
      var size = options.size || 10;
      var cellSize = options.cellSize || 0.1;
      var lineWidth = options.lineWidth || 0.001;
      // draw the arrow
      var graphics = new createjs.Graphics();
      // line width
      graphics.setStrokeStyle(lineWidth*5);
      graphics.beginStroke(createjs.Graphics.getRGB(0, 0, 0));
      graphics.beginFill(createjs.Graphics.getRGB(255, 0, 0));
      graphics.moveTo(-size*cellSize, 0);
      graphics.lineTo(size*cellSize, 0);
      graphics.moveTo(0, -size*cellSize);
      graphics.lineTo(0, size*cellSize);
      graphics.endFill();
      graphics.endStroke();

      graphics.setStrokeStyle(lineWidth);
      graphics.beginStroke(createjs.Graphics.getRGB(0, 0, 0));
      graphics.beginFill(createjs.Graphics.getRGB(255, 0, 0));
      for (var i = -size; i <= size; i++) {
          graphics.moveTo(-size*cellSize, i * cellSize);
          graphics.lineTo(size*cellSize, i * cellSize);
          graphics.moveTo(i * cellSize, -size*cellSize);
          graphics.lineTo(i * cellSize, size*cellSize);
      }
      graphics.endFill();
      graphics.endStroke();
      // create the shape
      super(graphics);

  };
}
