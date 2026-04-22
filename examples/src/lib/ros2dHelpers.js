import createjs from 'createjs-module';
import * as ROSLIB from 'roslib';
import { Axis, GridLines } from 'ros2d';

export function resetViewer(viewer) {
  if (!viewer || !viewer.scene) {
    return;
  }
  viewer.scene.scaleX = 1;
  viewer.scene.scaleY = 1;
  viewer.scene.x = 0;
  viewer.scene.y = viewer.height;
  delete viewer.scene.x_prev_shift;
  delete viewer.scene.y_prev_shift;
}

export function centerMetricView(viewer, width, height) {
  resetViewer(viewer);
  viewer.scaleToDimensions(width, height);
  viewer.shift(-width / 2, -height / 2);
}

export function fitMapView(viewer, mapLike) {
  if (!viewer || !mapLike) {
    return;
  }
  resetViewer(viewer);
  viewer.scaleToDimensions(mapLike.width, mapLike.height);
  viewer.shift(mapLike.pose.position.x, mapLike.pose.position.y);
}

export function createDemoRoot(viewer) {
  const root = new createjs.Container();
  viewer.scene.addChild(root);
  return root;
}

export function removeDemoRoot(viewer, root) {
  if (viewer && viewer.scene && root) {
    viewer.scene.removeChild(root);
  }
}

export function addMetricBackdrop(root, options = {}) {
  const extent = options.extent || 12;
  root.addChild(new GridLines({
    gridSpacing: options.spacing || 1,
    gridExtent: extent,
    gridColor: options.gridColor || 'rgba(28, 32, 35, 0.12)',
    gridWidth: options.gridWidth || 0.02,
  }));
  root.addChild(new Axis({
    axisLength: options.axisLength || 1.5,
    axisWidth: options.axisWidth || 0.04,
    arrowSize: options.arrowSize || 0.18,
    xColor: options.xColor || '#d43f27',
    yColor: options.yColor || '#1f8f57',
  }));
}

export function createTfClient(ros, fixedFrame) {
  if (!ros || !fixedFrame) {
    return null;
  }
  const TFClientClass = ROSLIB.ROS2TFClient || ROSLIB.TFClient;
  if (!TFClientClass) {
    return null;
  }
  return new TFClientClass({
    ros,
    fixedFrame,
    angularThres: 0.01,
    transThres: 0.01,
    rate: 10.0,
  });
}

export function disposeTfClient(tfClient) {
  if (!tfClient) {
    return;
  }
  if (typeof tfClient.dispose === 'function') {
    tfClient.dispose();
  }
}
