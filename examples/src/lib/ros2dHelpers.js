import createjs from 'createjs-module';
import * as ROSLIB from 'roslib';
import { Axis, GridLines, PanView, RotateView, ZoomView } from 'ros2d';

export function resetViewer(viewer) {
  if (!viewer || !viewer.scene) {
    return;
  }
  viewer.scene.scaleX = 1;
  viewer.scene.scaleY = 1;
  viewer.scene.rotation = 0;
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
    return false;
  }

  const mapWidth = Number(mapLike.width);
  const mapHeight = Number(mapLike.height);
  if (!Number.isFinite(mapWidth) || !Number.isFinite(mapHeight) || mapWidth <= 0 || mapHeight <= 0) {
    return false;
  }

  const origin = mapLike.pose && mapLike.pose.position ? mapLike.pose.position : { x: 0, y: 0 };
  const left = Number.isFinite(mapLike.x) ? mapLike.x : origin.x;
  const top = Number.isFinite(mapLike.y) ? mapLike.y : -(origin.y + mapHeight);
  resetViewer(viewer);
  const uniformScale = Math.min(viewer.width / mapWidth, viewer.height / mapHeight);
  viewer.scene.scaleX = uniformScale;
  viewer.scene.scaleY = uniformScale;
  viewer.scene.x = ((viewer.width - (mapWidth * uniformScale)) / 2) - (left * uniformScale);
  viewer.scene.y = ((viewer.height - (mapHeight * uniformScale)) / 2) - (top * uniformScale);
  return true;
}

export function createInitialMapViewFitter(viewer) {
  let hasFitMap = false;
  return (mapLike) => {
    if (hasFitMap) {
      return false;
    }
    hasFitMap = fitMapView(viewer, mapLike);
    return hasFitMap;
  };
}

export function enableViewerMouseControls(viewer) {
  if (!viewer || !viewer.scene || !viewer.scene.canvas) {
    return () => {};
  }

  const stage = viewer.scene;
  const canvas = stage.canvas;
  const panView = new PanView({ rootObject: stage });
  const rotateView = new RotateView({ rootObject: stage });
  const zoomView = new ZoomView({ rootObject: stage, minScale: 0.01 });
  const interaction = {
    mode: null,
  };

  const getPointerPosition = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const setCursor = () => {
    if (interaction.mode === 'pan') {
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (interaction.mode === 'rotate') {
      canvas.style.cursor = 'crosshair';
      return;
    }
    canvas.style.cursor = 'grab';
  };

  const handleMouseDown = (event) => {
    const pointer = getPointerPosition(event);
    if (event.button === 0) {
      interaction.mode = 'pan';
      panView.startPan(pointer.x, pointer.y);
      setCursor();
      return;
    }
    if (event.button === 2) {
      interaction.mode = 'rotate';
      rotateView.startRotate(pointer.x, pointer.y);
      setCursor();
    }
  };

  const handleMouseMove = (event) => {
    if (!interaction.mode) {
      return;
    }
    const pointer = getPointerPosition(event);
    if (interaction.mode === 'pan') {
      panView.pan(pointer.x, pointer.y);
      return;
    }
    if (interaction.mode === 'rotate') {
      rotateView.rotate(pointer.x, pointer.y);
    }
  };

  const handleMouseUp = () => {
    interaction.mode = null;
    setCursor();
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const pointer = getPointerPosition(event);
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    zoomView.startZoom(pointer.x, pointer.y);
    zoomView.zoom(zoomFactor);
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
  };

  canvas.style.cursor = 'grab';
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('wheel', handleWheel);
    canvas.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
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
