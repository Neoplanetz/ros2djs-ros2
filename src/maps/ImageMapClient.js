/**
 * @fileOverview
 * @author Russell Toris - rctoris@wpi.edu
 */

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
ROS2D.ImageMapClient = function(options) {
  EventEmitter.call(this);
  options = options || {};
  this.yaml = options.yaml || null;
  this.image = options.image || null;
  this.rootObject = options.rootObject || new createjs.Container();
  this.currentImage = new createjs.Shape();
  this.metadata = null;
  this._currentImageAttached = false;

  if (this.yaml) {
    this._loadFromYaml(this.yaml);
  } else if (this._hasDirectMetadata(options)) {
    this._loadFromDirectOptions(options);
  } else {
    this._emitAsync('error', new Error(
      'ROS2D.ImageMapClient: expected either options.yaml or legacy image metadata'
    ));
  }
};

ROS2D.ImageMapClient.prototype._hasDirectMetadata = function(options) {
  return !!(options &&
    options.image &&
    typeof options.resolution === 'number' &&
    typeof options.width === 'number' &&
    typeof options.height === 'number');
};

ROS2D.ImageMapClient.prototype._emitAsync = function(eventName, payload) {
  var that = this;
  setTimeout(function() {
    that.emit(eventName, payload);
  }, 0);
};

ROS2D.ImageMapClient.prototype._loadFromDirectOptions = function(options) {
  var that = this;
  var metadata = this._metadataFromDirectOptions(options);
  this.image = metadata.image;
  this.metadata = metadata;
  this._loadImage(metadata.image, function(image) {
    that._applyImageMap(metadata, image);
  }, function(error) {
    that._emitAsync('error', error);
  });
};

ROS2D.ImageMapClient.prototype._loadFromYaml = function(yamlUrl) {
  var that = this;
  if (typeof fetch !== 'function') {
    this._emitAsync('error', new Error(
      'ROS2D.ImageMapClient: fetch is required to load map YAML assets'
    ));
    return;
  }

  fetch(this._resolveUrl(yamlUrl))
    .then(function(response) {
      if (!response || response.ok === false) {
        throw new Error(
          'ROS2D.ImageMapClient: failed to load YAML from ' + yamlUrl
        );
      }
      return response.text();
    })
    .then(function(text) {
      var metadata = that._parseMapYaml(text, yamlUrl);
      that.image = metadata.image;
      that.metadata = metadata;
      that._loadImage(metadata.image, function(image) {
        that._applyImageMap(metadata, image);
      }, function(error) {
        that._emitAsync('error', error);
      });
    })
    .catch(function(error) {
      that._emitAsync('error', error);
    });
};

ROS2D.ImageMapClient.prototype._loadImage = function(imageUrl, onLoad, onError) {
  if (this._isPgmAsset(imageUrl)) {
    this._loadPgmImage(imageUrl, onLoad, onError);
    return;
  }

  if (typeof Image !== 'function') {
    onError(new Error(
      'ROS2D.ImageMapClient: Image constructor is required to load map assets'
    ));
    return;
  }

  var image = new Image();
  image.onload = function() {
    onLoad(image);
  };
  image.onerror = function() {
    onError(new Error(
      'ROS2D.ImageMapClient: failed to load image asset ' + imageUrl
    ));
  };
  image.src = imageUrl;
};

ROS2D.ImageMapClient.prototype._isPgmAsset = function(imageUrl) {
  return /\.pgm(?:[?#]|$)/i.test(imageUrl || '');
};

ROS2D.ImageMapClient.prototype._loadPgmImage = function(imageUrl, onLoad, onError) {
  var that = this;
  if (typeof fetch !== 'function') {
    onError(new Error(
      'ROS2D.ImageMapClient: fetch is required to load PGM map assets'
    ));
    return;
  }

  fetch(imageUrl)
    .then(function(response) {
      if (!response || response.ok === false) {
        throw new Error(
          'ROS2D.ImageMapClient: failed to load image asset ' + imageUrl
        );
      }
      if (!response.arrayBuffer) {
        throw new Error(
          'ROS2D.ImageMapClient: arrayBuffer() is required to load PGM map assets'
        );
      }
      return response.arrayBuffer();
    })
    .then(function(buffer) {
      var decoded = that._decodePgm(buffer, imageUrl);
      onLoad(that._createRasterCanvas(decoded.width, decoded.height, decoded.pixels));
    })
    .catch(function(error) {
      onError(error);
    });
};

ROS2D.ImageMapClient.prototype._decodePgm = function(buffer, imageUrl) {
  var bytes = new Uint8Array(buffer);
  var offset = 0;

  function isWhitespace(value) {
    return value === 0x20 || value === 0x09 || value === 0x0a || value === 0x0d;
  }

  function skipWhitespaceAndComments() {
    while (offset < bytes.length) {
      if (isWhitespace(bytes[offset])) {
        offset++;
        continue;
      }
      if (bytes[offset] === 0x23) {
        while (offset < bytes.length && bytes[offset] !== 0x0a) {
          offset++;
        }
        continue;
      }
      break;
    }
  }

  function readToken() {
    skipWhitespaceAndComments();
    if (offset >= bytes.length) {
      throw new Error(
        'ROS2D.ImageMapClient: unexpected end of PGM data in ' + imageUrl
      );
    }
    var start = offset;
    while (offset < bytes.length &&
           !isWhitespace(bytes[offset]) &&
           bytes[offset] !== 0x23) {
      offset++;
    }
    return String.fromCharCode.apply(null, bytes.slice(start, offset));
  }

  function parseHeaderInteger(label) {
    var token = readToken();
    var parsed = parseInt(token, 10);
    if (isNaN(parsed)) {
      throw new Error(
        'ROS2D.ImageMapClient: invalid PGM ' + label + ' in ' + imageUrl
      );
    }
    return parsed;
  }

  var magic = readToken();
  if (magic !== 'P5' && magic !== 'P2') {
    throw new Error(
      'ROS2D.ImageMapClient: unsupported PGM format "' + magic + '" in ' + imageUrl
    );
  }

  var width = parseHeaderInteger('width');
  var height = parseHeaderInteger('height');
  var maxValue = parseHeaderInteger('max value');
  var pixelCount = width * height;
  var grayscale = new Uint8ClampedArray(pixelCount);
  var i;

  if (width <= 0 || height <= 0) {
    throw new Error(
      'ROS2D.ImageMapClient: PGM dimensions must be positive in ' + imageUrl
    );
  }
  if (maxValue <= 0 || maxValue > 65535) {
    throw new Error(
      'ROS2D.ImageMapClient: unsupported PGM max value in ' + imageUrl
    );
  }

  skipWhitespaceAndComments();

  if (magic === 'P5') {
    var bytesPerSample = maxValue < 256 ? 1 : 2;
    if ((bytes.length - offset) < (pixelCount * bytesPerSample)) {
      throw new Error(
        'ROS2D.ImageMapClient: PGM pixel data is truncated in ' + imageUrl
      );
    }
    for (i = 0; i < pixelCount; i++) {
      var sample = bytes[offset];
      if (bytesPerSample === 2) {
        sample = (sample << 8) | bytes[offset + 1];
      }
      offset += bytesPerSample;
      grayscale[i] = Math.round((sample / maxValue) * 255);
    }
  } else {
    for (i = 0; i < pixelCount; i++) {
      grayscale[i] = Math.round((parseHeaderInteger('pixel value') / maxValue) * 255);
    }
  }

  return {
    width: width,
    height: height,
    pixels: grayscale
  };
};

ROS2D.ImageMapClient.prototype._createRasterCanvas = function(width, height, pixels) {
  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error(
      'ROS2D.ImageMapClient: document.createElement is required to render PGM map assets'
    );
  }

  var canvas = document.createElement('canvas');
  var context = canvas.getContext && canvas.getContext('2d');
  if (!context || !context.createImageData || !context.putImageData) {
    throw new Error(
      'ROS2D.ImageMapClient: 2D canvas context is required to render PGM map assets'
    );
  }

  canvas.width = width;
  canvas.height = height;

  var imageData = context.createImageData(width, height);
  for (var i = 0; i < pixels.length; i++) {
    var channel = pixels[i];
    var pixelIndex = i * 4;
    imageData.data[pixelIndex] = channel;
    imageData.data[pixelIndex + 1] = channel;
    imageData.data[pixelIndex + 2] = channel;
    imageData.data[pixelIndex + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return canvas;
};

ROS2D.ImageMapClient.prototype._applyImageMap = function(metadata, image) {
  var width = (typeof metadata.width === 'number') ? metadata.width : (image.naturalWidth || image.width);
  var height = (typeof metadata.height === 'number') ? metadata.height : (image.naturalHeight || image.height);
  var message = {
    width: width,
    height: height,
    resolution: metadata.resolution,
    origin: metadata.origin
  };
  var nextImage = new ROS2D.ImageMap({
    message: message,
    image: image
  });
  this._replaceCurrentImage(nextImage);
  this._emitAsync('change');
};

ROS2D.ImageMapClient.prototype._replaceCurrentImage = function(nextImage) {
  var previousImage = this.currentImage;
  if (this._currentImageAttached &&
      this.rootObject &&
      typeof this.rootObject.removeChild === 'function') {
    this.rootObject.removeChild(previousImage);
  }
  this.currentImage = nextImage;
  if (this.rootObject && typeof this.rootObject.addChild === 'function') {
    this.rootObject.addChild(nextImage);
    this._currentImageAttached = true;
  }
};

ROS2D.ImageMapClient.prototype._metadataFromDirectOptions = function(options) {
  return {
    image: options.image,
    width: options.width,
    height: options.height,
    resolution: options.resolution,
    origin: {
      position: options.position || { x: 0, y: 0, z: 0 },
      orientation: options.orientation || { x: 0, y: 0, z: 0, w: 1 }
    },
    negate: (typeof options.negate !== 'undefined') ? options.negate : null,
    occupied_thresh: (typeof options.occupied_thresh !== 'undefined')
      ? options.occupied_thresh
      : null,
    free_thresh: (typeof options.free_thresh !== 'undefined')
      ? options.free_thresh
      : null
  };
};

ROS2D.ImageMapClient.prototype._parseMapYaml = function(text, yamlUrl) {
  var fields = {};
  var lines = (text || '').split(/\r?\n/);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].replace(/#.*$/, '').trim();
    if (!line) {
      continue;
    }
    var separator = line.indexOf(':');
    if (separator < 0) {
      continue;
    }
    var key = line.substring(0, separator).trim();
    var rawValue = line.substring(separator + 1).trim();
    if (key === 'origin') {
      fields.origin = this._parseOrigin(rawValue);
    } else {
      fields[key] = this._parseScalar(rawValue);
    }
  }

  if (!fields.image) {
    throw new Error('ROS2D.ImageMapClient: map YAML is missing required "image"');
  }
  if (typeof fields.resolution !== 'number' || isNaN(fields.resolution)) {
    throw new Error('ROS2D.ImageMapClient: map YAML is missing numeric "resolution"');
  }
  if (!fields.origin) {
    throw new Error('ROS2D.ImageMapClient: map YAML is missing required "origin"');
  }

  return {
    image: this._resolveUrl(fields.image, yamlUrl),
    resolution: fields.resolution,
    origin: {
      position: {
        x: fields.origin[0],
        y: fields.origin[1],
        z: 0
      },
      orientation: this._quaternionFromTheta(fields.origin[2])
    },
    negate: (typeof fields.negate !== 'undefined') ? fields.negate : null,
    occupied_thresh: (typeof fields.occupied_thresh !== 'undefined')
      ? fields.occupied_thresh
      : null,
    free_thresh: (typeof fields.free_thresh !== 'undefined')
      ? fields.free_thresh
      : null
  };
};

ROS2D.ImageMapClient.prototype._parseOrigin = function(value) {
  var match = /^\[\s*([^\]]+)\s*\]$/.exec(value);
  if (!match) {
    throw new Error('ROS2D.ImageMapClient: expected origin in [x, y, theta] form');
  }
  var parts = match[1].split(',');
  if (parts.length !== 3) {
    throw new Error('ROS2D.ImageMapClient: expected origin in [x, y, theta] form');
  }
  var origin = [];
  for (var i = 0; i < parts.length; i++) {
    var parsed = parseFloat(parts[i].trim());
    if (isNaN(parsed)) {
      throw new Error('ROS2D.ImageMapClient: origin contains a non-numeric value');
    }
    origin.push(parsed);
  }
  return origin;
};

ROS2D.ImageMapClient.prototype._parseScalar = function(value) {
  if (!value) {
    return '';
  }
  var quoted = /^(['"])(.*)\1$/.exec(value);
  if (quoted) {
    return quoted[2];
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }
  return value;
};

ROS2D.ImageMapClient.prototype._quaternionFromTheta = function(theta) {
  var halfTheta = theta / 2;
  return {
    x: 0,
    y: 0,
    z: Math.sin(halfTheta),
    w: Math.cos(halfTheta)
  };
};

ROS2D.ImageMapClient.prototype._resolveUrl = function(url, baseUrl) {
  var fallbackBase = null;
  if (typeof document !== 'undefined' && document.baseURI) {
    fallbackBase = document.baseURI;
  } else if (typeof window !== 'undefined' && window.location && window.location.href) {
    fallbackBase = window.location.href;
  }
  return new URL(url, baseUrl ? this._resolveUrl(baseUrl) : fallbackBase).toString();
};

Object.setPrototypeOf(ROS2D.ImageMapClient.prototype, EventEmitter.prototype);
