/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A image map is a PNG image scaled to fit to the dimensions of a OccupancyGrid.
 *
 * Emits the following events:
 *   * 'change' - there was an update or change in the map
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map meta data topic to listen to
 *   * image - the image URL to load
 *   * rootObject (optional) - the root object to add this marker to
 */
ROS2D.ImageMapClient = function(options) {
  EventEmitter2.call(this);
  options = options || {};
  var ros = options.ros;
  var width = options.width;
  var height = options.height;
  var resolution = options.resolution;
  var position = options.position || { x: 0, y: 0, z: 0 };
  var orientation = options.orientation || { x: 0, y: 0, z: 0, w: 1 };
  var origin = { position: position, orientation: orientation };
  this.image = options.image;
  this.rootObject = options.rootObject || new createjs.Container();

  // create an empty shape to start with
  this.currentImage = new createjs.Shape();

  // create message object
  var message = {
    width: width,
    height: height,
    resolution: resolution,
    origin: origin
  };

  // create image map
  this.currentImage = new ROS2D.ImageMap({
    message: message,
    image: this.image
  });
  this.rootObject.addChild(this.currentImage);
  // Emit the 'change' event asynchronously to ensure listeners are registered
  setTimeout(() => { this.emit('change'); }, 0);
};
ROS2D.ImageMapClient.prototype.__proto__ = EventEmitter2.prototype;
