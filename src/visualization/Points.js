/**
* @fileOverview
* @author Bart van Vliet - bart@dobots.nl
*/

/**
* Add LaserScan to a view
*
* @constructor
* @param options - object with following keys:
*   * ros - ros
*   * topicName - topicName
*   * compression - compression
*   * points - points
*   * rosTopic - rosTopic
*/
ROS2D.Points = function(options) {
  THREE.Object3D.call(this);
  options = options || {};
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.max_pts = options.max_pts || 10000;
  this.pointRatio = options.pointRatio || 1;
  this.messageRatio = options.messageRatio || 1;
  this.messageCount = 0;
  this.material = options.material || {};
  this.colorsrc = options.colorsrc;
  this.colormap = options.colormap;
  
  if (('color' in options) || ('size' in options) || ('texture' in options)) {
        console.warn(
          'toplevel "color", "size" and "texture" options are deprecated.' +
          'They should beprovided within a "material" option, e.g. : '+
          ' { tfClient, material : { color: mycolor, size: mysize, map: mytexture }, ... }'
        );
  }
  this.sn = null;
};

ROS2D.Points.prototype.__proto__ = THREE.Object3D.prototype;

ROS2D.Points.prototype.setup = function(frame, point_step, fields) {
  if(this.sn===null) {
    // turn fields to a map
    fields = fields || [];
    this.fields = {};
    for(var i=0; i<fields.length; i++) {
      this.fields[fields[i].name] = fields[i];
    }
    
    this.geom = new THREE.BufferGeometry();
    this.positions = new THREE.BufferAttribute( new Float32Array( this.max_pts * 3), 3, false );
    this.geom.addAttribute( 'position', this.positions.setDynamic(true) );
    
    if(!this.colorsrc && this.fields.rgb) {
      this.colorsrc = 'rgb';
    }

    if(this.colorsrc) {
      var field = this.fields[this.colorsrc];
      if (field) {
        this.colors = new THREE.BufferAttribute( new Float32Array( this.max_pts * 3), 3, false );
        this.geom.addAttribute( 'color', this.colors.setDynamic(true) );
        var offset = field.offset;
        this.getColor = [
          function(dv,base,le){return dv.getInt8(base+offset,le);},
          function(dv,base,le){return dv.getUint8(base+offset,le);},
          function(dv,base,le){return dv.getInt16(base+offset,le);},
          function(dv,base,le){return dv.getUint16(base+offset,le);},
          function(dv,base,le){return dv.getInt32(base+offset,le);},
          function(dv,base,le){return dv.getUint32(base+offset,le);},
          function(dv,base,le){return dv.getFloat32(base+offset,le);},
          function(dv,base,le){return dv.getFloat64(base+offset,le);}
        ][field.datatype-1];
        this.colormap = this.colormap || function(x){return new THREE.Color(x);};
      } else {
        console.warn('unavailable field "' + this.colorsrc + '" for coloring.');
      }
    }
  
    if(!this.material.isMaterial) { // if it is an option, apply defaults and pass it to a PointsMaterial
      if(this.colors && this.material.vertexColors === undefined) {
        this.material.vertexColors = THREE.VertexColors;
      }
      this.material = new THREE.PointsMaterial(this.material);
    }

    this.object = new THREE.Points( this.geom, this.material );
    this.sn = new ROS2D.SceneNode({
      frameID : frame,
      tfClient : this.tfClient,
      object : this.object
    });
    
    this.rootObject.add(this.sn);
  }
  
  return (this.messageCount++ % this.messageRatio) === 0;
};
  
ROS2D.Points.prototype.update = function(n) {
  this.geom.setDrawRange(0,n);
  this.positions.needsUpdate = true;
  this.positions.updateRange.count = n * this.positions.itemSize;
  
  if (this.colors) {
    this.colors.needsUpdate = true;
    this.colors.updateRange.count = n * this.colors.itemSize;
  }
};