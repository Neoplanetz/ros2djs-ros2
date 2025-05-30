# ros2djs

[![CI](https://github.com/RobotWebTools/ros2djs/actions/workflows/main.yml/badge.svg)](https://github.com/RobotWebTools/ros2djs/actions/workflows/main.yml)

***2D Visualization Library for use with the ROS JavaScript Libraries***

For full documentation, see [the ROS wiki](http://ros.org/wiki/ros2djs) or check out some [working demos](https://robotwebtools.github.io/).

[JSDoc](https://robotwebtools.github.io/ros2djs) can be found on the Robot Web Tools website.

This project is released as part of the [Robot Web Tools](https://robotwebtools.github.io/) effort.

### Usage

Pre-built files can be found in either [ros2d.js](build/ros2d.js) or [ros2d.min.js](build/ros2d.min.js).

Alternatively, you can use the current release via the [JsDelivr](https://www.jsdelivr.com/) CDN: ([full](https://cdn.jsdelivr.net/npm/ros2d@0/build/ros2d.js)) | ([min](https://cdn.jsdelivr.net/npm/ros2d@0/build/ros2d.min.js))

### Dependencies

ros2djs depends on:

[EventEmitter2](https://github.com/EventEmitter2/EventEmitter2). The current supported version is 6.4.9. The current supported version can be found on the JsDeliver CDN: ([full](https://cdn.jsdelivr.net/npm/eventemitter2@6/lib/eventemitter2.js)) | ([min](https://cdn.jsdelivr.net/npm/eventemitter2@6/lib/eventemitter2.min.js))

[EaselJS](https://github.com/CreateJS/EaselJS). The current supported version is 1.0.2. The current supported version can be found on the Robot Web Tools CDN: ([full](https://cdn.jsdelivr.net/npm/easeljs@1/lib/easeljs.js)) | ([min](https://cdn.jsdelivr.net/npm/easeljs@1/lib/easeljs.min.js))

[roslibjs](https://github.com/RobotWebTools/roslibjs). The current supported version is 1.3.0. The current supported version can be found on the JsDeliver CDN: ([full](https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.js)) | ([min](https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.min.js))

### Build

Checkout [CONTRIBUTING.md](CONTRIBUTING.md) for details on building.

1. Install Grunt
```bash
sudo npm install -g grunt-cli
sudo rm -rf ~/.npm ~/tmp
```

2. Install Grunt tasks
```bash
cd /path/to/ros2djs/
npm install .
```

3. Build with Grunt
```bash
cd /path/to/ros2djs/
grunt build
```

### License

ros2djs is released with a BSD license. For full terms and conditions, see the [LICENSE](LICENSE) file.

### Authors

See the [AUTHORS.md](AUTHORS.md) file for a full list of contributors.
