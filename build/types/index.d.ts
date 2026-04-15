/**
 * Type declarations for ros2d v1.0.0
 */

export declare const REVISION: string;

export declare class Viewer {
  scene: any;
  width: number;
  height: number;
  constructor(options: {
    divID: string;
    width: number;
    height: number;
    background?: string;
  });
  addObject(object: any): void;
  scaleToDimensions(width: number, height: number): void;
  shift(x: number, y: number): void;
}

export declare class OccupancyGridClient {
  rootObject: any;
  currentGrid: any;
  continuous: boolean | undefined;
  constructor(options: {
    ros: any;
    topic?: string;
    rootObject?: any;
    continuous?: boolean;
  });
  on(event: string, callback: (...args: any[]) => void): this;
  once(event: string, callback: (...args: any[]) => void): this;
  off(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

export declare class OccupancyGrid {
  pose: { position: any; orientation: any };
  constructor(options: { message: any });
}

export declare class OccupancyGridSrvClient {
  rootObject: any;
  currentGrid: any;
  constructor(options: {
    ros: any;
    service?: string;
    rootObject?: any;
  });
  on(event: string, callback: (...args: any[]) => void): this;
  once(event: string, callback: (...args: any[]) => void): this;
  off(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

export declare class ImageMap {
  pose: { position: any; orientation: any };
  constructor(options: { message: any; image: string });
}

export declare class ImageMapClient {
  rootObject: any;
  currentImage: any;
  image: string;
  constructor(options: {
    ros?: any;
    width?: number;
    height?: number;
    resolution?: number;
    position?: any;
    orientation?: any;
    image: string;
    rootObject?: any;
  });
  on(event: string, callback: (...args: any[]) => void): this;
  once(event: string, callback: (...args: any[]) => void): this;
  off(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

export declare class NavigationImage {
  constructor(options: {
    size?: number;
    image: string;
    pulse?: boolean;
    alpha?: number;
  });
}

export declare class PathShape {
  strokeSize: number;
  strokeColor: string;
  graphics: any;
  constructor(options?: {
    path?: any;
    strokeSize?: number;
    strokeColor?: string;
  });
  setPath(path: any): void;
}

export declare class ArrowShape {
  constructor(options?: {
    size?: number;
    strokeSize?: number;
    strokeColor?: string;
    fillColor?: string;
    pulse?: boolean;
  });
}

export declare class Grid {
  constructor(options?: {
    size?: number;
    cellSize?: number;
    lineWidth?: number;
  });
}

export declare class GridLines {
  constructor(options?: {
    gridSpacing?: number;
    gridExtent?: number;
    gridColor?: string;
    gridWidth?: number;
  });
}

export declare class Axis {
  constructor(options?: {
    axisLength?: number;
    axisWidth?: number;
    arrowSize?: number;
    xColor?: string;
    yColor?: string;
  });
}

export declare class PanView {
  rootObject: any;
  stage: any;
  startPos: { x: number; y: number; z: number };
  constructor(options?: { rootObject?: any });
  startPan(startX: number, startY: number): void;
  pan(curX: number, curY: number): void;
}

export declare class ZoomView {
  rootObject: any;
  stage: any;
  minScale: number;
  constructor(options?: { rootObject?: any; minScale?: number });
  startZoom(centerX: number, centerY: number): void;
  zoom(zoom: number): void;
}

export declare class RotateView {
  rootObject: any;
  stage: any;
  startAngle: number;
  currentRotation: number;
  constructor(options?: { rootObject?: any });
  startRotate(startX: number, startY: number): void;
  rotate(curX: number, curY: number): void;
}

export declare class SceneNode {
  constructor(options?: any);
}

export declare class NavigationArrow {
  constructor(options?: {
    size?: number;
    strokeSize?: number;
    strokeColor?: string;
    fillColor?: string;
    pulse?: boolean;
  });
}

export declare class PolygonMarker {
  constructor(options?: {
    lineSize?: number;
    lineColor?: string;
    pointSize?: number;
    pointColor?: string;
    fillColor?: string;
    lineCallBack?: (...args: any[]) => void;
    pointCallBack?: (...args: any[]) => void;
  });
  addPoint(pos: any): void;
  remPoint(obj: any): void;
  movePoint(obj: any, newPos: any): void;
  splitLine(obj: any): void;
}

export declare class TraceShape {
  poses: any[];
  strokeSize: number;
  strokeColor: string;
  maxPoses: number;
  minDist: number;
  constructor(options?: {
    pose?: any;
    strokeSize?: number;
    strokeColor?: string;
    maxPoses?: number;
    minDist?: number;
  });
  addPose(pose: any): void;
  popFront(): void;
}
