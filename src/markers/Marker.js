/**
 * @fileOverview
 * Top-down 2D rendering of a single visualization_msgs/Marker message
 * onto a createjs Container. Built so that ROS2D.MarkerArrayClient can
 * keep using a uniform child-add/child-remove flow regardless of the
 * underlying marker primitive.
 *
 * Z-axis information is intentionally dropped: only pose.position.x/y
 * and the yaw component of pose.orientation are honored. MESH_RESOURCE
 * is not representable in 2D and is skipped with a console warning.
 *
 * The viewer (ROS2D.Viewer) translates the stage to (0, height) but does
 * not flip scaleY, so child y values still grow downward in canvas space.
 * To make ROS +Y point up on screen this module negates every y value
 * the way OccupancyGrid.js and PathShape.js do.
 */

/**
 * @constructor
 * @param {Object} options
 * @param {Object} options.message - a visualization_msgs/Marker message
 * @param {boolean} [options.applyPose=true] - when false the marker does not
 *   set its own x/y/rotation; the caller (typically ROS2D.SceneNode)
 *   positions the marker externally
 */
ROS2D.Marker = function(options) {
  createjs.Container.call(this);
  options = options || {};
  var message = options.message;
  if (!message) {
    return;
  }

  var color = message.color || { r: 1, g: 1, b: 1, a: 1 };
  var scale = message.scale || { x: 1, y: 1, z: 1 };
  var pose = message.pose || {
    position: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 }
  };
  var points = message.points || [];
  var colors = message.colors || [];
  var fillColor = this._rgbaToCss(color);
  var i;

  switch (message.type) {
    case 0: // ARROW
      this.addChild(new ROS2D.ArrowShape({
        size: scale.x || 1,
        strokeSize: 0,
        strokeColor: fillColor,
        fillColor: fillColor
      }));
      break;

    case 1: // CUBE
      // Centered rectangle: symmetrical, so negating y is a no-op.
      var cube = new createjs.Shape();
      cube.graphics.beginFill(fillColor).drawRect(
        -scale.x / 2, -scale.y / 2, scale.x, scale.y
      );
      this.addChild(cube);
      break;

    case 2: // SPHERE
    case 3: // CYLINDER
      var circle = new createjs.Shape();
      circle.graphics.beginFill(fillColor).drawCircle(0, 0, scale.x / 2);
      this.addChild(circle);
      break;

    case 4: // LINE_STRIP
      if (points.length >= 2) {
        var lineStrip = new createjs.Shape();
        var lsg = lineStrip.graphics;
        lsg.setStrokeStyle(scale.x || 0.05).beginStroke(fillColor);
        lsg.moveTo(points[0].x, -points[0].y);
        for (i = 1; i < points.length; i++) {
          lsg.lineTo(points[i].x, -points[i].y);
        }
        lsg.endStroke();
        this.addChild(lineStrip);
      }
      break;

    case 5: // LINE_LIST
      if (points.length >= 2) {
        var lineList = new createjs.Shape();
        var llg = lineList.graphics;
        llg.setStrokeStyle(scale.x || 0.05).beginStroke(fillColor);
        for (i = 0; i + 1 < points.length; i += 2) {
          llg.moveTo(points[i].x, -points[i].y);
          llg.lineTo(points[i + 1].x, -points[i + 1].y);
        }
        llg.endStroke();
        this.addChild(lineList);
      }
      break;

    case 6: // CUBE_LIST
      for (i = 0; i < points.length; i++) {
        var cubeColor = colors[i]
          ? this._rgbaToCss(colors[i])
          : fillColor;
        var cubeShape = new createjs.Shape();
        cubeShape.graphics.beginFill(cubeColor).drawRect(
          points[i].x - scale.x / 2,
          -points[i].y - scale.y / 2,
          scale.x,
          scale.y
        );
        this.addChild(cubeShape);
      }
      break;

    case 7: // SPHERE_LIST
      for (i = 0; i < points.length; i++) {
        var sphereColor = colors[i]
          ? this._rgbaToCss(colors[i])
          : fillColor;
        var sphereShape = new createjs.Shape();
        sphereShape.graphics.beginFill(sphereColor).drawCircle(
          points[i].x, -points[i].y, scale.x / 2
        );
        this.addChild(sphereShape);
      }
      break;

    case 8: // POINTS
      var pw = scale.x || 0.05;
      var ph = scale.y || pw;
      for (i = 0; i < points.length; i++) {
        var pointColor = colors[i]
          ? this._rgbaToCss(colors[i])
          : fillColor;
        var pointShape = new createjs.Shape();
        pointShape.graphics.beginFill(pointColor).drawRect(
          points[i].x - pw / 2,
          -points[i].y - ph / 2,
          pw,
          ph
        );
        this.addChild(pointShape);
      }
      break;

    case 9: // TEXT_VIEW_FACING
      var fontSize = scale.z || 1;
      var text = new createjs.Text(
        message.text || '', fontSize + 'px Arial', fillColor
      );
      this.addChild(text);
      break;

    case 10: // MESH_RESOURCE
      console.warn(
        'ROS2D.Marker: MESH_RESOURCE (type=10) is not supported in 2D top-down view; skipping.'
      );
      break;

    case 11: // TRIANGLE_LIST
      if (points.length >= 3) {
        var triShape = new createjs.Shape();
        var tlg = triShape.graphics;
        for (i = 0; i + 2 < points.length; i += 3) {
          var triColor = colors[i]
            ? this._rgbaToCss(colors[i])
            : fillColor;
          tlg.beginFill(triColor);
          tlg.moveTo(points[i].x, -points[i].y);
          tlg.lineTo(points[i + 1].x, -points[i + 1].y);
          tlg.lineTo(points[i + 2].x, -points[i + 2].y);
          tlg.closePath();
          tlg.endFill();
        }
        this.addChild(triShape);
      }
      break;

    default:
      console.warn('ROS2D.Marker: unknown marker type ' + message.type);
      break;
  }

  // Default true: preserve v1.2 behavior. MarkerArrayClient passes false
  // when the marker is wrapped in a ROS2D.SceneNode that positions it.
  var applyPose = options.applyPose !== false;
  if (applyPose) {
    this.x = pose.position.x;
    this.y = -pose.position.y;
    this.rotation = ROS2D.quaternionToGlobalTheta(pose.orientation);
  }
};

/**
 * Convert a ROS color {r, g, b, a} (0..1 floats) to a createjs CSS color string.
 *
 * @private
 * @param {{r: number, g: number, b: number, a: number}} c
 * @returns {string} CSS color string usable by createjs Graphics
 */
ROS2D.Marker.prototype._rgbaToCss = function(c) {
  return createjs.Graphics.getRGB(
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255),
    c.a
  );
};

Object.setPrototypeOf(ROS2D.Marker.prototype, createjs.Container.prototype);
