/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */
export class ImageMapClient extends EventEmitter<string | symbol, any> {
    /**
     * An image map loader that renders a map_server-style map asset
     * (map.yaml + image) through ROS2D.ImageMap. The primary input is a
     * `yaml` URL; legacy direct metadata options remain supported as a
     * fallback path.
     *
     * Emits the following events:
     *   * 'change' - there was an update or change in the map
     *   * 'error' - loading or parsing failed
     *
     * @constructor
     * @param options - object with following keys:
     *   * yaml (optional) - URL of a map_server-style YAML file
     *   * rootObject (optional) - the root object to add this marker to
     *   * image (optional) - legacy direct image URL
     *   * width, height, resolution (optional) - legacy direct metadata
     *   * position, orientation (optional) - legacy direct origin pose
     */
    constructor(options: any);
    yaml: any;
    image: any;
    rootObject: any;
    currentImage: createjs.Shape;
    metadata: {
        image: any;
        width: any;
        height: any;
        resolution: any;
        origin: {
            position: any;
            orientation: any;
        };
        negate: any;
        occupied_thresh: any;
        free_thresh: any;
    };
    _currentImageAttached: boolean;
    _hasDirectMetadata(options: any): boolean;
    _emitAsync(eventName: any, payload: any): void;
    _loadFromDirectOptions(options: any): void;
    _loadFromYaml(yamlUrl: any): void;
    _loadImage(imageUrl: any, onLoad: any, onError: any): void;
    _applyImageMap(metadata: any, image: any): void;
    _replaceCurrentImage(nextImage: any): void;
    _metadataFromDirectOptions(options: any): {
        image: any;
        width: any;
        height: any;
        resolution: any;
        origin: {
            position: any;
            orientation: any;
        };
        negate: any;
        occupied_thresh: any;
        free_thresh: any;
    };
    _parseMapYaml(text: any, yamlUrl: any): {
        image: any;
        resolution: any;
        origin: {
            position: {
                x: number;
                y: number;
                z: number;
            };
            orientation: {
                x: number;
                y: number;
                z: number;
                w: number;
            };
        };
        negate: any;
        occupied_thresh: any;
        free_thresh: any;
    };
    _parseOrigin(value: any): number[];
    _parseScalar(value: any): any;
    _quaternionFromTheta(theta: any): {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    _resolveUrl(url: any, baseUrl: any): any;
}
import EventEmitter from 'eventemitter3';
import * as createjs from 'createjs-module';
